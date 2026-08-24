"use client";

import React, { useEffect, useState } from "react";
import { Users, Sparkles, Award, Clock } from "lucide-react";

export interface CommunityProofBannerProps {
  initialCommunityWords?: number;
  initialTimeSavedMinutes?: number;
}

export function CommunityProofBanner({
  initialCommunityWords = 1450,
  initialTimeSavedMinutes = 12350,
}: CommunityProofBannerProps) {
  const [stats, setStats] = useState({
    total_words_taught: initialCommunityWords,
    total_time_saved_minutes: initialTimeSavedMinutes,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.total_words_taught && data.total_time_saved_minutes) {
          setStats({
            total_words_taught: Number(data.total_words_taught),
            total_time_saved_minutes: Number(data.total_time_saved_minutes),
          });
        }
      })
      .catch((err) => {
        console.warn("[Kirjaajanne] Stats fetch error:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedWords = stats.total_words_taught.toLocaleString("fi-FI");
  const formattedMinutes = stats.total_time_saved_minutes.toLocaleString("fi-FI");

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
              {isLoading ? (
                <span className="inline-block h-5 w-16 align-middle animate-pulse rounded bg-primary/20" />
              ) : (
                <span className="text-primary font-bold">{formattedWords}</span>
              )}{" "}
              alan erikoistermiä.
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
              {isLoading ? (
                <span className="inline-block h-6 w-14 animate-pulse rounded bg-muted" />
              ) : (
                <span>{formattedWords}</span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Opettua termiä</span>
          </div>

          <div className="h-8 w-px bg-border hidden sm:block" />

          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
              {isLoading ? (
                <span className="inline-block h-6 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <span>{formattedMinutes} min</span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">Aikaa säästetty</span>
          </div>
        </div>
      </div>
    </div>
  );
}
