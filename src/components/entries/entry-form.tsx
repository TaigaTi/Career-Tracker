"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PenLine, Save, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import {
  CATEGORIES,
  IMPACTS,
  CATEGORY_LABELS,
  IMPACT_LABELS,
  type Entry,
} from "@/lib/types";
import { createEntry, updateEntry } from "@/lib/entries-actions";
import { autofillEntry } from "@/lib/ai-autofill-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface EntryFormProps {
  mode: "create" | "edit";
  entry?: Entry;
  /** Whether AI autofill is available (a provider key is configured). */
  aiEnabled?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export function EntryForm({ mode, entry, aiEnabled = false }: EntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiNote, setAiNote] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState(entry?.title ?? "");
  const [description, setDescription] = React.useState(
    entry?.description ?? "",
  );
  const [metrics, setMetrics] = React.useState(entry?.metrics ?? "");
  const [category, setCategory] = React.useState<string>(
    entry?.category ?? "achievement",
  );
  const [impact, setImpact] = React.useState<string>(
    entry?.impact ?? "moderate",
  );
  const [tags, setTags] = React.useState(entry?.tags?.join(", ") ?? "");
  const [occurredOn, setOccurredOn] = React.useState(
    entry?.occurred_on ?? today(),
  );

  async function onAutofill() {
    setError(null);
    setAiNote(null);
    if (!title.trim()) {
      setError("Add what you accomplished first, then autofill.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await autofillEntry(title, description);
      if (!res.ok || !res.suggestion) {
        setError(res.error ?? "Could not generate suggestions.");
        return;
      }
      const s = res.suggestion;
      setCategory(s.category);
      setImpact(s.impact);
      if (s.tags.length) setTags(s.tags.join(", "));
      // Only fill metrics when the model found something; never wipe the user's.
      if (s.metrics) setMetrics(s.metrics);
      setAiNote("Filled in category, impact, and tags from your story.");
    } finally {
      setAiBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("A title is required.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("metrics", metrics);
    formData.set("category", category);
    formData.set("impact", impact);
    formData.set("tags", tags);
    formData.set("occurred_on", occurredOn);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEntry(formData)
          : await updateEntry(entry!.id, formData);

      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/timeline");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div>
        <Label htmlFor="title">What did you accomplish?</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Shipped the new onboarding flow"
          autoFocus
          required
          maxLength={200}
        />
      </div>

      <div>
        <Label htmlFor="description">Tell the story (optional)</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was the situation, what did you do, and why did it matter?"
          rows={4}
        />
      </div>

      {aiEnabled && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-surface-muted/50 px-3 py-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAutofill}
            disabled={aiBusy || isPending || !title.trim()}
          >
            {aiBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Autofill details
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            {aiNote ?? "Let AI suggest the impact, category, and tags from your story."}
          </span>
        </div>
      )}

      <div>
        <Label htmlFor="metrics">Quantified impact (optional)</Label>
        <Input
          id="metrics"
          name="metrics"
          value={metrics}
          onChange={(e) => setMetrics(e.target.value)}
          placeholder="cut deploy time 40%"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="impact">Impact</Label>
          <Select
            id="impact"
            name="impact"
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
          >
            {IMPACTS.map((i) => (
              <option key={i} value={i}>
                {IMPACT_LABELS[i]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="frontend, mentoring, q2-goals"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Comma-separated. Themes help you spot patterns later.
          </p>
        </div>

        <div>
          <Label htmlFor="occurred_on">When did it happen?</Label>
          <Input
            id="occurred_on"
            name="occurred_on"
            type="date"
            value={occurredOn}
            max={today()}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {mode === "create" ? (
            <PenLine className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isPending
            ? "Saving…"
            : mode === "create"
              ? "Log this win"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() => router.push("/timeline")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
