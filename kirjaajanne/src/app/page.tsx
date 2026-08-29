import Link from "next/link";
import { DictationPanel } from "@/components/dictation-panel-loader";
import { Clock, AudioWaveform, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex w-full flex-col items-center justify-between min-h-[calc(100vh-80px)] py-2 px-4 sm:px-8">
      {/* Hero Container */}
      <section className="flex w-full max-w-4xl flex-col items-center text-center my-auto py-2 appear">
        {/* Soft Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-medium text-emerald-800 mb-4 appear-scale">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>Suunniteltu manuaaliterapian arkeen</span>
        </div>

        {/* H1 */}
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827] sm:text-5xl lg:text-[46px] leading-[1.15] max-w-2xl appear">
          Sanele havainnot.
          <br />
          Tekoäly hoitaa rakenteen.
        </h1>

        {/* Lede */}
        <p className="mt-4 max-w-[540px] text-sm sm:text-base leading-relaxed text-[#4b5563] appear-soft">
          Kirjaajanne suodattaa ja jäsentää rönsyilevänkin sanelun suoraan Kanta-yhteensopivaan muotoon – oppien oman ammattisanastosi.
        </p>

        {/* Action Buttons & Dictation Trigger */}
        <div className="mt-6 flex w-full flex-col items-center gap-5 appear-soft">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#dictate-panel"
              className="inline-flex h-[46px] items-center justify-center rounded-md bg-[#059669] px-5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#047857] hover:shadow-md"
            >
              Aloita sanelu (Ilmainen)
            </a>
            <Link
              href="/ominaisuudet"
              className="inline-flex h-[46px] items-center justify-center rounded-md border border-black/15 bg-white px-5 text-sm font-medium text-[#111827] transition-colors hover:bg-gray-50 hover:border-black/25"
            >
              Katso miten se toimii
            </Link>
          </div>

          <div id="dictate-panel" className="w-full max-w-3xl pt-1">
            <DictationPanel />
          </div>
        </div>
      </section>

      {/* 3-Column Stats Footer Bar */}
      <div className="mt-6 grid w-full max-w-6xl grid-cols-1 gap-5 border-t border-black/10 pt-5 sm:grid-cols-3 sm:gap-8 px-4 text-left appear-soft">
        <div className="flex items-start gap-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400">
            <Clock className="size-4.5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#111827]">
              Istuntopohjainen työnkulku
            </h3>
            <p className="text-xs text-[#4b5563] leading-relaxed">
              Kerää palaset omaan tahtiin pitkin vastaanottoa.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400">
            <AudioWaveform className="size-4.5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#111827]">
              Double-Barrel STT
            </h3>
            <p className="text-xs text-[#4b5563] leading-relaxed">
              Kaksoisvarmennettu puheentunnistus ymmärtää spesifeimmätkin termit.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-400">
            <ShieldCheck className="size-4.5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#111827]">
              100% Tietoturvallinen & GDPR
            </h3>
            <p className="text-xs text-[#4b5563] leading-relaxed">
              Kanta-yhteensopiva. Emme koskaan tallenna potilasdataa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
