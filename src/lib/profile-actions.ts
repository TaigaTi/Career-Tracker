"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProfileInput } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const LIMITS = {
  full_name: 120,
  headline: 140,
  role: 120,
  company: 120,
  location: 120,
  bio: 2000,
} as const;

const FIELD_LABELS: Record<keyof typeof LIMITS, string> = {
  full_name: "Name",
  headline: "Headline",
  role: "Role",
  company: "Company",
  location: "Location",
  bio: "About",
};

/** Trim a form field to a string-or-null, enforcing its max length. */
function readField(
  form: FormData,
  key: keyof typeof LIMITS,
): string | null | { error: string } {
  const value = ((form.get(key) as string) ?? "").trim();
  if (!value) return null;
  if (value.length > LIMITS[key]) {
    return { error: `${FIELD_LABELS[key]} is too long (max ${LIMITS[key]}).` };
  }
  return value;
}

function readInput(form: FormData): ProfileInput | { error: string } {
  const keys = Object.keys(LIMITS) as (keyof typeof LIMITS)[];
  const out = {} as Record<keyof typeof LIMITS, string | null>;
  for (const key of keys) {
    const result = readField(form, key);
    if (result && typeof result === "object") return result;
    out[key] = result;
  }
  return out as ProfileInput;
}

export async function updateProfile(form: FormData): Promise<ActionResult> {
  const parsed = readInput(form);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Upsert so a missing profile row (rare, but possible) is repaired in place.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...parsed }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
