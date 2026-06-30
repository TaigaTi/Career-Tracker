"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateEntryInput } from "@/lib/entry-input";
import { splitRambleIntoEntries, GeminiError } from "@/lib/gemini";
import { type EntryInput } from "@/lib/types";

const MAX_RAMBLE_CHARS = 8000;

export interface ParseResult {
  ok: boolean;
  error?: string;
  drafts?: EntryInput[];
}

export interface SaveResult {
  ok: boolean;
  error?: string;
  count?: number;
}

/**
 * Turn a free-form ramble into structured EntryInput drafts via Gemini.
 * Does NOT persist anything; the user reviews/edits the drafts first.
 */
export async function parseRamble(text: string): Promise<ParseResult> {
  const ramble = (text ?? "").trim();
  if (!ramble) return { ok: false, error: "Say or type something first." };
  if (ramble.length > MAX_RAMBLE_CHARS) {
    return {
      ok: false,
      error: "That's a lot at once. Break it into a few shorter rambles.",
    };
  }

  // Server Actions are reachable via direct POST, so re-check auth here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const today = new Date().toISOString().slice(0, 10);

  try {
    const drafts = await splitRambleIntoEntries(ramble, today);
    return { ok: true, drafts };
  } catch (err) {
    if (err instanceof GeminiError) return { ok: false, error: err.message };
    console.error("parseRamble failed:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Validate and bulk-insert reviewed drafts as entries for the current user.
 */
export async function createEntries(
  drafts: EntryInput[],
): Promise<SaveResult> {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return { ok: false, error: "Nothing to save." };
  }

  const rows: EntryInput[] = [];
  for (const draft of drafts) {
    const parsed = validateEntryInput(draft);
    if ("error" in parsed) return { ok: false, error: parsed.error };
    rows.push(parsed);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("entries")
    .insert(rows.map((row) => ({ ...row, user_id: user.id })));

  if (error) return { ok: false, error: error.message };

  revalidatePath("/timeline");
  revalidatePath("/dashboard");
  revalidatePath("/synthesis");
  return { ok: true, count: rows.length };
}
