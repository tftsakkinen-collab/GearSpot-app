import {
  ShieldCheck,
  Sparkles,
  Stethoscope,
  ClipboardList,
} from "lucide-react";

import { DictationPanel } from "@/components/dictation-panel-loader";
import { BugReportModal } from "@/components/bug-report-modal";
import { CommunityProofBanner } from "@/components/community-proof-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: ClipboardList,
    title: "Rakenteinen kirjaus",
    description:
      "Sanelu muuttuu automaattisesti jäsennellyksi potilaskertomukseksi käyttämäsi kirjaamismallin mukaisesti.",
  },
  {
    icon: Sparkles,
    title: "Oppiva tekoäly",
    description:
      "Järjestelmä oppii kirjoitustyylisi ja erikoisalasi sanaston jokaisen sanelun myötä – aina tarkempi.",
  },
  {
    icon: ShieldCheck,
    title: "Turvallinen ja vaatimustenmukainen",
    description:
      "Potilastiedot käsitellään salattuna ja auditoitavasti, terveydenhuollon tietoturvavaatimusten mukaisesti.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Kirjaajanne
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground sm:flex">
            <a href="#ominaisuudet" className="transition-colors hover:text-foreground">
              Ominaisuudet
            </a>
            <a href="#tietoturva" className="transition-colors hover:text-foreground">
              Tietoturva
            </a>
          </nav>
          <Button variant="outline" size="sm">
            Kirjaudu sisään
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center">
        <section className="flex w-full max-w-4xl flex-col items-center px-6 pt-16 pb-16 text-center sm:pt-24">
          <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5 bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30 font-semibold">
            <Sparkles className="size-3.5" />
            🎁 Vapaa testikäyttö aktiivinen – Maksutietoja EI tarvita!
          </Badge>

          <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            Kirjaaminen, joka kuuntelee
            <br className="hidden sm:block" /> ja oppii kanssasi.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Kirjaajanne muuttaa puheesi rakenteiseksi, tarkaksi
            potilaskertomukseksi sekunneissa. Vähemmän näppäilyä, enemmän
            aikaa potilaalle.
          </p>

          <div className="mt-10 flex w-full flex-col items-center gap-6">
            <DictationPanel />
            <CommunityProofBanner />
          </div>
        </section>

        <Separator className="w-full max-w-6xl" />

        {/* Features */}
        <section
          id="ominaisuudet"
          className="w-full max-w-6xl px-6 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Kliininen kirjaaminen, uudelleen ajateltuna
            </h2>
            <p className="mt-3 text-muted-foreground">
              Suunniteltu terveydenhuollon ammattilaisille, jotka haluavat
              käyttää aikansa potilaisiin – ei paperityöhön.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Kirjaajanne</span>
          <span>Tekoälynatiivi kliininen kirjaaminen</span>
        </div>
      </footer>

      {/* Floating Bug Report Modal & Trigger */}
      <BugReportModal />
    </div>
  );
}
