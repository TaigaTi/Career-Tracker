import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  Briefcase,
  MapPin,
  Mail,
  CalendarDays,
  TrendingUp,
  CalendarRange,
  ShieldCheck,
} from "lucide-react";
import { getProfile } from "@/lib/profile";
import { getEntryStats } from "@/lib/entries";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = { title: "Profile" };

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  email: "Email & password",
};

/** Up to two uppercase initials from a name, falling back to an email. */
function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function ProfilePage() {
  const data = await getProfile();
  if (!data) redirect("/login");

  const { profile, email, provider, accountCreatedAt } = data;
  const stats = await getEntryStats();

  const displayName =
    profile.full_name?.trim() || email?.split("@")[0] || "Your profile";
  const roleLine = [profile.role, profile.company]
    .filter(Boolean)
    .join(" · ");

  const snapshot = [
    { label: "Total wins", value: stats.total, icon: TrendingUp },
    { label: "This month", value: stats.thisMonth, icon: CalendarRange },
    { label: "This week", value: stats.thisWeek, icon: CalendarDays },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Your details and a snapshot of the wins you&apos;ve banked so far.
        </p>
      </header>

      {/* Identity header */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl font-semibold text-brand"
            aria-hidden
          >
            {initials(profile.full_name, email)}
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-xl font-semibold">{displayName}</h2>
            {profile.headline && (
              <p className="text-muted-foreground">{profile.headline}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
              {roleLine && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 shrink-0" aria-hidden />
                  {roleLine}
                </span>
              )}
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  {profile.location}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {profile.bio && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            About
          </h2>
          <Card>
            <CardContent className="p-5">
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Career snapshot */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Career snapshot
          </h2>
          <Link
            href="/timeline"
            className="text-sm font-medium text-brand hover:underline"
          >
            View timeline
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {snapshot.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium sm:text-sm">
                    {label}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold sm:text-3xl">
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats.topTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.topTags.map(({ tag, count }) => (
              <Link
                key={tag}
                href={`/timeline?tag=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border bg-surface px-3 py-1 text-sm hover:bg-surface-muted"
              >
                #{tag} <span className="text-muted-foreground">{count}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Account */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Account
        </h2>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            <div className="flex items-center gap-3 px-5 py-4">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="ml-auto truncate text-sm font-medium">
                {email ?? ", "}
              </span>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sign-in</span>
              <span className="ml-auto text-sm font-medium">
                {provider ? PROVIDER_LABELS[provider] ?? provider : ", "}
              </span>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="ml-auto text-sm font-medium">
                {accountCreatedAt
                  ? format(new Date(accountCreatedAt), "MMM d, yyyy")
                  : ", "}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Edit */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Edit profile
        </h2>
        <Card>
          <CardContent className="p-5 sm:p-6">
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
