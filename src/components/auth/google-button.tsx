"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** "Continue with Google" OAuth button. */
export function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const params = new URLSearchParams();
    if (redirectTo) params.set("redirectTo", redirectTo);
    const callbackUrl = `${origin}/auth/callback${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google, so no further work here.
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={loading}
      >
        <GoogleIcon className="h-4 w-4" />
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3a7.2 7.2 0 0 1-4.07 1.16 7.18 7.18 0 0 1-6.74-4.96H1.25v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.26 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.25a12.02 12.02 0 0 0 0 10.78l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.25 6.61l4.01 3.1A7.18 7.18 0 0 1 12 4.75z"
      />
    </svg>
  );
}
