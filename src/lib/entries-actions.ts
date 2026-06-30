"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateEntryInput } from "@/lib/entry-input";
import { type EntryInput } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** Validate + normalize raw form values into an EntryInput. */
function readInput(form: FormData): EntryInput | { error: string } {
  return validateEntryInput({
    title: form.get("title") as string | null,
    description: form.get("description") as string | null,
    metrics: form.get("metrics") as string | null,
    category: form.get("category") as string | null,
    impact: form.get("impact") as string | null,
    tags: form.get("tags") as string | null,
    occurred_on: form.get("occurred_on") as string | null,
  });
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
