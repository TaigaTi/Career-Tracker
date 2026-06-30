import { Card, CardContent } from "@/components/ui/card";
import { EntryForm } from "@/components/entries/entry-form";
import { isAiConfigured } from "@/lib/ai-synthesis";

export const metadata = { title: "Log a win" };

export default function LogPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Log a win</h1>
        <p className="mt-1 text-muted-foreground">
          Capture it while it&apos;s fresh. Small or big, it all adds up.
        </p>
      </header>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <EntryForm mode="create" aiEnabled={isAiConfigured()} />
        </CardContent>
      </Card>
    </div>
  );
}
