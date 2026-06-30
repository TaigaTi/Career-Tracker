"use server";

import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai-synthesis";
import { suggestEntryDetails, type AutofillSuggestion } from "@/lib/ai-autofill";

export interface AutofillResult {
  ok: boolean;
  error?: string;
  suggestion?: AutofillSuggestion;
}

/**
 * Server action: suggest category, impact, tags, and a metrics phrase from the
 * accomplishment title + story. Gated on auth (so the AI key isn't open to the
 * world) and on a provider being configured.
 */
export async function autofillEntry(
  title: string,
  description: string,
): Promise<AutofillResult> {
  if (!isAiConfigured()) {
    return { ok: false, error: "AI autofill isn't configured on this server." };
  }
  if (!title.trim()) {
    return { ok: false, error: "Add what you accomplished first." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  try {
    const suggestion = await suggestEntryDetails(title, description);
    return { ok: true, suggestion };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Something went wrong generating suggestions.";
    return { ok: false, error: message };
  }
}
