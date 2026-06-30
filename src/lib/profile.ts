import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface ProfileWithAccount {
  profile: Profile;
  /** From auth.users, not stored on the profile row. */
  email: string | null;
  /** Auth provider used to sign in, e.g. "google" or "email". */
  provider: string | null;
  /** ISO timestamp the auth account was created. */
  accountCreatedAt: string | null;
}

const EMPTY = {
  full_name: null,
  headline: null,
  role: null,
  company: null,
  location: null,
  bio: null,
} as const;

/**
 * Load the signed-in user's profile alongside the account details that live
 * on the auth user rather than the profile row. Returns null if signed out.
 */
export async function getProfile(): Promise<ProfileWithAccount | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  // The signup trigger creates a profile row, but fall back to an empty shell
  // so the page never crashes if that row is somehow missing.
  const profile: Profile = data ?? {
    id: user.id,
    ...EMPTY,
    created_at: user.created_at,
    updated_at: user.created_at,
  };

  return {
    profile,
    email: user.email ?? null,
    provider: user.app_metadata?.provider ?? null,
    accountCreatedAt: user.created_at ?? null,
  };
}
