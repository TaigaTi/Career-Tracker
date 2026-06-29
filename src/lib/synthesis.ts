// Pure synthesis logic for JobWize.
//
// Takes the user's logged Entry[] and turns it into copy-ready material:
// promotion bullets, resume lines, and a self-review summary.
//
// This module is intentionally PURE and DETERMINISTIC — no DB, no React,
// no LLM calls. That keeps it trivially unit-testable today and means the
// template-based MVP can later be swapped for a Claude-powered version
// behind the same function signatures.

import {
  type Entry,
  type Category,
  type Impact,
  CATEGORIES,
  CATEGORY_LABELS,
  IMPACT_LABELS,
  IMPACT_WEIGHT,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** A dimension entries can be grouped by. */
export type GroupDimension = "category" | "tag" | "month" | "impact";

/** One bucket of grouped entries. `key` is the raw value, `label` is human-facing. */
export interface Group {
  key: string;
  label: string;
  entries: Entry[];
}

/** A section of a generated markdown document. */
export interface MarkdownSection {
  heading: string;
  /** Plain lines or pre-formatted bullet strings (no leading "- " required). */
  lines: string[];
}

// ---------------------------------------------------------------------------
// Sorting + grouping
// ---------------------------------------------------------------------------

/** Newest-first by occurred_on, then created_at. Matches the DB ordering. */
function byDateDesc(a: Entry, b: Entry): number {
  if (a.occurred_on !== b.occurred_on) {
    return a.occurred_on < b.occurred_on ? 1 : -1;
  }
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? 1 : -1;
  }
  return 0;
}

/** Highest impact first, then newest. Used to surface the strongest wins. */
function byImpactThenDate(a: Entry, b: Entry): number {
  const w = IMPACT_WEIGHT[b.impact] - IMPACT_WEIGHT[a.impact];
  if (w !== 0) return w;
  return byDateDesc(a, b);
}

/** "2026-03-14" -> "2026-03" (the month bucket key). */
function monthKey(occurredOn: string): string {
  return occurredOn.slice(0, 7);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "2026-03" -> "March 2026". */
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const idx = Number(m) - 1;
  const name = MONTH_NAMES[idx] ?? m;
  return `${name} ${y}`;
}

/**
 * Group entries along a dimension. Returns buckets in a stable, meaningful
 * order: categories/impacts follow their canonical order, months are
 * newest-first, tags are ordered by frequency (then alphabetically).
 * Entries within each bucket are newest-first.
 */
export function groupBy(entries: Entry[], dimension: GroupDimension): Group[] {
  const buckets = new Map<string, Entry[]>();

  const push = (key: string, entry: Entry) => {
    const existing = buckets.get(key);
    if (existing) existing.push(entry);
    else buckets.set(key, [entry]);
  };

  for (const entry of entries) {
    switch (dimension) {
      case "category":
        push(entry.category, entry);
        break;
      case "impact":
        push(entry.impact, entry);
        break;
      case "month":
        push(monthKey(entry.occurred_on), entry);
        break;
      case "tag":
        if (entry.tags.length === 0) {
          push("__untagged__", entry);
        } else {
          for (const tag of entry.tags) push(tag, entry);
        }
        break;
    }
  }

  for (const list of buckets.values()) list.sort(byDateDesc);

  const labelFor = (key: string): string => {
    switch (dimension) {
      case "category":
        return CATEGORY_LABELS[key as Category] ?? key;
      case "impact":
        return IMPACT_LABELS[key as Impact] ?? key;
      case "month":
        return monthLabel(key);
      case "tag":
        return key === "__untagged__" ? "Untagged" : `#${key}`;
    }
  };

  const keys = [...buckets.keys()];

  keys.sort((a, b) => {
    switch (dimension) {
      case "category":
        return CATEGORIES.indexOf(a as Category) - CATEGORIES.indexOf(b as Category);
      case "impact":
        // Highest impact first.
        return IMPACT_WEIGHT[b as Impact] - IMPACT_WEIGHT[a as Impact];
      case "month":
        // Newest month first.
        return a < b ? 1 : a > b ? -1 : 0;
      case "tag": {
        const ca = buckets.get(a)?.length ?? 0;
        const cb = buckets.get(b)?.length ?? 0;
        if (ca !== cb) return cb - ca;
        return a < b ? -1 : a > b ? 1 : 0;
      }
    }
  });

  return keys.map((key) => ({
    key,
    label: labelFor(key),
    entries: buckets.get(key) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Strip trailing punctuation/whitespace so we can re-punctuate cleanly. */
function trimTrailing(text: string): string {
  return text.replace(/[\s.;,—-]+$/u, "").trim();
}

/** Lowercase the first character (for weaving a title mid-sentence). */
function lowerFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * A deterministic, varied action verb. We index into the list rather than
 * randomizing so output is stable across renders and easy to test.
 */
const ACTION_VERBS = [
  "Drove",
  "Led",
  "Delivered",
  "Spearheaded",
  "Built",
  "Owned",
  "Launched",
  "Championed",
  "Streamlined",
  "Accelerated",
] as const;

export function actionVerb(index: number): string {
  const len = ACTION_VERBS.length;
  const i = ((index % len) + len) % len;
  return ACTION_VERBS[i];
}

/**
 * Heuristic: does the title already open with a past-tense action verb?
 * If so, prepending another verb ("Drove mentored…") reads badly, so we
 * keep the title's own verb. Deterministic, no external data.
 */
function startsWithActionVerb(title: string): boolean {
  const first = title.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!first) return false;
  // Common past-tense verb endings, plus a handful of irregulars we use.
  const irregulars = new Set([
    "led",
    "built",
    "ran",
    "drove",
    "grew",
    "won",
    "set",
    "wrote",
    "rebuilt",
    "shipped",
    "cut",
  ]);
  if (irregulars.has(first)) return true;
  return /(ed|d)$/.test(first) && first.length > 3;
}

/** Phrasing tag appended to a promo bullet, tuned to impact level. */
const IMPACT_RECOGNITION: Record<Impact, string> = {
  minor: "a steady contribution to the team",
  moderate: "a solid, measurable win",
  major: "recognized as a major win",
  milestone: "a milestone achievement for the team",
};

/** True when metrics actually carry content. */
function hasMetrics(entry: Entry): boolean {
  return Boolean(entry.metrics && entry.metrics.trim());
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Promotion-case bullets: impact-first, achievement-led, concise. Strongest
 * wins surface first (impact weight desc, then newest). Metrics are woven in
 * when present, and a tuned recognition clause reinforces the impact level.
 *
 * Example shape:
 *   "Led migration to a new CI pipeline, cutting deploy time 40% — recognized
 *    as a major win."
 */
export function toPromotionBullets(entries: Entry[]): string[] {
  const sorted = [...entries].sort(byImpactThenDate);

  return sorted.map((entry) => {
    const title = trimTrailing(entry.title);
    const parts: string[] = [title];

    if (hasMetrics(entry)) {
      const metric = trimTrailing(entry.metrics as string);
      // If the metric reads like a clause, append it; otherwise frame it.
      parts[0] = `${title}, ${lowerFirst(metric)}`;
    }

    const recognition = IMPACT_RECOGNITION[entry.impact];
    return `${parts[0]} — ${recognition}.`;
  });
}

/**
 * Resume-style lines: tight, action-verb-led, metrics woven in. Verbs are
 * varied deterministically by index so consecutive lines don't all start the
 * same way, while remaining stable across renders.
 */
export function toResumeLines(entries: Entry[]): string[] {
  const sorted = [...entries].sort(byImpactThenDate);

  return sorted.map((entry, index) => {
    const rawTitle = trimTrailing(entry.title);
    // If the title already leads with a verb, keep it (capitalized);
    // otherwise prepend a varied, deterministic action verb.
    let line: string;
    if (startsWithActionVerb(rawTitle)) {
      line = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
    } else {
      line = `${actionVerb(index)} ${lowerFirst(rawTitle)}`;
    }

    if (hasMetrics(entry)) {
      const metric = trimTrailing(entry.metrics as string);
      line += `, ${lowerFirst(metric)}`;
    }

    return `${line}.`;
  });
}

/** Options for the self-review summary. */
export interface ReviewSummaryOptions {
  /** Optional period label, e.g. "H1 2026" or "the last 90 days". */
  periodLabel?: string;
  /** Heading to lead the markdown with. Defaults to "Self-Review Highlights". */
  title?: string;
}

/**
 * A self-review summary as markdown: an encouraging intro line followed by
 * bullets grouped by category (canonical order). Each bullet leads with the
 * achievement and weaves in metrics where present.
 */
export function toReviewSummary(
  entries: Entry[],
  opts: ReviewSummaryOptions = {},
): string {
  const title = opts.title ?? "Self-Review Highlights";

  if (entries.length === 0) {
    return `## ${title}\n\nNo wins logged for this period yet.`;
  }

  const count = entries.length;
  const period = opts.periodLabel ? ` over ${opts.periodLabel}` : "";
  const intro = `Across ${count} logged ${count === 1 ? "win" : "wins"}${period}, here's a summary of my key contributions, grouped by area of impact.`;

  const groups = groupBy(entries, "category");

  const sections: MarkdownSection[] = groups.map((group) => ({
    heading: group.label,
    lines: group.entries.map((entry) => {
      const t = trimTrailing(entry.title);
      if (hasMetrics(entry)) {
        return `${t} (${trimTrailing(entry.metrics as string)})`;
      }
      return t;
    }),
  }));

  const body = sections
    .map((section) => {
      const bullets = section.lines.map((line) => `- ${line}`).join("\n");
      return `### ${section.heading}\n\n${bullets}`;
    })
    .join("\n\n");

  return `## ${title}\n\n${intro}\n\n${body}`;
}

/**
 * Assemble an exportable markdown document from labelled sections. Each
 * section becomes an `##` heading followed by `- ` bullets. Empty sections
 * are skipped so the output stays clean.
 */
export function toMarkdown(sections: MarkdownSection[]): string {
  return sections
    .filter((section) => section.lines.length > 0)
    .map((section) => {
      const bullets = section.lines.map((line) => `- ${line}`).join("\n");
      return `## ${section.heading}\n\n${bullets}`;
    })
    .join("\n\n");
}
