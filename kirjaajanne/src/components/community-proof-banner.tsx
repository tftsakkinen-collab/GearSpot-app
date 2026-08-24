"use client";

import React from "react";
import { Users, Sparkles, Award, Clock } from "lucide-react";

export interface CommunityProofBannerProps {
  communityWordsCount?: number;
  timeSavedMinutes?: number;
}

export function CommunityProofBanner({
  communityWordsCount = 1450,
  timeSavedMinutes = 12350,
}: CommunityProofBannerProps) {
  const formattedWords = communityWordsCount.toLocaleString("fi-FI");
  const formattedMinutes = timeSavedMinutes.toLocaleString("fi-FI");

  return (
    <div className="w-full max-w-4xl rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4 text-left">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Users className="size-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3" /> Yhteisön voima
              </span>
              <span className="text-xs text-muted-foreground font-medium">Fysioterapia & Manuaaliterapia</span>
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground leading-snug">
              Manuaaliterapian ammattilaiset ovat yhdessä opettaneet tekoälylle jo{" "}
              <span className="text-primary font-bold">{formattedWords}</span> alan erikoistermiä.
            </h3>
            <p className="text-xs text-muted-foreground">
              Rakennamme maailman tarkinta manuaaliterapian sanelin-assistenttia.
            </p>
          </div>
        </div>

        {/* Laskurimetriikat */}
        <div className="flex shrink-0 items-center gap-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
              <Award className="size-4 text-primary" />
              <span>{formattedWords}</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Opettua termiä</span>
          </div>

          <div className="h-8 w-px bg-border hidden sm:block" />

          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{formattedMinutes} min</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Aikaa säästetty</span>
          </div>
        </div>
      </div>
    </div>
  );
}
