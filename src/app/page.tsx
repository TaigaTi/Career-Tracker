import Link from "next/link";
import { redirect } from "next/navigation";
import { PenLine, CalendarDays, Wand2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: PenLine,
    title: "Log wins in seconds",
    body: "Capture an accomplishment the moment it happens — title, impact, a tag. No friction, no blank-page dread.",
  },
  {
    icon: CalendarDays,
    title: "A timeline you'll actually use",
    body: "Every win, searchable and filterable by impact, theme, and date. Your career, in evidence.",
  },
  {
    icon: Wand2,
    title: "Turn logs into your case",
    body: "Group your wins into promotion bullets, review highlights, and resume lines — ready to copy.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-grid opacity-50" />
          <div className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              Your career journal
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Never forget a win.
              <br />
              <span className="text-brand">Get the promotion.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              JobWize is the simple daily log for your career. Track
              accomplishments as they happen, then turn them into the case for
              your next promotion, review, or resume.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start logging — it&apos;s free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-24">
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-surface p-6"
              >
                <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        <p>JobWize — track your career, one win at a time.</p>
      </footer>
    </div>
  );
}
