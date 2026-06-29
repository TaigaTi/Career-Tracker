"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  className,
  withLabel = false,
}: {
  className?: string;
  withLabel?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size={withLabel ? "sm" : "icon"}
      onClick={signOut}
      disabled={loading}
      aria-label="Sign out"
      title="Sign out"
      className={className}
    >
      <LogOut className="h-5 w-5" />
      {withLabel && <span>Sign out</span>}
    </Button>
  );
}
