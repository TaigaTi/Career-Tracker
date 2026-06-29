import { getEntries, getAllTags, type EntryFilters } from "@/lib/entries";
import { SynthesisView } from "@/components/synthesis/synthesis-view";
import { EmptyState } from "@/components/synthesis/empty-state";

export const metadata = { title: "Synthesis" };

type SearchParams = Promise<{
  from?: string;
  to?: string;
  tag?: string;
  category?: string;
  preset?: string;
}>;

export default async function SynthesisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const filters: EntryFilters = {
    from: params.from,
    to: params.to,
    tag: params.tag,
    category: params.category,
  };

  const [entries, tags] = await Promise.all([
    getEntries(filters),
    getAllTags(),
  ]);

  // With no entries at all (and no active filters) it's a brand-new account;
  // when filters are active but yield nothing, it's an empty range.
  const hasActiveFilter = Boolean(
    params.from || params.to || params.tag || params.category,
  );

  if (entries.length === 0) {
    return <EmptyState inRange={hasActiveFilter} />;
  }

  return (
    <SynthesisView
      entries={entries}
      tags={tags}
      filters={{
        from: params.from,
        to: params.to,
        tag: params.tag,
        category: params.category,
        preset: params.preset,
      }}
    />
  );
}
