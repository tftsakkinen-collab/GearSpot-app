"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, X, Sparkles, AlertCircle, Award, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import {
  getCustomVocabulary,
  addVocabularyEntry,
  removeVocabularyEntry,
  clearCustomVocabulary,
  type VocabularyEntry,
} from "@/lib/custom-vocabulary";

export interface VocabularyManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VocabularyManagerDialog({ open, onOpenChange }: VocabularyManagerDialogProps) {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [newCorrect, setNewCorrect] = useState("");
  const [newWrong, setNewWrong] = useState("");

  useEffect(() => {
    if (open) {
      setEntries(getCustomVocabulary());
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorrect.trim()) return;

    const updated = addVocabularyEntry(newCorrect.trim(), newWrong.trim());
    setEntries(updated);
    setNewCorrect("");
    setNewWrong("");

    if ([1, 10, 50].includes(updated.length) || updated.length % 5 === 0) {
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (err) {
        console.log("Confetti trigger:", err);
      }
    }
  };

  const handleDelete = (id: string) => {
    const updated = removeVocabularyEntry(id);
    setEntries(updated);
  };

  const handleClearAll = () => {
    if (confirm("Haluatko varmasti tyhjentää koko oman sanakirjan?")) {
      clearCustomVocabulary();
      setEntries([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-background border border-border shadow-2xl p-6 transition-all"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-border pb-3 mb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Oma Sanakirja (STT & LLM -itseoppivuus)
            </h3>
            <p className="text-xs text-muted-foreground">
              Hallinnoi erikoistermejä ja tekoälyn tunnistussanakirjaa.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-3.5 text-xs text-primary flex items-start gap-3 shadow-xs">
          <Sparkles className="size-5 shrink-0 mt-0.5 text-primary animate-pulse" />
          <div className="space-y-1.5 w-full">
            <div className="font-medium text-foreground text-xs leading-relaxed">
              Olet opettanut tekoälylle <span className="text-primary font-bold">{entries.length}</span> termiä. Omat termisi tekevät sanelusta jatkuvasti tarkemman meille kaikille.
            </div>
            <div className="w-full bg-primary/20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, (entries.length / 50) * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>Taso: {entries.length >= 50 ? "Mestari 🏆" : entries.length >= 10 ? "Edistynyt 🌟" : "Aloittelija 🌱"}</span>
              <span>Seuraava virstanpylväs: {entries.length >= 50 ? "50/50 saavutettu!" : entries.length >= 10 ? `${entries.length}/50 termiä` : `${entries.length}/10 termiä`}</span>
            </div>
          </div>
        </div>

        {/* Lisäyslomake */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-end gap-2 mb-4">
          <div className="flex-1 w-full">
            <label htmlFor="vocab-correct-input" className="block text-xs font-medium text-foreground mb-1">
              Oikea ammattitermi *
            </label>
            <input
              id="vocab-correct-input"
              type="text"
              required
              value={newCorrect}
              onChange={(e) => setNewCorrect(e.target.value)}
              placeholder="Esim. 'subokkipitaalialue'"
              className="w-full rounded-xl border border-input bg-muted/40 p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex-1 w-full">
            <label htmlFor="vocab-wrong-input" className="block text-xs font-medium text-foreground mb-1">
              Väärin kuultu sana (valinnainen)
            </label>
            <input
              id="vocab-wrong-input"
              type="text"
              value={newWrong}
              onChange={(e) => setNewWrong(e.target.value)}
              placeholder="Esim. 'suboksisitaali'"
              className="w-full rounded-xl border border-input bg-muted/40 p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button
            type="submit"
            disabled={!newCorrect.trim()}
            className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="size-4" />
            <span>Lisää</span>
          </button>
        </form>

        {/* Sanastolistaus */}
        <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-muted/30 p-2 space-y-1.5">
          {entries.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
              <AlertCircle className="size-6 text-muted-foreground/50" />
              <span>Ei vielä omia termejä. Lisää termi yläpuolelta tai raportoi virheitä 🚩 -ikonilla.</span>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/80 p-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-foreground">{entry.correctWord}</span>
                  {entry.wrongWord && (
                    <span className="text-muted-foreground">
                      (korjaa: <span className="line-through text-destructive/80">{entry.wrongWord}</span>)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  title="Poista termi"
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between pt-2 border-t border-border">
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-destructive hover:underline"
            >
              Tyhjennä koko sanakirja
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Valmis
          </button>
        </div>
      </div>
    </div>
  );
}
