// Shared validation + normalization for entry input.
//
// Kept separate from the "use server" action files because a server-action
// module may only export async functions; these are plain sync helpers reused
// by the FormData path (entries-actions.ts) and the ramble draft path
// (ramble-actions.ts).

import {
  CATEGORIES,
  IMPACTS,
  type Category,
  type Impact,
  type EntryInput,
} from "@/lib/types";

/** Normalize a tag source (comma string, array, or null) into clean tags. */
export function parseTags(raw: string[] | string | null | undefined): string[] {
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

const today = () => new Date().toISOString().slice(0, 10);

/** Raw, untrusted entry fields (from a form or an LLM draft). */
export interface RawEntryInput {
  title?: string | null;
  description?: string | null;
  metrics?: string | null;
  category?: string | null;
  impact?: string | null;
  tags?: string[] | string | null;
  occurred_on?: string | null;
}

/** Validate + normalize raw values into an EntryInput, or return an error. */
export function validateEntryInput(
  raw: RawEntryInput,
): EntryInput | { error: string } {
  const title = (raw.title ?? "").trim();
  if (!title) return { error: "A title is required." };
  if (title.length > 200) return { error: "Title is too long (max 200)." };

  const category = raw.category || "achievement";
  if (!CATEGORIES.includes(category as never))
    return { error: "Invalid category." };

  const impact = raw.impact || "moderate";
  if (!IMPACTS.includes(impact as never))
    return { error: "Invalid impact level." };

  const occurred_on = raw.occurred_on || today();

  return {
    title,
    description: (raw.description ?? "").trim() || null,
    metrics: (raw.metrics ?? "").trim() || null,
    category: category as Category,
    impact: impact as Impact,
    tags: parseTags(raw.tags),
    occurred_on,
  };
}
