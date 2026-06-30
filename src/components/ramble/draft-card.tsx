"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import {
  CATEGORIES,
  IMPACTS,
  CATEGORY_LABELS,
  IMPACT_LABELS,
  type EntryInput,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** An EntryInput plus a stable client-side id for list rendering. */
export type DraftEntry = EntryInput & { _id: string };

const today = () => new Date().toISOString().slice(0, 10);

interface DraftCardProps {
  draft: DraftEntry;
  onChange: (id: string, patch: Partial<EntryInput>) => void;
  onRemove: (id: string) => void;
}

export function DraftCard({ draft, onChange, onRemove }: DraftCardProps) {
  const [open, setOpen] = React.useState(false);
  // Local text for the tags field so the user can freely type commas/spaces;
  // it is parsed into an array on every change (and again on save).
  const [tagsText, setTagsText] = React.useState(draft.tags.join(", "));

  const patch = (p: Partial<EntryInput>) => onChange(draft._id, p);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div>
            <Label htmlFor={`title-${draft._id}`} className="sr-only">
              Win title
            </Label>
            <Input
              id={`title-${draft._id}`}
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="What did you accomplish?"
              maxLength={200}
              className="font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              aria-label="Category"
              value={draft.category}
              onChange={(e) =>
                patch({ category: e.target.value as EntryInput["category"] })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Impact"
              value={draft.impact}
              onChange={(e) =>
                patch({ impact: e.target.value as EntryInput["impact"] })
              }
            >
              {IMPACTS.map((i) => (
                <option key={i} value={i}>
                  {IMPACT_LABELS[i]}
                </option>
              ))}
            </Select>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={open}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
              aria-hidden
            />
            {open ? "Hide details" : "Add details"}
          </button>

          {open && (
            <div className="space-y-3 pt-1">
              <div>
                <Label htmlFor={`desc-${draft._id}`}>Description</Label>
                <Textarea
                  id={`desc-${draft._id}`}
                  value={draft.description ?? ""}
                  onChange={(e) =>
                    patch({ description: e.target.value || null })
                  }
                  placeholder="The situation, what you did, and why it mattered."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor={`metrics-${draft._id}`}>
                  Quantified impact
                </Label>
                <Input
                  id={`metrics-${draft._id}`}
                  value={draft.metrics ?? ""}
                  onChange={(e) => patch({ metrics: e.target.value || null })}
                  placeholder="cut deploy time 40%"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`tags-${draft._id}`}>Tags</Label>
                  <Input
                    id={`tags-${draft._id}`}
                    value={tagsText}
                    onChange={(e) => {
                      setTagsText(e.target.value);
                      patch({
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      });
                    }}
                    placeholder="frontend, mentoring"
                  />
                </div>
                <div>
                  <Label htmlFor={`date-${draft._id}`}>When</Label>
                  <Input
                    id={`date-${draft._id}`}
                    type="date"
                    value={draft.occurred_on}
                    max={today()}
                    onChange={(e) =>
                      patch({ occurred_on: e.target.value || today() })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(draft._id)}
          aria-label="Remove this win"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
