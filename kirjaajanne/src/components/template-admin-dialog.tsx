"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export interface DictationTemplate {
  id: string;
  label: string;
  template_text: string;
  sort_order: number;
}

interface TemplateAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated: (template: DictationTemplate) => void;
}

// Yksinkertainen admin-tunnussanan lokaali muisti selaimen sessioon, jotta
// käyttäjän ei tarvitse kirjoittaa sitä joka kerta uudelleen samalla
// selainistunnolla. EI tallennu localStorageen — pysyy vain muistissa.
let cachedAdminSecret = "";

/**
 * Piilotettu admin-modaali uusien sanelupohjien (pikanäppäinten) lisäämiseen
 * (Tehtävä 1, v2.2). Avataan "Vapaa sanelu" -kortin pienestä rataspainikkeesta.
 * Vaatii `TEMPLATE_ADMIN_SECRET`-tunnussanan, joka tarkistetaan palvelimella
 * `/api/templates`-reitillä — tunnussana ei koskaan ole kovakoodattu
 * clientkoodiin eikä `NEXT_PUBLIC_`-muuttujassa.
 */
export function TemplateAdminDialog({
  open,
  onOpenChange,
  onTemplateCreated,
}: TemplateAdminDialogProps) {
  const [adminSecret, setAdminSecret] = useState(cachedAdminSecret);
  const [label, setLabel] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!adminSecret.trim() || !label.trim() || !templateText.trim()) {
      toast.error("Täytä kaikki kentät", {
        description: "Tunnussana, otsikko ja pohjateksti ovat kaikki pakollisia.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret.trim(),
        },
        body: JSON.stringify({ label: label.trim(), template: templateText.trim() }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        template?: DictationTemplate;
        error?: string;
      };

      if (!response.ok || !data.template) {
        throw new Error(data.error || `Tallennus epäonnistui (tila ${response.status}).`);
      }

      cachedAdminSecret = adminSecret.trim();
      onTemplateCreated(data.template);
      setLabel("");
      setTemplateText("");
      toast.success("Uusi sanelupohja lisätty", {
        description: `"${data.template.label}" on nyt saatavilla pikanäppäimenä.`,
      });
      onOpenChange(false);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Tuntematon virhe pohjaa tallennettaessa.";
      console.error("[Kirjaajanne] Sanelupohjan tallennus epäonnistui:", submitError);
      toast.error("Pohjan lisäys epäonnistui", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-admin-dialog-title"
      onClick={() => onOpenChange(false)}
    >
      <Card
        className="w-full max-w-md text-left"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle id="template-admin-dialog-title">Lisää sanelupohja</CardTitle>
            <CardDescription>
              Uusi pikanäppäin ilmestyy heti kaikille käyttäjille tallennuksen jälkeen.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Sulje"
          >
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-admin-secret" className="text-sm font-medium">
                Admin-tunnussana
              </label>
              <input
                id="template-admin-secret"
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-admin-label" className="text-sm font-medium">
                Napin otsikko
              </label>
              <input
                id="template-admin-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Esim. Subokkipitaalikäsittely"
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template-admin-text" className="text-sm font-medium">
                Pohjateksti
              </label>
              <Textarea
                id="template-admin-text"
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                placeholder="Valmis tekstirunko, joka lisätään kursorin kohdalle..."
                className="min-h-24"
              />
            </div>
            <Button type="submit" disabled={isSaving} className="mt-1 gap-1.5">
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isSaving ? "Tallennetaan..." : "Lisää pohja"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
