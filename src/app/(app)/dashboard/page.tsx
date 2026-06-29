import Link from "next/link";
import { format } from "date-fns";
import { PenLine, TrendingUp, CalendarRange, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEntries, getEntryStats } from "@/lib/entries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge, ImpactBadge } from "@/components/entry-meta";

export const metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const name = profile?.full_name?.split(" ")[0] || "there";
  const [stats, recent] = await Promise.all([
    getEntryStats(),
    getEntries({ limit: 5 }),
  ]);

  const cards = [
    { label: "Total wins", value: stats.total, icon: TrendingUp },
    { label: "This week", value: stats.thisWeek, icon: Flame },
    { label: "This month", value: stats.thisMonth, icon: CalendarRange },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {name} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Capture what you accomplished. Future-you, writing a promotion case,
            will thank you.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/log">
            <PenLine className="h-4 w-4" />
            Log a win
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium sm:text-sm">{label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold sm:text-3xl">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.topTags.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Your themes
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(({ tag, count }) => (
              <Link
                key={tag}
                href={`/timeline?tag=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border bg-surface px-3 py-1 text-sm hover:bg-surface-muted"
              >
                #{tag}{" "}
                <span className="text-muted-foreground">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent wins
          </h2>
          <Link
            href="/timeline"
            className="text-sm font-medium text-brand hover:underline"
          >
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-muted-foreground">
                No wins logged yet. Your first entry is the hardest — and the
                most satisfying.
              </p>
              <Button asChild>
                <Link href="/log">
                  <PenLine className="h-4 w-4" />
                  Log your first win
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {recent.map((entry) => (
              <li key={entry.id}>
                <Link href={`/timeline?focus=${entry.id}`}>
                  <Card className="transition-colors hover:border-brand/40">
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{entry.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {format(new Date(entry.occurred_on), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <ImpactBadge impact={entry.impact} />
                        <CategoryBadge category={entry.category} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
