"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, IMPACTS, type EntryInput } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function parseTags(raw: FormData | string[] | string | null): string[] {
  let value: string[];
  if (typeof raw === "string") {
    value = raw.split(",");
  } else if (Array.isArray(raw)) {
    value = raw;
  } else {
    value = [];
  }
  return [
    ...new Set(
      value
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

/** Validate + normalize raw form values into an EntryInput. */
function readInput(form: FormData): EntryInput | { error: string } {
  const title = (form.get("title") as string)?.trim();
  if (!title) return { error: "A title is required." };
  if (title.length > 200) return { error: "Title is too long (max 200)." };

  const category = (form.get("category") as string) || "achievement";
  if (!CATEGORIES.includes(category as never))
    return { error: "Invalid category." };

  const impact = (form.get("impact") as string) || "moderate";
  if (!IMPACTS.includes(impact as never))
    return { error: "Invalid impact level." };

  const occurred_on =
    (form.get("occurred_on") as string) ||
    new Date().toISOString().slice(0, 10);

  return {
    title,
    description: ((form.get("description") as string) || "").trim() || null,
    metrics: ((form.get("metrics") as string) || "").trim() || null,
    category: category as EntryInput["category"],
    impact: impact as EntryInput["impact"],
    tags: parseTags(form.get("tags") as string),
    occurred_on,
  };
}

export async function createEntry(form: FormData): Promise<ActionResult> {
  const parsed = readInput(form);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase
    .from("entries")
    .insert({ ...parsed, user_id: user.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath("/synthesis");
  return { ok: true, id: data.id };
}

export async function updateEntry(
  id: string,
  form: FormData,
): Promise<ActionResult> {
  const parsed = readInput(form);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("entries").update(parsed).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath("/synthesis");
  revalidatePath(`/timeline/${id}`);
  return { ok: true, id };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath("/synthesis");
  return { ok: true };
}
