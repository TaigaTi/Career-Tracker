import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Something went wrong · JobWize",
};

export default function AuthCodeErrorPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div className="absolute inset-0 -z-10 bg-grid opacity-50" aria-hidden />

      <header className="px-5 py-4">
        <Link href="/" aria-label="JobWize home">
          <Brand />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-[420px]">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
                <AlertCircle className="h-6 w-6" aria-hidden />
              </div>
              <CardTitle className="text-xl">
                We couldn&apos;t sign you in
              </CardTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">
                That sign-in link may have expired or already been used. Please
                try again.
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
