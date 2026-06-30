import { notFound } from "next/navigation";
import { getEntry } from "@/lib/entries";
import { isAiConfigured } from "@/lib/ai-synthesis";
import { Card, CardContent } from "@/components/ui/card";
import { EntryForm } from "@/components/entries/entry-form";

export const metadata = { title: "Edit win" };

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit win</h1>
        <p className="mt-1 text-muted-foreground">
          Refine the details. Clarity now pays off when you need this later.
        </p>
      </header>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <EntryForm mode="edit" entry={entry} aiEnabled={isAiConfigured()} />
        </CardContent>
      </Card>
    </div>
  );
}
