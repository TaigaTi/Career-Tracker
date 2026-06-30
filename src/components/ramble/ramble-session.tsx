"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Square,
  Sparkles,
  Save,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { type EntryInput } from "@/lib/types";
import { parseRamble, createEntries } from "@/lib/ramble-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "./use-speech-recognition";
import { DraftCard, type DraftEntry } from "./draft-card";

let draftSeq = 0;
const newId = () => `draft-${++draftSeq}`;

export function RambleSession() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [drafts, setDrafts] = React.useState<DraftEntry[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isParsing, startParse] = React.useTransition();
  const [isSaving, startSave] = React.useTransition();

  const appendFinal = React.useCallback((chunk: string) => {
    setText((prev) => (prev ? `${prev.trim()} ${chunk}` : chunk));
  }, []);

  const speech = useSpeechRecognition({ onFinal: appendFinal });

  function handleSplit() {
    const ramble = text.trim();
    if (!ramble) {
      setError("Say or type something first.");
      return;
    }
    setError(null);
    if (speech.listening) speech.stop();

    startParse(async () => {
      const result = await parseRamble(ramble);
      if (!result.ok || !result.drafts) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDrafts((prev) => [
        ...prev,
        ...result.drafts!.map((d) => ({ ...d, _id: newId() })),
      ]);
      setText(""); // ready for the next ramble
    });
  }

  function patchDraft(id: string, p: Partial<EntryInput>) {
    setDrafts((prev) =>
      prev.map((d) => (d._id === id ? { ...d, ...p } : d)),
    );
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d._id !== id));
  }

  function handleSaveAll() {
    if (drafts.length === 0) return;
    const missingTitle = drafts.some((d) => !d.title.trim());
    if (missingTitle) {
      setError("Every win needs a title before saving.");
      return;
    }
    setError(null);

    const payload: EntryInput[] = drafts.map((d) => ({
      title: d.title,
      description: d.description,
      metrics: d.metrics,
      category: d.category,
      impact: d.impact,
      tags: d.tags,
      occurred_on: d.occurred_on,
    }));

    startSave(async () => {
      const result = await createEntries(payload);
      if (!result.ok) {
        setError(result.error ?? "Couldn't save. Please try again.");
        return;
      }
      router.push("/timeline");
      router.refresh();
    });
  }

  const busy = isParsing || isSaving;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* Capture */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ramble about everything you got done. Mention a few wins in a row, the messier the better. We'll tidy them into separate entries."
              rows={5}
              disabled={busy}
            />
            {speech.interim && (
              <p className="mt-1.5 text-sm italic text-muted-foreground">
                {speech.interim}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {speech.supported && (
              <Button
                type="button"
                variant={speech.listening ? "danger" : "secondary"}
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
                disabled={busy}
              >
                {speech.listening ? (
                  <>
                    <Square className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Record
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              onClick={handleSplit}
              disabled={busy || !text.trim()}
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isParsing ? "Splitting…" : "Split into wins"}
            </Button>

            {speech.listening && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
                Listening…
              </span>
            )}
          </div>

          {!speech.supported && (
            <p className="text-xs text-muted-foreground">
              Voice input isn&apos;t available in this browser. Type your ramble
              above and we&apos;ll still split it into wins.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Review */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Review {drafts.length} {drafts.length === 1 ? "win" : "wins"}
            </h2>
            <button
              type="button"
              onClick={() => setDrafts([])}
              disabled={busy}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          <div className="space-y-3">
            {drafts.map((draft) => (
              <DraftCard
                key={draft._id}
                draft={draft}
                onChange={patchDraft}
                onRemove={removeDraft}
              />
            ))}
          </div>

          <div
            className={cn(
              "sticky bottom-4 flex items-center gap-3 rounded-lg border border-border",
              "bg-surface/95 p-3 shadow-sm backdrop-blur",
            )}
          >
            <Button
              type="button"
              size="lg"
              onClick={handleSaveAll}
              disabled={busy}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving…" : `Save all (${drafts.length})`}
            </Button>
            <p className="text-sm text-muted-foreground">
              or record more above to keep adding.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
