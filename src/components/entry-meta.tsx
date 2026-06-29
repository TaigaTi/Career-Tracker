import { Badge } from "@/components/ui/badge";
import {
  type Category,
  type Impact,
  CATEGORY_LABELS,
  IMPACT_LABELS,
} from "@/lib/types";

/** Shared badge renderers so every surface labels entries consistently. */

export function CategoryBadge({ category }: { category: Category }) {
  return <Badge tone="neutral">{CATEGORY_LABELS[category] ?? category}</Badge>;
}

const impactTone: Record<Impact, "neutral" | "brand" | "accent" | "success"> = {
  minor: "neutral",
  moderate: "brand",
  major: "accent",
  milestone: "success",
};

export function ImpactBadge({ impact }: { impact: Impact }) {
  return <Badge tone={impactTone[impact]}>{IMPACT_LABELS[impact] ?? impact}</Badge>;
}

export function TagList({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
