import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { SidebarNav, BottomNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards these routes; this is defense in depth.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "there";

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface px-4 py-5 md:flex">
        <Link href="/dashboard" className="px-2">
          <Brand />
        </Link>
        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="min-w-0 px-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-dvh flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard">
            <Brand />
          </Link>
          <div className="flex items-center">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
