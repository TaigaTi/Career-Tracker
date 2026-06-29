"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Trash2, Calendar } from "lucide-react";
import type { Entry } from "@/lib/types";
import { deleteEntry } from "@/lib/entries-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge, ImpactBadge, TagList } from "@/components/entry-meta";
import { cn } from "@/lib/utils";

interface EntryCardProps {
  entry: Entry;
  highlight?: boolean;
}

export function EntryCard({ entry, highlight = false }: EntryCardProps) {
  const router = useRouter();
  const ref = React.useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (highlight && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  function handleDelete() {
    if (
      !window.confirm(
        `Delete "${entry.title}"? This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteEntry(entry.id);
      if (result.ok) {
        router.refresh();
      } else {
        window.alert(result.error ?? "Could not delete this entry.");
      }
    });
  }

  return (
    <Card
      ref={ref}
      className={cn(
        "scroll-mt-24 transition-all hover:border-brand/40",
        highlight && "ring-2 ring-brand ring-offset-2 ring-offset-background",
        isPending && "opacity-50",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight">{entry.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {format(new Date(entry.occurred_on), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Edit entry">
              <Link href={`/timeline/${entry.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete entry"
              disabled={isPending}
              onClick={handleDelete}
              className="text-muted-foreground hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {entry.description && (
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
            {entry.description}
          </p>
        )}

        {entry.metrics && (
          <p className="mt-3 text-sm font-medium text-brand">
            {entry.metrics}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ImpactBadge impact={entry.impact} />
          <CategoryBadge category={entry.category} />
        </div>

        {entry.tags.length > 0 && (
          <div className="mt-3">
            <TagList tags={entry.tags} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
