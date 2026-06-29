import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div className="absolute inset-0 -z-10 bg-grid opacity-50" aria-hidden />

      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" aria-label="JobWize home">
          <Brand />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
