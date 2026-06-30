// Shared domain types for JobWize.
// Keep in sync with supabase/migrations/0001_init.sql.

export const CATEGORIES = [
  "achievement",
  "project",
  "skill",
  "leadership",
  "recognition",
  "collaboration",
  "growth",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  achievement: "Achievement",
  project: "Project",
  skill: "Skill / Learning",
  leadership: "Leadership",
  recognition: "Recognition",
  collaboration: "Collaboration",
  growth: "Growth",
  other: "Other",
};

// Ordered low -> high so it can be compared and sorted.
export const IMPACTS = ["minor", "moderate", "major", "milestone"] as const;

export type Impact = (typeof IMPACTS)[number];

export const IMPACT_LABELS: Record<Impact, string> = {
  minor: "Minor win",
  moderate: "Solid win",
  major: "Major win",
  milestone: "Milestone",
};

export const IMPACT_WEIGHT: Record<Impact, number> = {
  minor: 1,
  moderate: 2,
  major: 3,
  milestone: 4,
};

export interface Profile {
  id: string;
  full_name: string | null;
  /** Short professional tagline, e.g. "Senior Frontend Engineer". */
  headline: string | null;
  /** Current job title / role. */
  role: string | null;
  company: string | null;
  location: string | null;
  /** Free-form "about me" paragraph. */
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape used when updating a profile from a form. */
export interface ProfileInput {
  full_name: string | null;
  headline: string | null;
  role: string | null;
  company: string | null;
  location: string | null;
  bio: string | null;
}

export interface Entry {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** Quantified impact, e.g. "cut build time 40%". Optional. */
  metrics: string | null;
  category: Category;
  impact: Impact;
  tags: string[];
  /** ISO date (yyyy-mm-dd) the accomplishment happened. */
  occurred_on: string;
  created_at: string;
  updated_at: string;
}

/** Shape used when creating/updating an entry from a form. */
export interface EntryInput {
  title: string;
  description?: string | null;
  metrics?: string | null;
  category: Category;
  impact: Impact;
  tags: string[];
  occurred_on: string;
}
