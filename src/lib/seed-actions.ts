"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EntryInput } from "@/lib/types";

export interface SeedResult {
  ok: boolean;
  error?: string;
  inserted?: number;
}

/** Format a Date as yyyy-mm-dd (local time). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A Date `daysAgo` days before today. */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * ~8 realistic, varied sample wins for a mid/senior software engineer.
 * Dates are computed relative to now at call time and spread across ~4 months.
 */
function buildSampleEntries(): EntryInput[] {
  return [
    {
      title: "Led the migration from REST to a typed tRPC API",
      description:
        "Coordinated a three-engineer effort to move our core endpoints to a fully typed tRPC layer. Cut a whole class of client/server contract bugs and made onboarding noticeably faster.",
      metrics: "eliminated ~30 runtime type errors/month",
      category: "leadership",
      impact: "milestone",
      tags: ["api", "typescript", "migration", "leadership"],
      occurred_on: toISODate(daysAgo(118)),
    },
    {
      title: "Cut production deploy time with a parallelized CI pipeline",
      description:
        "Reworked the GitHub Actions workflow to cache dependencies and run test shards in parallel, unblocking the team during release crunches.",
      metrics: "cut deploy time 38%",
      category: "achievement",
      impact: "major",
      tags: ["ci", "performance", "infra"],
      occurred_on: toISODate(daysAgo(101)),
    },
    {
      title: "Mentored a junior engineer through their first major feature",
      description:
        "Paired weekly with a new hire as they shipped the notifications system end to end. They're now reviewing PRs independently.",
      metrics: null,
      category: "leadership",
      impact: "moderate",
      tags: ["mentoring", "leadership", "growth"],
      occurred_on: toISODate(daysAgo(84)),
    },
    {
      title: "Resolved a critical checkout outage during peak traffic",
      description:
        "Diagnosed a connection-pool exhaustion bug in the payments service and shipped a hotfix within the hour, restoring checkout for all users.",
      metrics: "restored checkout in under 60 min",
      category: "achievement",
      impact: "major",
      tags: ["incident", "reliability", "payments"],
      occurred_on: toISODate(daysAgo(67)),
    },
    {
      title: "Shipped the new onboarding flow launch",
      description:
        "Owned the frontend for the redesigned onboarding experience from spec to GA, collaborating closely with design and product.",
      metrics: "NPS +12",
      category: "project",
      impact: "major",
      tags: ["launch", "frontend", "onboarding"],
      occurred_on: toISODate(daysAgo(49)),
    },
    {
      title: "Gave an internal tech talk on observability best practices",
      description:
        "Presented our tracing and structured-logging conventions to the wider engineering org. Several teams adopted the patterns afterward.",
      metrics: null,
      category: "recognition",
      impact: "moderate",
      tags: ["talk", "observability", "knowledge-sharing"],
      occurred_on: toISODate(daysAgo(33)),
    },
    {
      title: "Automated the weekly metrics report",
      description:
        "Replaced a manual spreadsheet ritual with a scheduled job that posts the dashboard straight to Slack every Monday.",
      metrics: "saved ~6 hrs/week",
      category: "achievement",
      impact: "minor",
      tags: ["automation", "infra", "productivity"],
      occurred_on: toISODate(daysAgo(18)),
    },
    {
      title: "Drove the cross-team design review for the new search service",
      description:
        "Facilitated alignment between backend, infra, and data teams on the search architecture, surfacing scaling risks early.",
      metrics: null,
      category: "collaboration",
      impact: "moderate",
      tags: ["architecture", "collaboration", "search"],
      occurred_on: toISODate(daysAgo(6)),
    },
  ];
}

/**
 * Populate an empty account with sample career wins so the app feels alive.
 * No-op (returns an error) if the user already has any entries.
 */
export async function seedDemoEntries(): Promise<SeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { count, error: countError } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true });
  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "You already have entries — demo data is only for empty accounts.",
    };
  }

  const rows = buildSampleEntries().map((entry) => ({
    ...entry,
    user_id: user.id,
  }));

  const { error } = await supabase.from("entries").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/timeline");
  revalidatePath("/synthesis");
  return { ok: true, inserted: rows.length };
}
