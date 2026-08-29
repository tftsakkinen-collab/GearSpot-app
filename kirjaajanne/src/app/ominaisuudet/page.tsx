import type { Metadata } from "next";
import { Clock, BookOpen, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Ominaisuudet | Kirjaajanne",
  description:
    "Tutustu Kirjaajanteen ominaisuuksiin, jotka on suunniteltu manuaaliterapian arkeen.",
};

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
      "Kaksoisvarmennettu puheentunnistuksemme (Double-Barrel STT) oppii jatkuvasti uutta. Opetamme tekoälylle yhdessä alan erikoisimmatkin termit.",
  },
  {
    icon: FileText,
    title: "Aikaa säästävä Kanta-rakenne",
    description:
      "Tekoäly suodattaa ja jäsentelee vapaamuotoisenkin sanelun. Tuottaa rakenteisen kirjauksen kansallisten kirjaamisotsikoiden mukaisesti – valmiina kopioitavaksi omaan järjestelmääsi, unohtamatta potilaan omia sanoja ja toiveita.",
  },
];

export default function OminaisuudetPage() {
  return (
    <section className="w-full max-w-6xl px-6 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="mb-3 rounded-full text-xs font-semibold">
          Ominaisuudet
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Suunniteltu manuaaliterapian arkeen
        </h1>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base">
          Rakennettu meidän manuaaliterapian ammattilaisten vastaanottojen todelliseen rytmiin.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <CardTitle className="text-base font-semibold">
                {feature.title}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed mt-2 text-muted-foreground">
                {feature.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Compliance / Vastuuvapauslauseke */}
      <div className="mt-12 mx-auto max-w-3xl flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <AlertCircle className="size-5 shrink-0 text-muted-foreground mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">Kliininen vastuuvapauslauseke</p>
          <p>
            Kirjaajanne ei ole potilastietojärjestelmä. Ammattilainen tarkistaa aina kirjauksen ennen sen tallentamista omaan potilastietojärjestelmäänsä.
          </p>
        </div>
      </div>
    </section>
  );
}
