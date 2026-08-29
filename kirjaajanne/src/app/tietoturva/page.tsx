import type { Metadata } from "next";
import { ShieldCheck, Lock, Users, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tietoturva & Luottamus | Kirjaajanne",
  description:
    "Lue Kirjaajanteen tietoturvasta, GDPR-yhteensopivuudesta ja potilastietojen suojauksesta.",
};

const securityItems = [
  {
    icon: Lock,
    title: "Potilastietojen ehdoton suoja",
    description:
      "Emme koskaan tallenna saneluiden äänitiedostoja tai potilasdataa. Tilastoimme vain anonyymisti palvelun käyttömäärää ja ammattisanaston kehittymistä.",
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

export default function TietoturvaPage() {
  return (
    <section className="w-full max-w-6xl px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="outline"
          className="mb-3 rounded-full text-xs font-semibold border-primary/30 text-primary"
        >
          Tietoturva & Luottamus
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Potilastietosuoja on meille kunnia-asia
        </h1>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base">
          Meille manuaaliterapian ammattilaisille potilaiden luottamus on kaiken perusta.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {securityItems.map((sec) => (
          <Card
            key={sec.title}
            className="rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <sec.icon className="size-5" />
              </div>
              <CardTitle className="text-base font-semibold">
                {sec.title}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-2 text-muted-foreground">
                {sec.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Kehittäjän esittely (P1.3) */}
      <div className="mt-16 mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start gap-4 text-left">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="size-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-foreground">
              Kehitetty kliiniseen arkeen
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kirjaajanteen taustalla on oululainen tuki- ja liikuntaelinsairauksiin sekä OMT-terapiaan erikoistunut työfysioterapeutti, joka rakensi työkalun helpottamaan omaa ja kollegoiden vastaanottotyötä.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
