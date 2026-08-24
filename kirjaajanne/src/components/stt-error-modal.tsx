"use client";

import React, { useState } from "react";
import { Flag, Send, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { getRecentActionLogs, logAction } from "@/lib/action-logger";
import { addVocabularyEntry } from "@/lib/custom-vocabulary";

export interface STTErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
}

export function STTErrorModal({ isOpen, onClose, initialText = "" }: STTErrorModalProps) {
  const [wrongWord, setWrongWord] = useState("");
  const [correctWord, setCorrectWord] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wrongWord.trim() || !correctWord.trim()) return;

    // Tallenna välittömästi paikalliseen sanakirjaan (Double-Barrel STT Architecture)
    addVocabularyEntry(correctWord.trim(), wrongWord.trim());

    const webhookUrl =
      process.env.NEXT_PUBLIC_BUG_WEBHOOK_URL ||
      (typeof import.meta !== "undefined"
        ? (import.meta as { env?: { VITE_BUG_WEBHOOK_URL?: string } }).env?.VITE_BUG_WEBHOOK_URL
        : "");

    if (!webhookUrl) {
      setStatus("error");
      setErrorMessage("Ympäristömuuttujaa NEXT_PUBLIC_BUG_WEBHOOK_URL ei ole asetettu.");
      return;
    }

    setStatus("submitting");
    logAction("STT_CORRECTION_SUBMITTED", { wrongWord, correctWord });

    try {
      const payload = {
        userText: `[STT Korjaussanakirja] Väärä: "${wrongWord.trim()}" ➔ Oikea: "${correctWord.trim()}"`,
        deviceInfo: {
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          type: "STT_DICTIONARY_CORRECTION",
        },
        actionLogs: [
          ...getRecentActionLogs(),
          {
            timestamp: new Date().toISOString(),
            action: "STT_WORD_CORRECTION",
            wrongWord: wrongWord.trim(),
            correctWord: correctWord.trim(),
            context: initialText.slice(0, 200),
          },
        ],
      };

      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      setStatus("success");
      setWrongWord("");
      setCorrectWord("");
      logAction("STT_CORRECTION_SUCCESS");
    } catch (err) {
      console.error("[Kirjaajanne] STT correction error:", err);
      setStatus("error");
      setErrorMessage("Lähetys epäonnistui. Tarkista verkkoyhteys.");
      logAction("STT_CORRECTION_ERROR", { error: String(err) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-background border border-border shadow-2xl p-6 transition-all"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={status === "submitting"}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-border pb-3 mb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Flag className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Raportoi virheellinen puheentunnistus
            </h3>
            <p className="text-xs text-muted-foreground">
              Minkä sanan tai ilmaisun tekoäly ymmärsi väärin?
            </p>
          </div>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <CheckCircle2 className="size-10 text-green-500 animate-bounce" />
            <h4 className="text-base font-semibold text-foreground">Korjaus tallennettu!</h4>
            <p className="text-xs text-muted-foreground">
              Kiitos! Tämä tieto hyödynnetään käyttäjäkohtaisen STT-oppimissanakirjan opetuksessa.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 rounded-xl bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sulje
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="stt-wrong-word" className="block text-xs font-semibold text-foreground mb-1">
                Väärin ymmärretty sana / pätkä (STT tulos):
              </label>
              <input
                id="stt-wrong-word"
                type="text"
                required
                value={wrongWord}
                onChange={(e) => setWrongWord(e.target.value)}
                placeholder="Esim. 'suboksisitaali'"
                className="w-full rounded-xl border border-input bg-muted/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div>
              <label htmlFor="stt-correct-word" className="block text-xs font-semibold text-foreground mb-1">
                Oikea ammattitermi / sana:
              </label>
              <input
                id="stt-correct-word"
                type="text"
                required
                value={correctWord}
                onChange={(e) => setCorrectWord(e.target.value)}
                placeholder="Esim. 'subokkipitaalialue'"
                className="w-full rounded-xl border border-input bg-muted/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={status === "submitting"}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Peruuta
              </button>
              <button
                type="submit"
                disabled={status === "submitting" || !wrongWord.trim() || !correctWord.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Tallennetaan...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Lähetä korjaus</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
