import {
  ShieldCheck,
  Sparkles,
  Stethoscope,
  ClipboardList,
  FileText,
} from "lucide-react";

import { DictationPanel } from "@/components/dictation-panel-loader";
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
        <section className="flex w-full max-w-3xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28">
          <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5">
            <Sparkles className="size-3.5" />
            Tekoälynatiivi kliininen kirjaaminen
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

          <div className="mt-12 flex w-full flex-col items-center gap-4">
            <DictationPanel />
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

        <Separator className="w-full max-w-6xl" />

        {/* Trust / compliance strip */}
        <section
          id="tietoturva"
          className="w-full max-w-6xl px-6 py-16 sm:py-20"
        >
          <Card className="border-none bg-primary text-primary-foreground ring-0">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10">
                  <FileText className="size-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    Valmis integroitumaan potilastietojärjestelmääsi
                  </p>
                  <p className="mt-1 text-sm text-primary-foreground/80">
                    Salattu tiedonsiirto ja auditoitava lokitus alusta alkaen.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="lg"
                className="shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Varaa esittely
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Kirjaajanne</span>
          <span>Tekoälynatiivi kliininen kirjaaminen</span>
        </div>
      </footer>
    </div>
  );
}

