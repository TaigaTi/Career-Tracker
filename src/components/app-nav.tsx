"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenLine,
  Mic,
  CalendarDays,
  Wand2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log a win", icon: PenLine },
  { href: "/ramble", label: "Ramble", icon: Mic },
  { href: "/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/synthesis", label: "Synthesis", icon: Wand2 },
] as const;

// The mobile tab bar also surfaces Profile; on desktop it lives in the
// sidebar footer (the user's name links to it).
const BOTTOM_NAV = [
  ...NAV,
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar navigation. */
export function SidebarNav() {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(href)
              ? "bg-brand-soft text-brand"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile bottom tab bar. */
export function BottomNav() {
  const isActive = useIsActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              isActive(href)
                ? "text-brand"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
