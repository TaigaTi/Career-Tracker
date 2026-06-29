"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { seedDemoEntries } from "@/lib/seed-actions";

interface SeedDemoButtonProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

export function SeedDemoButton({
  variant = "outline",
  size,
  className,
}: SeedDemoButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await seedDemoEntries();
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isPending ? "Adding sample wins…" : "Add sample wins"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
