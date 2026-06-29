"use server";

import { getEntries, type EntryFilters } from "@/lib/entries";
import {
  generateAiSynthesis,
  isAiConfigured,
  type AiFormat,
  type AiResult,
} from "@/lib/ai-synthesis";

export interface AiSynthesisResult {
  ok: boolean;
  error?: string;
  result?: AiResult;
}

/**
 * Server action: generate Claude-polished synthesis for the current user's
 * wins (filtered the same way the page is). Re-fetches entries server-side so
 * RLS enforces ownership — the client only sends the format and filters.
 */
export async function enhanceWithAi(
  format: AiFormat,
  filters: EntryFilters,
): Promise<AiSynthesisResult> {
  if (!isAiConfigured()) {
    return { ok: false, error: "AI synthesis isn't configured on this server." };
  }

  try {
    const entries = await getEntries(filters);
    if (entries.length === 0) {
      return { ok: false, error: "No wins in this range to synthesize yet." };
    }
    const result = await generateAiSynthesis(entries, format);
    return { ok: true, result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Something went wrong generating with AI.";
    return { ok: false, error: message };
  }
}
