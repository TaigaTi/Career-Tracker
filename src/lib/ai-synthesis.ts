import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_LABELS, IMPACT_LABELS, type Entry } from "@/lib/types";

// Default to the latest, most capable Claude model. Override with ANTHROPIC_MODEL.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

export type AiFormat = "promotion" | "resume" | "review";

export interface AiResult {
  format: AiFormat;
  /** For "promotion" and "resume": the generated lines. */
  items?: string[];
  /** For "review": a markdown document. */
  markdown?: string;
}

/** Whether Claude-powered synthesis is available in this deployment. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPTS: Record<AiFormat, string> = {
  promotion: `You help professionals make the case for a promotion.
Given a list of their logged career wins, write impact-first promotion bullets a manager could drop into a promotion packet.
- Lead with the outcome and scope, then the action. Weave in any metrics verbatim.
- Group related wins into a single strong bullet when it makes the case stronger; don't pad.
- Use confident, specific, professional language. No clichés, no invented facts — only use what the wins state.
- Each bullet is one or two sentences. Return 4–8 of the strongest bullets.`,
  resume: `You help professionals turn raw accomplishments into resume bullet points.
Given a list of their logged career wins, write tight, action-verb-led resume lines.
- Start each line with a strong past-tense action verb; vary the openings.
- Quantify with any metrics provided; never invent numbers or facts.
- Keep each line to a single concise line of impact. Return 4–8 lines, strongest first.`,
  review: `You help professionals write a self-review / performance summary.
Given a list of their logged career wins, write a concise self-review in Markdown.
- Open with a one or two sentence summary of the period's impact.
- Then group accomplishments under a few "## " headings (by theme or category) with brief bullet points.
- Be specific and grounded only in the wins provided; weave in metrics. No invented facts, no filler.`,
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

function schemaFor(format: AiFormat) {
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

/**
 * Generate polished synthesis text from a user's wins using Claude.
 * Uses structured outputs so the response is always valid JSON in our shape.
 * Throws on configuration, API, or refusal errors — callers handle them.
 */
export async function generateAiSynthesis(
  entries: Entry[],
  format: AiFormat,
): Promise<AiResult> {
  // Reads ANTHROPIC_API_KEY from the environment.
  const client = new Anthropic();

  const userContent = `Here are ${entries.length} logged career wins to work from:\n\n${serializeEntries(
    entries,
  )}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPTS[format],
    output_config: { format: { type: "json_schema", schema: schemaFor(format) } },
    messages: [{ role: "user", content: userContent }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to generate this content.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  if (!raw) throw new Error("The model returned an empty response.");

  const parsed = JSON.parse(raw) as { items?: string[]; markdown?: string };
  return { format, items: parsed.items, markdown: parsed.markdown };
}
