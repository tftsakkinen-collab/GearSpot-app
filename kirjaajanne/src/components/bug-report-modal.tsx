"use client";

import React, { useState, useEffect } from "react";
import {
  Bug,
  Send,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Smartphone,
  History,
} from "lucide-react";
import { getRecentActionLogs, logAction } from "@/lib/action-logger";

export interface BugReportModalProps {
  /** Optional custom trigger button style or placement */
  floating?: boolean;
}

export function BugReportModal({ floating = true }: BugReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userText, setUserText] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string>>({});

  // Capture device & browser info on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const info: Record<string, string> = {
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0",
        os: detectOS(navigator.userAgent),
        browser: detectBrowser(navigator.userAgent),
        screen: `${window.innerWidth}x${window.innerHeight} (${window.screen.width}x${window.screen.height})`,
        language: navigator.language || "fi",
        userAgent: navigator.userAgent,
      };
      setDeviceInfo(info);
    }
  }, []);

  const handleOpen = () => {
    logAction("BUG_MODAL_OPENED");
    setIsOpen(true);
    setStatus("idle");
    setErrorMessage("");
  };

  const handleClose = () => {
    if (status !== "submitting") {
      setIsOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userText.trim()) return;

    // Retrieve webhook URL from environment variables
    const webhookUrl =
      process.env.NEXT_PUBLIC_BUG_WEBHOOK_URL ||
      (typeof import.meta !== "undefined"
        ? (import.meta as { env?: { VITE_BUG_WEBHOOK_URL?: string } }).env?.VITE_BUG_WEBHOOK_URL
        : "");

    if (!webhookUrl) {
      setStatus("error");
      setErrorMessage(
        "Ympäristömuuttujaa NEXT_PUBLIC_BUG_WEBHOOK_URL (tai VITE_BUG_WEBHOOK_URL) ei ole asetettu .env-tiedostoon."
      );
      return;
    }

    setStatus("submitting");
    logAction("BUG_REPORT_SUBMITTED", { userTextLength: userText.length });

    try {
      const logs = getRecentActionLogs();

      // Request exact payload format & mode as specified for Apps Script
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          userText: userText.trim(),
          deviceInfo,
          actionLogs: logs,
        }),
      });

      // Since mode: "no-cors" returns opaque response (status 0), successful resolution indicates sent
      setStatus("success");
      setUserText("");
      logAction("BUG_REPORT_SUCCESS");
    } catch (err) {
      console.error("[Kirjaajanne] Webhook error:", err);
      setStatus("error");
      setErrorMessage("Verkkopyyntö epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.");
      logAction("BUG_REPORT_ERROR", { error: String(err) });
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {floating && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-red-700 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-600"
          aria-label="Ilmoita bugista"
        >
          <Bug className="size-4 animate-pulse" />
          <span className="hidden sm:inline">Ilmoita ongelmasta</span>
        </button>
      )}

      {/* Modal Dialog Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-background border border-border shadow-2xl p-6 transition-all"
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              disabled={status === "submitting"}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
                <Bug className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Ilmoita ongelmasta / bugista
                </h3>
                <p className="text-xs text-muted-foreground">
                  Raportti lähetetään suoraan kehittäjille Trello-tauluun.
                </p>
              </div>
            </div>

            {/* Success State */}
            {status === "success" ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <CheckCircle2 className="size-12 text-green-500 animate-bounce" />
                <h4 className="text-lg font-semibold text-foreground">
                  Raportti lähetetty!
                </h4>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Kiitos ilmoituksesta. Tiketti on luotu kehitystiimin Trello-taululle käsittelyä varten.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Sulje
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* User Input Textarea */}
                <div>
                  <label htmlFor="bug-user-text" className="block text-sm font-medium text-foreground mb-1.5">
                    Mitä tapahtui? Kuvaile ongelma tiivistetysti:
                  </label>
                  <textarea
                    id="bug-user-text"
                    required
                    rows={4}
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="Esim. Sanelupainike lakkasi reagoimasta pitkän sanelun jälkeen..."
                    className="w-full rounded-xl border border-input bg-muted/40 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>

                {/* Error Notice */}
                {status === "error" && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Lähetys epäonnistui</p>
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Technical Details Preview Disclosure */}
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="flex w-full items-center justify-between font-medium text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="size-3.5" />
                      Automaattisesti liitettävät laite- ja lokitiedot
                    </span>
                    {showTechnicalDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>

                  {showTechnicalDetails && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-2.5 text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">Laite & Versio:</span>{" "}
                        {deviceInfo.appVersion} | {deviceInfo.os} | {deviceInfo.browser} ({deviceInfo.screen})
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Viimeisimmät lokit:</span>
                        <pre className="mt-1 max-h-24 overflow-y-auto rounded bg-background p-2 font-mono text-[10px] border border-border">
                          {JSON.stringify(getRecentActionLogs(), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={status === "submitting"}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Peruuta
                  </button>
                  <button
                    type="submit"
                    disabled={status === "submitting" || !userText.trim()}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
                  >
                    {status === "submitting" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Lähetetään...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        <span>Lähetä raportti</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Helpers for simple browser & OS detection
function detectOS(ua: string): string {
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "Tuntematon OS";
}

function detectBrowser(ua: string): string {
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Tuntematon selain";
}
