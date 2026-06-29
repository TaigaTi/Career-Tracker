import Link from "next/link";
import { format } from "date-fns";
import { PenLine } from "lucide-react";
import { getEntries, getAllTags, type EntryFilters } from "@/lib/entries";
import type { Entry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TimelineFilters } from "@/components/entries/timeline-filters";
import { EntryCard } from "@/components/entries/entry-card";
import { EmptyState } from "@/components/entries/empty-state";

export const metadata = { title: "Timeline" };

type SearchParams = {
  category?: string;
  impact?: string;
  tag?: string;
  search?: string;
  from?: string;
  to?: string;
  focus?: string;
};

const FILTER_KEYS = [
  "category",
  "impact",
  "tag",
  "search",
  "from",
  "to",
] as const;

interface MonthGroup {
  key: string;
  label: string;
  entries: Entry[];
}

/** Group entries (already newest-first) into month buckets, newest month first. */
function groupByMonth(entries: Entry[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  const index = new Map<string, MonthGroup>();

  for (const entry of entries) {
    const date = new Date(entry.occurred_on);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let group = index.get(key);
    if (!group) {
      group = { key, label: format(date, "MMMM yyyy"), entries: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return groups;
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const filters: EntryFilters = {
    category: sp.category || undefined,
    impact: sp.impact || undefined,
    tag: sp.tag || undefined,
    search: sp.search || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
  };

  const [entries, tags] = await Promise.all([
    getEntries(filters),
    getAllTags(),
  ]);

  const hasActiveFilters = FILTER_KEYS.some((k) => sp[k]);
  const groups = groupByMonth(entries);
  const count = entries.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
          <p className="mt-1 text-muted-foreground">
            Every win you&apos;ve captured, newest first.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/log">
            <PenLine className="h-4 w-4" />
            Log a win
          </Link>
        </Button>
      </header>

      {/* If there are no entries AND no filters, this is a true empty state. */}
      {count === 0 && !hasActiveFilters ? (
        <EmptyState />
      ) : (
        <>
          <TimelineFilters tags={tags} />

          {count === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="font-medium">No wins match these filters</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Try broadening your search or clearing the filters above.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/timeline">Clear filters</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {count} {count === 1 ? "win" : "wins"}
                {hasActiveFilters ? " matching your filters" : ""}
              </p>

              <div className="space-y-8">
                {groups.map((group) => (
                  <section key={group.key}>
                    <div className="mb-3 flex items-baseline gap-2">
                      <h2 className="text-sm font-semibold text-foreground">
                        {group.label}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {group.entries.length}{" "}
                        {group.entries.length === 1 ? "win" : "wins"}
                      </span>
                    </div>
                    <ul className="space-y-3">
                      {group.entries.map((entry) => (
                        <li key={entry.id}>
                          <EntryCard
                            entry={entry}
                            highlight={sp.focus === entry.id}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
