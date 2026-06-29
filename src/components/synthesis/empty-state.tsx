import Link from "next/link";
import { PenLine, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Shown when there are no entries to synthesize in the selected range.
 * Friendly nudge toward logging wins.
 */
export function EmptyState({ inRange = false }: { inRange?: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Sparkles className="h-6 w-6" />
        </span>
        <div className="max-w-sm space-y-1.5">
          <h2 className="text-lg font-semibold">
            {inRange ? "Nothing to synthesize here yet" : "Nothing to synthesize yet"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {inRange
              ? "No wins fall in this range. Try widening the dates, or log a few more wins — this page turns them into promotion bullets, resume lines, and review summaries."
              : "Once you've logged a few wins, this page turns them into copy-ready promotion bullets, resume lines, and review summaries. The hard part is just starting."}
          </p>
        </div>
        <Button asChild>
          <Link href="/log">
            <PenLine className="h-4 w-4" />
            Log a win
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
