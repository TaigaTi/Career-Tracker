"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  CATEGORIES,
  IMPACTS,
  CATEGORY_LABELS,
  IMPACT_LABELS,
} from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TimelineFiltersProps {
  tags: string[];
}

/** Filter keys that this bar manages in the URL querystring. */
const FILTER_KEYS = [
  "category",
  "impact",
  "tag",
  "search",
  "from",
  "to",
] as const;

export function TimelineFilters({ tags }: TimelineFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = React.useCallback(
    (key: string) => searchParams.get(key) ?? "",
    [searchParams],
  );

  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = React.useState(urlSearch);

  // Keep the search box in sync when the URL changes externally (Clear button,
  // browser back/forward). Adjusting state during render, not in an effect, // is React's recommended pattern for deriving from changed inputs.
  const [prevUrlSearch, setPrevUrlSearch] = React.useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const pushWith = React.useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Drop "focus" once the user starts filtering.
      params.delete("focus");
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  // Debounce search input -> URL.
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        pushWith({ search });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasActiveFilters = FILTER_KEYS.some((k) => current(k));

  function clearAll() {
    setSearch("");
    router.push(pathname);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your wins…"
          aria-label="Search wins"
          className="pl-9"
        />
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        <div className="min-w-[150px]">
          <Label htmlFor="filter-category" className="text-xs">
            Category
          </Label>
          <Select
            id="filter-category"
            value={current("category")}
            onChange={(e) => pushWith({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-[150px]">
          <Label htmlFor="filter-impact" className="text-xs">
            Impact
          </Label>
          <Select
            id="filter-impact"
            value={current("impact")}
            onChange={(e) => pushWith({ impact: e.target.value })}
          >
            <option value="">All impact levels</option>
            {IMPACTS.map((i) => (
              <option key={i} value={i}>
                {IMPACT_LABELS[i]}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-[150px]">
          <Label htmlFor="filter-tag" className="text-xs">
            Tag
          </Label>
          <Select
            id="filter-tag"
            value={current("tag")}
            onChange={(e) => pushWith({ tag: e.target.value })}
            disabled={tags.length === 0}
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex min-w-[230px] gap-2 sm:col-span-2 lg:col-span-1">
          <div className="flex-1">
            <Label htmlFor="filter-from" className="text-xs">
              From
            </Label>
            <Input
              id="filter-from"
              type="date"
              value={current("from")}
              onChange={(e) => pushWith({ from: e.target.value })}
              aria-label="From date"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="filter-to" className="text-xs">
              To
            </Label>
            <Input
              id="filter-to"
              type="date"
              value={current("to")}
              onChange={(e) => pushWith({ to: e.target.value })}
              aria-label="To date"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
