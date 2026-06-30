"use client";

import * as React from "react";

// ---------------------------------------------------------------------------
// Minimal Web Speech API typings (not part of the standard DOM lib) plus a
// small hook. Speech recognition only exists in Chromium/Safari; on Firefox
// and other unsupported browsers `supported` is false and the UI falls back
// to plain typing. Requires HTTPS or localhost.
// ---------------------------------------------------------------------------

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechOptions {
  /** Called with each finalized chunk of speech (already trimmed). */
  onFinal?: (text: string) => void;
}

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  /** In-progress words not yet finalized, for a live preview. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

const noop = () => () => {};

export function useSpeechRecognition({
  onFinal,
}: SpeechOptions = {}): UseSpeechRecognition {
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const recRef = React.useRef<SpeechRecognitionLike | null>(null);

  // Browser-only capability check, read without a hydration mismatch:
  // false on the server, real value on the client.
  const supported = React.useSyncExternalStore(
    noop,
    () => getCtor() !== null,
    () => false,
  );

  // Keep the latest callback without re-creating the recognizer each render.
  const onFinalRef = React.useRef(onFinal);
  React.useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const start = React.useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript ?? "";
        if (res.isFinal) finalChunk += text;
        else interimChunk += text;
      }
      const trimmed = finalChunk.trim();
      if (trimmed) onFinalRef.current?.(trimmed);
      setInterim(interimChunk);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError(
          "Microphone access was blocked. Allow it in your browser settings, or type instead.",
        );
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setError("Speech recognition hit a snag. You can keep typing.");
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if called while already running; safe to ignore.
    }
  }, []);

  const stop = React.useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  // Tear down on unmount so the mic is released.
  React.useEffect(() => {
    return () => recRef.current?.abort();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
