import Link from "next/link";
import { PenLine, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Sparkles className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">No wins logged yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Your first entry is the hardest — and the most satisfying.
            Future-you, writing a promotion case, will thank you.
          </p>
        </div>
        <Button asChild>
          <Link href="/log">
            <PenLine className="h-4 w-4" />
            Log your first win
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
