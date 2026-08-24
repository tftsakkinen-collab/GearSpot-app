import {
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Clock,
  BookOpen,
  FileText,
  Lock,
  Users,
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
    icon: Clock,
    title: "Istuntopohjainen työnkulku",
    description:
      "Sanele esitiedot, testit ja hoito omassa tahdissasi pitkin vastaanottoa. Assistenttimme kerää palaset ja muodostaa niistä yhden loogisen kokonaisuuden.",
  },
  {
    icon: BookOpen,
    title: "Meidän oma ammattisanastomme",
    description:
      "Kaksoisvarmennettu puheentunnistuksemme (Double-Barrel STT) oppii jatkuvasti uutta. Opetamme tekoälylle yhdessä alan spesifeimmätkin termit.",
  },
  {
    icon: FileText,
    title: "Aikaa säästävä Kanta-rakenne",
    description:
      "Tekoäly suodattaa ja jäsentää rönsyilevänkin sanelun suoraan ammattimaiseen, Kanta-yhteensopivaan muotoon – unohtamatta potilaan inhimillisiä preferenssejä.",
  },
];

const securityItems = [
  {
    icon: Lock,
    title: "Potilastietojen ehdoton suoja",
    description:
      "Meille manuaaliterapian ammattilaisille potilasturvallisuus on kunnia-asia. Kirjaajanne ei koskaan tallenna potilasdataa tai saneluita omiin tietokantoihinsa, eikä dataa käytetä tekoälymallien opettamiseen.",
  },
  {
    icon: Users,
    title: "Anonyymi yhteisödata",
    description:
      "Tallennamme tietokantaan ainoastaan anonyymiä tilastotietoa, kuten opetetut ammattitermit ja säästetyt minuutit, jotta voimme kehittää työkaluamme entistä paremmaksi meille kaikille.",
  },
  {
    icon: ShieldCheck,
    title: "GDPR-yhteensopivuus",
    description:
      "Kaikki tietoliikenne on vahvasti salattua, ja arkkitehtuurimme noudattaa tiukimpia terveydenhuollon tietosuojastandardeja.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="size-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-bold tracking-tight text-foreground leading-none">
                Kirjaajanne
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Manuaaliterapian sanelin-assistentti
              </span>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground sm:flex">
            <a href="#ominaisuudet" className="transition-colors hover:text-foreground">
              Ominaisuudet
            </a>
            <a href="#tietoturva" className="transition-colors hover:text-foreground">
              Tietoturva
            </a>
          </nav>
          <Button variant="outline" size="sm" className="rounded-xl">
            Kirjaudu sisään
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center">
        {/* Hero Section */}
        <section className="flex w-full max-w-4xl flex-col items-center px-6 pt-12 pb-14 text-center sm:pt-20">
          <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5 bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30 font-semibold rounded-full">
            <Sparkles className="size-3.5" />
            🎁 Vapaa testikäyttö aktiivinen – Maksutietoja EI tarvita!
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl leading-tight">
            Manuaaliterapian sanelin-assistentti,
            <br className="hidden sm:block" /> joka oppii kanssamme.
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Suunniteltu meille manuaaliterapian ammattilaisille, jotka haluamme käyttää aikamme potilaisiin – emme paperitöihin. Kirjaajanne muuttaa puheemme rakenteiseksi potilaskertomukseksi sekunneissa.
          </p>

          <div className="mt-10 flex w-full flex-col items-center gap-6">
            <DictationPanel />
            <CommunityProofBanner />
          </div>
        </section>

        <Separator className="w-full max-w-6xl" />

        {/* Features Section */}
        <section
          id="ominaisuudet"
          className="w-full max-w-6xl px-6 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 rounded-full text-xs font-semibold">
              Ominaisuudet
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Suunniteltu manuaaliterapian arkeen
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Rakennettu meidän fysio-, naprapaatti-, osteopaatti- ja kiropraktikkovastaanottojemme todelliseen rytmiin.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1.5">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="w-full max-w-6xl" />

        {/* Security Section */}
        <section
          id="tietoturva"
          className="w-full max-w-6xl px-6 py-20 sm:py-24 bg-muted/20"
        >
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-3 rounded-full text-xs font-semibold border-primary/30 text-primary">
              Tietoturva & Luottamus
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Potilastietosuoja on meille kunnia-asia
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Meille manuaaliterapian ammattilaisille potilaiden luottamus on kaiken perusta.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {securityItems.map((sec) => (
              <Card key={sec.title} className="rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <sec.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">{sec.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1.5">{sec.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Kirjaajanne – Manuaaliterapian sanelin-assistentti</span>
          <span>Rakennettu yhdessä manuaaliterapian ammattilaisille</span>
        </div>
      </footer>

      {/* Floating Bug Report Modal & Trigger */}
      <BugReportModal />
    </div>
  );
}
