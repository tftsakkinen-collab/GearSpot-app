"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCompletion } from "@ai-sdk/react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import {
  AlertCircle,
  FileText,
  Loader2,
  Mic,
  Send,
  Square,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function DictationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
const [isCopied, setIsCopied] = useState(false);

  // Vercel AI SDK:n useCompletion tuottaa `input`, `handleInputChange` ja
  // `handleSubmit` -apurit, jotka on nyt kytketty suoraan lomakkeeseen alla.
  // `setInput` ja `complete` mahdollistavat sanelutekstin syöttämisen samaan
  // Kanta-kirjaus-funktioon myös äänilitteroinnin valmistuttua.
  const {
    completion,
    setCompletion,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    complete,
    isLoading,
    error,
  } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
    onFinish: (_prompt, finishedCompletion) => {
      console.log(
        "[Kirjaajanne] API-kutsu onnistui, Kanta-kirjaus vastaanotettu:",
        finishedCompletion
      );
    },
    onError: (apiError) => {
      console.error("[Kirjaajanne] API-kutsu epäonnistui:", apiError);
    },
  });

  // useAudioRecorder (oma, natiivi MediaRecorder-pohjainen hook): hoitaa
  // mikrofonin käytön, nauhoituksen ja palauttaa valmiin äänen
  // `recordingBlob`-kenttään kun `stopRecording` on kutsuttu.
  const { startRecording, stopRecording, isRecording, recordingTime, recordingBlob } =
    useAudioRecorder((exception) => {
      console.error("[Kirjaajanne] Mikrofonin käyttöoikeus evätty tai laitetta ei löytynyt:", exception);
      setMicError("Mikrofonin käyttöoikeutta ei myönnetty tai laitetta ei löytynyt.");
    });

  const handleMicClick = () => {
    setIsOpen((prev) => !prev);
  };

  const handleRecorderButtonClick = () => {
    if (isRecording) {
      console.log("[Kirjaajanne] Nauhoitus lopetetaan käyttäjän pyynnöstä.");
      stopRecording();
      return;
    }
    setMicError(null);
    setIsOpen(true);
    console.log("[Kirjaajanne] Aloitetaan äänen nauhoitus mikrofonilla.");
    startRecording();
  };

  // Kun nauhoitus päättyy, useAudioRecorder täyttää `recordingBlob`-
  // kentän. Lähetetään Blob tässä /api/transcribe-reitille Whisper-litterointia
  // varten, ja syötetään palautunut teksti automaattisesti samaan
  // `complete`-funktioon, joka jo tuottaa Kanta-kirjauksen striimattuna.
  useEffect(() => {
    if (!recordingBlob) return;

    const transcribeAndComplete = async (blob: Blob) => {
      setIsTranscribing(true);
      setMicError(null);
      console.log(
        "[Kirjaajanne] Nauhoitus valmis, lähetetään audio-Blob /api/transcribe-reitille...",
        { size: blob.size, type: blob.type }
      );

      try {
        const formData = new FormData();
        formData.append("audio", blob, "sanelu.webm");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as {
            error?: string;
            details?: unknown;
          } | null;

          if (errorBody?.details) {
            console.error(
              "[Kirjaajanne] /api/transcribe palautti virheen yksityiskohdat:",
              errorBody.details
            );
          }

          throw new Error(
            errorBody?.error ||
              `Litterointipyyntö epäonnistui (tila ${response.status}).`
          );
        }

        const data = (await response.json()) as { text?: string };
        const transcribedText = data.text?.trim();

        if (!transcribedText) {
          throw new Error("Whisper ei palauttanut litteroitua tekstiä.");
        }

        console.log(
          "[Kirjaajanne] Whisper-litterointi onnistui, syötetään teksti Kanta-kirjaus-funktioon:",
          transcribedText
        );
        setInput(transcribedText);
        await complete(transcribedText);
      } catch (transcribeError) {
        const message =
          transcribeError instanceof Error
            ? transcribeError.message
            : "Tuntematon virhe äänen litteroinnissa.";
        console.error("[Kirjaajanne] Äänen litterointi epäonnistui:", transcribeError);
        setMicError(message);
      } finally {
        setIsTranscribing(false);
      }
    };

    void transcribeAndComplete(recordingBlob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingBlob]);

  // Kääritään SDK:n handleSubmit, jotta saadaan lokiviesti heti kun lähetys
  // laukaistaan (ennen kuin verkkopyyntö ehtii edes lähteä).
  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (input.trim().length === 0) {
      console.warn("[Kirjaajanne] Sanelu on tyhjä, API-kutsua ei lähetetä.");
      return;
    }
    console.log("[Kirjaajanne] Lähetetään sanelu Kanta-kirjausta varten:", input);
    handleSubmit(event);
  };
const handleCopyAndClear = async () => {
    if (!completion) return;
    await navigator.clipboard.writeText(completion);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    setCompletion("");
    setInput("");
  };
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative">
        {isRecording && (
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
        )}
        <Button
          size="lg"
          onClick={handleRecorderButtonClick}
          disabled={isTranscribing}
          className={cn(
            "relative h-24 w-24 rounded-full p-0 shadow-lg transition-transform hover:scale-105 sm:h-32 sm:w-32",
            isRecording
              ? "bg-destructive text-destructive-foreground shadow-destructive/30 hover:bg-destructive/90"
              : "shadow-primary/20"
          )}
          aria-label={isRecording ? "Lopeta nauhoitus" : "Aloita sanelun nauhoitus"}
          aria-pressed={isRecording}
        >
          {isTranscribing ? (
            <Loader2 className="size-10 animate-spin sm:size-12" />
          ) : isRecording ? (
            <Square className="size-10 sm:size-12" fill="currentColor" />
          ) : (
            <Mic className="size-10 sm:size-12" />
          )}
        </Button>
      </div>
      <span className="text-base font-semibold tracking-wide text-primary sm:text-lg">
        {isTranscribing
          ? "Litteroidaan puhetta..."
          : isRecording
          ? `Nauhoitetaan... ${formatRecordingTime(recordingTime)}`
          : "Sanele tästä"}
      </span>
      <span className="text-sm text-muted-foreground">
        {isRecording
          ? "Paina uudelleen lopettaaksesi nauhoituksen."
          : "Paina ja aloita sanelu \u23CE ei asennuksia, ei viivettä."}
      </span>

      {micError && (
        <div className="flex w-full max-w-2xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={handleMicClick}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Tai kirjoita sanelu käsin
        </button>
      )}

      {isOpen && (
        <Card className="mt-4 w-full max-w-2xl text-left">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Vapaa sanelu</CardTitle>
              <CardDescription>
                Sanele mikrofonilla tai kirjoita/liitä teksti alle. Tekoäly
                jäsentää sen Kanta-yhteensopivaksi kirjaukseksi.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Piilota sanelupaneeli"
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={onFormSubmit} className="flex flex-col gap-3">
              <Textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Esim. Potilas kertoo alaselän kivusta, joka on jatkunut kaksi viikkoa nostotilanteen jälkeen..."
                className="min-h-32"
                disabled={isLoading || isTranscribing}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading || isTranscribing || input.trim().length === 0}
                  className="gap-1.5"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {isLoading ? "Kirjataan..." : "Muodosta Kanta-kirjaus"}
                </Button>
              </div>
            </form>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Kirjauksen muodostaminen epäonnistui: {error.message}
                </span>
              </div>
            )}

            {completion && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="size-4 text-primary" />
                  Kanta-kirjaus
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {completion}
                </pre>
              </div>
            )}

            {completion && (
              <Button 
                onClick={handleCopyAndClear} 
                className={`w-full mt-2 font-bold text-lg py-6 transition-all ${
                  isCopied ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {isCopied ? "Kopioitu potilastietojärjestelmään!" : "Kopioi ja Tyhjennä (Ctrl+C)"}
              </Button>
            )}

          </CardContent>
        </Card>
      )}
    </div> 
  );
}