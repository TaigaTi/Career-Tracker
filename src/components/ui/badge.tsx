import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "accent" | "success";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground border-border",
  brand: "bg-brand-soft text-brand border-transparent",
  accent: "bg-accent/20 text-accent-foreground border-transparent",
  success: "bg-success/15 text-success border-transparent",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
