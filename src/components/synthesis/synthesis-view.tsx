"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import {
  Wand2,
  Copy,
  Check,
  Download,
  Sparkles,
  Trophy,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { type Entry, CATEGORIES, CATEGORY_LABELS } from "@/lib/types";
import {
  groupBy,
  toPromotionBullets,
  toResumeLines,
  toReviewSummary,
  toMarkdown,
} from "@/lib/synthesis";
import { enhanceWithAi, type AiSynthesisResult } from "@/lib/ai-synthesis-actions";
import type { AiResult } from "@/lib/ai-synthesis";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type FormatKey = "promotion" | "resume" | "review";

const FORMATS: { key: FormatKey; label: string }[] = [
  { key: "promotion", label: "Promotion case" },
  { key: "resume", label: "Resume lines" },
  { key: "review", label: "Self-review" },
];

type Preset = "90d" | "year" | "all" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "90d", label: "Last 90 days" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom range" },
];

export interface SynthesisViewProps {
  entries: Entry[];
  tags: string[];
  /** Whether Claude-powered synthesis is available on this deployment. */
  aiEnabled?: boolean;
  /** Echoed back from the URL so the controls reflect the active filters. */
  filters: {
    from?: string;
    to?: string;
    tag?: string;
    category?: string;
    preset?: string;
  };
}

/** Build a querystring, dropping empty values. */
function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function SynthesisView({
  entries,
  tags,
  aiEnabled = false,
  filters,
}: SynthesisViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeFormat, setActiveFormat] = React.useState<FormatKey>("promotion");
  const [copied, setCopied] = React.useState(false);

  // Claude-enhanced output, keyed to the format it was generated for.
  const [ai, setAi] = React.useState<AiResult | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [isEnhancing, startEnhance] = React.useTransition();

  const resetAi = React.useCallback(() => {
    setAi(null);
    setAiError(null);
  }, []);

  const activePreset: Preset = (PRESETS.some((p) => p.key === filters.preset)
    ? filters.preset
    : filters.from || filters.to
      ? "custom"
      : "all") as Preset;

  const navigate = React.useCallback(
    (next: Partial<SynthesisViewProps["filters"]>) => {
      resetAi();
      const merged = { ...filters, ...next };
      router.push(`${pathname}${buildQuery(merged)}`);
    },
    [filters, pathname, router, resetAi],
  );

  function onPresetChange(preset: Preset) {
    if (preset === "all") {
      navigate({ preset: undefined, from: undefined, to: undefined });
      return;
    }
    if (preset === "90d") {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      navigate({
        preset: "90d",
        from: format(from, "yyyy-MM-dd"),
        to: format(to, "yyyy-MM-dd"),
      });
      return;
    }
    if (preset === "year") {
      const now = new Date();
      navigate({
        preset: "year",
        from: `${now.getFullYear()}-01-01`,
        to: format(now, "yyyy-MM-dd"),
      });
      return;
    }
    // custom, keep existing dates, just switch mode.
    navigate({ preset: "custom" });
  }

  const periodLabel = React.useMemo(() => {
    const found = PRESETS.find((p) => p.key === activePreset);
    if (activePreset === "all") return "all time";
    if (activePreset === "90d") return "the last 90 days";
    if (activePreset === "year") return `${new Date().getFullYear()}`;
    return found?.label;
  }, [activePreset]);

  // Template-generated content for the active format.
  const generated = React.useMemo(() => {
    if (activeFormat === "promotion") {
      const bullets = toPromotionBullets(entries);
      return {
        bullets,
        markdown: toMarkdown([
          { heading: "Promotion Case Highlights", lines: bullets },
        ]),
      };
    }
    if (activeFormat === "resume") {
      const lines = toResumeLines(entries);
      return {
        bullets: lines,
        markdown: toMarkdown([{ heading: "Resume Highlights", lines }]),
      };
    }
    const markdown = toReviewSummary(entries, { periodLabel });
    return { bullets: null as string[] | null, markdown };
  }, [activeFormat, entries, periodLabel]);

  // If Claude output exists for the active format, prefer it.
  const aiForActive = ai && ai.format === activeFormat ? ai : null;

  const display = React.useMemo(() => {
    if (aiForActive) {
      if (activeFormat === "review") {
        const markdown = aiForActive.markdown ?? "";
        return { bullets: null as string[] | null, markdown };
      }
      const bullets = aiForActive.items ?? [];
      const heading =
        activeFormat === "promotion"
          ? "Promotion Case Highlights"
          : "Resume Highlights";
      return { bullets, markdown: toMarkdown([{ heading, lines: bullets }]) };
    }
    return generated;
  }, [aiForActive, activeFormat, generated]);

  const grouped = React.useMemo(() => groupBy(entries, "category"), [entries]);

  const rangeLabel = React.useMemo(() => {
    if (filters.from && filters.to) {
      return `${format(new Date(filters.from), "MMM d, yyyy")} to ${format(new Date(filters.to), "MMM d, yyyy")}`;
    }
    if (filters.from) return `since ${format(new Date(filters.from), "MMM d, yyyy")}`;
    if (filters.to) return `through ${format(new Date(filters.to), "MMM d, yyyy")}`;
    return "all time";
  }, [filters.from, filters.to]);

  function onEnhance() {
    setAiError(null);
    startEnhance(async () => {
      const res: AiSynthesisResult = await enhanceWithAi(activeFormat, {
        from: filters.from,
        to: filters.to,
        tag: filters.tag,
        category: filters.category,
      });
      if (res.ok && res.result) {
        setAi(res.result);
        setCopied(false);
      } else {
        setAiError(res.error ?? "Something went wrong.");
      }
    });
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(display.markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); fail silently.
    }
  }

  function onDownload() {
    const blob = new Blob([display.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = format(new Date(), "yyyy-MM-dd");
    a.href = url;
    a.download = `jobwize-${activeFormat}-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const count = entries.length;

  return (
    <div className="space-y-6">
      {/* Encouraging header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-brand">
          <Wand2 className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">
            Synthesis
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Look how much you&apos;ve accomplished
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
          <Trophy className="h-4 w-4 text-accent-foreground" />
          <span>
            Synthesizing{" "}
            <strong className="font-semibold text-foreground">
              {count} {count === 1 ? "win" : "wins"}
            </strong>{" "}
            from <span className="text-foreground">{rangeLabel}</span> into
            copy-ready material.
          </span>
        </p>
      </header>

      {/* Controls */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="preset">Date range</Label>
              <Select
                id="preset"
                value={activePreset}
                onChange={(e) => onPresetChange(e.target.value as Preset)}
              >
                {PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tag">Filter by tag</Label>
              <Select
                id="tag"
                value={filters.tag ?? ""}
                onChange={(e) =>
                  navigate({ tag: e.target.value || undefined })
                }
              >
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {activePreset === "custom" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(e) =>
                    navigate({ from: e.target.value || undefined })
                  }
                />
              </div>
              <div>
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(e) =>
                    navigate({ to: e.target.value || undefined })
                  }
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="category">Filter by category</Label>
            <Select
              id="category"
              value={filters.category ?? ""}
              onChange={(e) =>
                navigate({ category: e.target.value || undefined })
              }
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grouped breakdown */}
      {grouped.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Your wins at a glance
          </h2>
          <div className="flex flex-wrap gap-2">
            {grouped.map((group) => (
              <span
                key={group.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm"
              >
                {group.label}
                <span className="rounded-full bg-brand-soft px-1.5 text-xs font-semibold text-brand">
                  {group.entries.length}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Format switcher */}
      <div
        role="tablist"
        aria-label="Output format"
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {FORMATS.map((f) => (
          <button
            key={f.key}
            role="tab"
            type="button"
            aria-selected={activeFormat === f.key}
            onClick={() => {
              setActiveFormat(f.key);
              setCopied(false);
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeFormat === f.key
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Generated output + actions */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {count} {count === 1 ? "win" : "wins"} included
              {aiForActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                  <Sparkles className="h-3 w-3" />
                  AI-enhanced
                </span>
              )}
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              {aiEnabled && (
                <Button
                  variant={aiForActive ? "ghost" : "primary"}
                  size="sm"
                  onClick={onEnhance}
                  disabled={isEnhancing || count === 0}
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Writing…
                    </>
                  ) : aiForActive ? (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Enhance with AI
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4" />
                Download .md
              </Button>
            </div>
          </div>

          {aiError && (
            <p
              role="alert"
              className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {aiError}
            </p>
          )}

          {activeFormat === "review" ? (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-surface-muted p-4 font-sans text-sm leading-relaxed text-foreground">
              {display.markdown}
            </pre>
          ) : (
            <ul className="space-y-2.5">
              {display.bullets?.map((bullet, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm leading-relaxed text-foreground"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
