import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <WifiOff className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        We couldn&apos;t reach the network right now. JobWize works best with a
        connection — but don&apos;t worry, any wins you log will sync
        automatically once you&apos;re back online.
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
    </main>
  );
}
