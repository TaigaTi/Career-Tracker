import { RambleSession } from "@/components/ramble/ramble-session";

export const metadata = { title: "Ramble" };

export default function RamblePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ramble</h1>
        <p className="mt-1 text-muted-foreground">
          Talk or type through your recent wins. We&apos;ll refine the
          brain-dump and split it into separate entries you can tweak before
          saving.
        </p>
      </header>

      <RambleSession />
    </div>
  );
}
