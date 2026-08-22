"use client";

import dynamic from "next/dynamic";
import { Mic } from "lucide-react";

// DictationPanel käyttää selaimen `getUserMedia`/`MediaRecorder`-rajapintoja
// (ks. `@/hooks/use-audio-recorder`) eikä tue palvelinpuolen renderöintiä.
// Siksi koko paneeli ladataan vain selaimessa.
export const DictationPanel = dynamic(
  () => import("./dictation-panel").then((mod) => mod.DictationPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 sm:h-32 sm:w-32">
          <Mic className="size-10 text-primary/40 sm:size-12" />
        </div>
        <span className="text-sm text-muted-foreground">Ladataan sanelupaneelia...</span>
      </div>
    ),
  }
);
