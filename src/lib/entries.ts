import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Entry } from "@/lib/types";

export interface EntryFilters {
  category?: string;
  impact?: string;
  tag?: string;
  search?: string;
  /** ISO date lower bound (inclusive). */
  from?: string;
  /** ISO date upper bound (inclusive). */
  to?: string;
  limit?: number;
}

/** Fetch the current user's entries, newest first, with optional filters. */
export async function getEntries(filters: EntryFilters = {}): Promise<Entry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("entries")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.impact) query = query.eq("impact", filters.impact);
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  if (filters.from) query = query.gte("occurred_on", filters.from);
  if (filters.to) query = query.lte("occurred_on", filters.to);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${term},description.ilike.${term},metrics.ilike.${term}`,
    );
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
}

/** Fetch a single entry by id (RLS scopes it to the owner). */
export async function getEntry(id: string): Promise<Entry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Entry) ?? null;
}

export interface EntryStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  topTags: { tag: string; count: number }[];
}

/** Aggregate stats for the dashboard. */
export async function getEntryStats(): Promise<EntryStats> {
  const entries = await getEntries();

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const tagCounts = new Map<string, number>();
  let thisWeek = 0;
  let thisMonth = 0;

  for (const e of entries) {
    const d = new Date(e.occurred_on);
    if (d >= weekAgo) thisWeek++;
    if (d >= monthStart) thisMonth++;
    for (const tag of e.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { total: entries.length, thisWeek, thisMonth, topTags };
}

/** Distinct tags across all of the user's entries (for filter UIs). */
export async function getAllTags(): Promise<string[]> {
  const entries = await getEntries();
  const set = new Set<string>();
  for (const e of entries) for (const t of e.tags) set.add(t);
  return [...set].sort();
}
