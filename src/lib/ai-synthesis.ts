import "server-only";
import { CATEGORY_LABELS, IMPACT_LABELS, type Entry } from "@/lib/types";

// Provider models, override via env. Defaults are the latest fast tiers.
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export type AiFormat = "promotion" | "resume" | "review";
export type AiProvider = "gemini" | "claude";

export interface AiResult {
  format: AiFormat;
  /** For "promotion" and "resume": the generated lines. */
  items?: string[];
  /** For "review": a markdown document. */
  markdown?: string;
}

/**
 * Which AI provider is active. Gemini (Google AI Studio) takes priority when
 * its key is set, then Claude (Anthropic), else none (template fallback).
 */
export function activeProvider(): AiProvider | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}

/** Whether AI-powered synthesis is available in this deployment. */
export function isAiConfigured(): boolean {
  return activeProvider() !== null;
}

// Appended to every prompt: keep the output free of em dashes (a user preference).
const STYLE_RULE =
  'Write in plain prose. Never use em dashes or en dashes; use commas, periods, parentheses, or the word "to" for ranges instead.';

const SYSTEM_PROMPTS: Record<AiFormat, string> = {
  promotion: `You help professionals make the case for a promotion.
Given a list of their logged career wins, write impact-first promotion bullets a manager could drop into a promotion packet.
- Lead with the outcome and scope, then the action. Weave in any metrics verbatim.
- Group related wins into a single strong bullet when it makes the case stronger; don't pad.
- Use confident, specific, professional language. No clichés, no invented facts; only use what the wins state.
- Each bullet is one or two sentences. Return 4 to 8 of the strongest bullets.
- ${STYLE_RULE}`,
  resume: `You help professionals turn raw accomplishments into resume bullet points.
Given a list of their logged career wins, write tight, action-verb-led resume lines.
- Start each line with a strong past-tense action verb; vary the openings.
- Quantify with any metrics provided; never invent numbers or facts.
- Keep each line to a single concise line of impact. Return 4 to 8 lines, strongest first.
- ${STYLE_RULE}`,
  review: `You help professionals write a self-review or performance summary.
Given a list of their logged career wins, write a concise self-review in Markdown.
- Open with a one or two sentence summary of the period's impact.
- Then group accomplishments under a few "## " headings (by theme or category) with brief bullet points.
- Be specific and grounded only in the wins provided; weave in metrics. No invented facts, no filler.
- ${STYLE_RULE}`,
};

function serializeEntries(entries: Entry[]): string {
  return entries
    .map((e, i) => {
      const lines = [
        `${i + 1}. ${e.title}`,
        `   Date: ${e.occurred_on}`,
        `   Category: ${CATEGORY_LABELS[e.category] ?? e.category}`,
        `   Impact: ${IMPACT_LABELS[e.impact] ?? e.impact}`,
      ];
      if (e.metrics) lines.push(`   Metrics: ${e.metrics}`);
      if (e.description) lines.push(`   Details: ${e.description}`);
      if (e.tags.length) lines.push(`   Tags: ${e.tags.join(", ")}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildUserContent(entries: Entry[]): string {
  return `Here are ${entries.length} logged career wins to work from:\n\n${serializeEntries(
    entries,
  )}`;
}

function parseResult(format: AiFormat, raw: string): AiResult {
  if (!raw) throw new Error("The model returned an empty response.");
  const parsed = JSON.parse(raw) as { items?: string[]; markdown?: string };
  return { format, items: parsed.items, markdown: parsed.markdown };
}

/**
 * Generate polished synthesis text from a user's wins.
 * Routes to whichever provider is configured. Throws on config / API errors,
 * which callers handle.
 */
export async function generateAiSynthesis(
  entries: Entry[],
  format: AiFormat,
): Promise<AiResult> {
  const provider = activeProvider();
  if (provider === "gemini") return generateWithGemini(entries, format);
  if (provider === "claude") return generateWithClaude(entries, format);
  throw new Error("No AI provider is configured on this server.");
}

// --- Claude (Anthropic) -----------------------------------------------------

function claudeSchema(format: AiFormat) {
  if (format === "review") {
    return {
      type: "object",
      properties: { markdown: { type: "string" } },
      required: ["markdown"],
      additionalProperties: false,
    } as const;
  }
  return {
    type: "object",
    properties: { items: { type: "array", items: { type: "string" } } },
    required: ["items"],
    additionalProperties: false,
  } as const;
}

async function generateWithClaude(
  entries: Entry[],
  format: AiFormat,
): Promise<AiResult> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPTS[format],
    output_config: {
      format: { type: "json_schema", schema: claudeSchema(format) },
    },
    messages: [{ role: "user", content: buildUserContent(entries) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to generate this content.");
  }
  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseResult(format, raw);
}

// --- Gemini (Google AI Studio) ----------------------------------------------

async function generateWithGemini(
  entries: Entry[],
  format: AiFormat,
): Promise<AiResult> {
  const { GoogleGenAI, Type } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const responseSchema =
    format === "review"
      ? {
          type: Type.OBJECT,
          properties: { markdown: { type: Type.STRING } },
          required: ["markdown"],
        }
      : {
          type: Type.OBJECT,
          properties: {
            items: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["items"],
        };

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildUserContent(entries),
    config: {
      systemInstruction: SYSTEM_PROMPTS[format],
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  return parseResult(format, response.text ?? "");
}
