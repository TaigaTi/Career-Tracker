import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** JobWize wordmark + mark. */
export function Brand({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground shadow-sm shadow-brand/30">
        <Sparkles className="h-4.5 w-4.5" strokeWidth={2.5} aria-hidden />
      </span>
      {showText && (
        <span className="text-lg font-semibold tracking-tight">
          Job<span className="text-brand">Wize</span>
        </span>
      )}
    </span>
  );
}
