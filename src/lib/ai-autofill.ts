import "server-only";
import {
  CATEGORIES,
  IMPACTS,
  type Category,
  type Impact,
} from "@/lib/types";
import { activeProvider } from "@/lib/ai-synthesis";

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export interface AutofillSuggestion {
  /** Quantified-impact phrase, or "" when the story has no numbers/scale. */
  metrics: string;
  category: Category;
  impact: Impact;
  tags: string[];
}

const SYSTEM = `You classify a single logged career accomplishment into structured fields.
You are given the person's answer to "What did you accomplish?" (a short title) and "Tell the story" (optional detail).
Infer, using ONLY what they wrote (never invent facts or numbers):
- category: exactly one of: ${CATEGORIES.join(", ")}.
- impact: exactly one of: ${IMPACTS.join(", ")} (ordered low to high: minor, moderate, major, milestone). Judge by scope and significance.
- tags: 2 to 5 short lowercase keyword tags (single words or short hyphenated phrases, no "#").
- metrics: a short quantified-impact phrase ONLY if the text states or clearly implies a number, percentage, or measurable scale (for example "cut deploy time 40%"). If there is nothing quantifiable, return an empty string. Do not fabricate numbers.
Write any text in plain prose. Never use em dashes or en dashes.`;

function buildPrompt(title: string, description: string): string {
  const story = description.trim() ? description.trim() : "(no story provided)";
  return `What did you accomplish?\n${title.trim()}\n\nTell the story:\n${story}`;
}

/** Normalize and validate a raw model suggestion into safe values. */
function normalize(raw: {
  metrics?: unknown;
  category?: unknown;
  impact?: unknown;
  tags?: unknown;
}): AutofillSuggestion {
  const category = CATEGORIES.includes(raw.category as Category)
    ? (raw.category as Category)
    : "achievement";
  const impact = IMPACTS.includes(raw.impact as Impact)
    ? (raw.impact as Impact)
    : "moderate";
  const metrics =
    typeof raw.metrics === "string" ? raw.metrics.trim() : "";
  const tags = Array.isArray(raw.tags)
    ? [
        ...new Set(
          raw.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
            .filter(Boolean),
        ),
      ].slice(0, 5)
    : [];
  return { metrics, category, impact, tags };
}

/** Suggest entry fields from the accomplishment + story. Throws on API errors. */
export async function suggestEntryDetails(
  title: string,
  description: string,
): Promise<AutofillSuggestion> {
  const provider = activeProvider();
  const prompt = buildPrompt(title, description);

  if (provider === "gemini") {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metrics: { type: Type.STRING },
            category: { type: Type.STRING, enum: [...CATEGORIES] },
            impact: { type: Type.STRING, enum: [...IMPACTS] },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["metrics", "category", "impact", "tags"],
        },
      },
    });
    return normalize(JSON.parse(response.text ?? "{}"));
  }

  if (provider === "claude") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              metrics: { type: "string" },
              category: { type: "string", enum: [...CATEGORIES] },
              impact: { type: "string", enum: [...IMPACTS] },
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["metrics", "category", "impact", "tags"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      throw new Error("The model declined to analyze this entry.");
    }
    const block = response.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "{}";
    return normalize(JSON.parse(text));
  }

  throw new Error("No AI provider is configured on this server.");
}
