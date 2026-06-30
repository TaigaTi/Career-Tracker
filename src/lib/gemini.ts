import "server-only";
import {
  CATEGORIES,
  IMPACTS,
  type Category,
  type Impact,
  type EntryInput,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Gemini client (REST, no SDK dependency)
//
// Turns a free-form spoken/typed "ramble" covering several wins into a list
// of structured EntryInput drafts. Runs server-side only so GEMINI_API_KEY
// never reaches the browser. Output is forced to JSON via responseSchema and
// then defensively normalized so a stray model response can never violate the
// entries table's CHECK constraints.
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Raised for any failure talking to Gemini; carries a user-safe message. */
export class GeminiError extends Error {}

/** Shape we ask Gemini to return per win, before normalization. */
interface RawDraft {
  title?: unknown;
  description?: unknown;
  metrics?: unknown;
  category?: unknown;
  impact?: unknown;
  tags?: unknown;
  occurred_on?: unknown;
}

const SYSTEM_INSTRUCTION = `You convert a person's spoken or typed brain-dump about their recent work into a list of structured career accomplishment entries for a logging app.

Rules:
- Split the ramble into DISTINCT achievements. One entry per achievement. If it only describes one thing, return one entry.
- title: a concise, action-oriented summary of the win, max 200 characters. No trailing period.
- description: the story or context behind it (situation, what they did, why it mattered). Use null if there is nothing beyond the title.
- metrics: a quantified impact ONLY if the person actually stated numbers (e.g. "cut deploy time 40%", "saved 3 hours a week"). Use null otherwise. Never invent figures.
- category: choose the single best fit from the allowed list.
- impact: infer conservatively from the allowed list. Default to "moderate" unless the win is clearly minor or clearly major/milestone.
- tags: 0 to 12 short lowercase theme keywords, no "#" prefix, no spaces (use hyphens).
- occurred_on: an ISO date (YYYY-MM-DD). Use the provided "today" date unless the ramble clearly indicates a different day.
- Do NOT invent facts, names, numbers, or outcomes that were not described. Stay faithful to what was said. Lightly clean up grammar and filler words.`;

/** The JSON schema Gemini must conform to (OpenAPI subset, uppercase types). */
const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      description: { type: "STRING", nullable: true },
      metrics: { type: "STRING", nullable: true },
      category: { type: "STRING", enum: [...CATEGORIES] },
      impact: { type: "STRING", enum: [...IMPACTS] },
      tags: { type: "ARRAY", items: { type: "STRING" } },
      occurred_on: { type: "STRING" },
    },
    required: ["title", "category", "impact", "tags", "occurred_on"],
    propertyOrdering: [
      "title",
      "description",
      "metrics",
      "category",
      "impact",
      "tags",
      "occurred_on",
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Normalization helpers (mirror the rules in entries-actions.ts so drafts
// always satisfy the DB constraints regardless of what the model returns).
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [];
  return [
    ...new Set(
      list
        .map((t) => (typeof t === "string" ? t : ""))
        .map((t) => t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-"))
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

function normalizeDraft(raw: RawDraft, today: string): EntryInput | null {
  const title = asString(raw.title).slice(0, 200);
  if (!title) return null; // a win with no title is not usable

  const category = CATEGORIES.includes(raw.category as Category)
    ? (raw.category as Category)
    : "achievement";
  const impact = IMPACTS.includes(raw.impact as Impact)
    ? (raw.impact as Impact)
    : "moderate";

  const description = asString(raw.description) || null;
  const metrics = asString(raw.metrics) || null;

  const occurredRaw = asString(raw.occurred_on);
  const occurred_on = ISO_DATE.test(occurredRaw) ? occurredRaw : today;

  return {
    title,
    description,
    metrics,
    category,
    impact,
    tags: normalizeTags(raw.tags),
    occurred_on,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a ramble to Gemini and get back normalized EntryInput drafts.
 * Throws GeminiError (with a user-safe message) on any failure.
 */
export async function splitRambleIntoEntries(
  ramble: string,
  today: string,
): Promise<EntryInput[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError(
      "Ramble Mode isn't configured yet. Add GEMINI_API_KEY to your environment.",
    );
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `${API_BASE}/${model}:generateContent`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `today: ${today}\n\nramble:\n${ramble}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    });
  } catch {
    throw new GeminiError(
      "Couldn't reach Gemini. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    // Surface the status but keep provider internals out of the UI.
    const detail = await response.text().catch(() => "");
    console.error(`Gemini ${response.status}: ${detail}`);
    if (response.status === 400 || response.status === 403) {
      throw new GeminiError(
        "Gemini rejected the request. Double-check your GEMINI_API_KEY.",
      );
    }
    if (response.status === 429) {
      throw new GeminiError("Gemini is rate-limited right now. Try again shortly.");
    }
    throw new GeminiError("Gemini had a problem processing that. Try again.");
  }

  const data = (await response.json().catch(() => null)) as
    | { candidates?: { content?: { parts?: { text?: string }[] } }[]; promptFeedback?: { blockReason?: string } }
    | null;

  if (data?.promptFeedback?.blockReason) {
    throw new GeminiError(
      "That ramble was blocked by a safety filter. Try rephrasing it.",
    );
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("Gemini returned nothing usable. Try again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini returned an unexpected format. Try again.");
  }

  if (!Array.isArray(parsed)) {
    throw new GeminiError("Gemini returned an unexpected format. Try again.");
  }

  const drafts = parsed
    .map((raw) => normalizeDraft(raw as RawDraft, today))
    .filter((d): d is EntryInput => d !== null);

  if (drafts.length === 0) {
    throw new GeminiError(
      "Couldn't find a clear win in that. Try adding a bit more detail.",
    );
  }

  return drafts;
}
