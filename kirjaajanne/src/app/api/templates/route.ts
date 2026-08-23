import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Kirjaajanne v2.2 — Dynaamiset sanelupohjat (Tehtävä 1).
 *
 * Pikanäppäinpohjat ("TMD-tutkimus", "Manuaaliterapia", "Ergonomiaohjaus"
 * jne.) eivät enää ole kovakoodattuja `dictation-panel.tsx`:ssä, vaan ne
 * haetaan tästä reitistä `templates`-taulusta (ks. SQL-migraatio
 * `supabase/migrations/20260824_create_templates.sql`).
 *
 * TIETOTURVA: Supabasen `service_role`-avain (`SUPABASE_SERVICE_ROLE_KEY`)
 * pysyy aina palvelimella (`src/lib/supabase.ts`, `runtime = "nodejs"`).
 * Client saa vain valmiiksi haetun JSON-listan, ei koskaan tietokanta-
 * yhteystietoja. Uuden pohjan luonti (POST) vaatii lisäksi erillisen
 * `TEMPLATE_ADMIN_SECRET`-tunnussanan, joka niin ikään luetaan yksinomaan
 * `.env.local`/Vercelin ympäristömuuttujista — sitä ei koskaan paljasteta
 * clientille eikä se ole `NEXT_PUBLIC_`-etuliitteinen.
 */

type TemplateRow = {
  id: string;
  label: string;
  template_text: string;
  sort_order: number;
};

// Kovakoodattu varajoukko: jos Supabasea ei ole (vielä) konfiguroitu tässä
// ympäristössä, käyttöliittymä toimii silti samoilla kolmella pohjalla
// kuin ennen v2.2-julkaisua sen sijaan että pikanäppäimet katoaisivat
// kokonaan.
const FALLBACK_TEMPLATES: Omit<TemplateRow, "id">[] = [
  {
    label: "TMD-tutkimus",
    template_text:
      "TMD-tutkimus: mandibulan liikelaajuudet mitattu (depressio/elevaatio/protraktio/retraktio), palpaatioarkuus m. masseter ja m. temporalis, niveläänet ja mahdollinen deviaatio avattaessa. ",
    sort_order: 1,
  },
  {
    label: "Manuaaliterapia",
    template_text:
      "Manuaaliterapia: pehmytkudoskäsittely ja nivelmobilisointi kohdealueelle. Hoidon jälkeen liikelaajuus ja kipu koettu subjektiivisesti parantuneeksi. ",
    sort_order: 2,
  },
  {
    label: "Ergonomiaohjaus",
    template_text:
      "Ergonomiaohjaus: käytiin läpi työpisteen/arjen ergonomia ja annettiin kirjalliset kotiharjoitteet kuormituksen tasaamiseksi. ",
    sort_order: 3,
  },
];

export async function GET() {
  if (!isSupabaseConfigured || !supabaseServerClient) {
    console.warn(
      "[Kirjaajanne] /api/templates: Supabase ei ole konfiguroitu, palautetaan kovakoodattu varajoukko."
    );
    return Response.json({ templates: FALLBACK_TEMPLATES, source: "fallback" });
  }

  try {
    const { data, error } = await supabaseServerClient
      .from("templates")
      .select("id, label, template_text, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Kirjaajanne] /api/templates: haku Supabasesta epäonnistui:", error);
      return Response.json({ templates: FALLBACK_TEMPLATES, source: "fallback" });
    }

    if (!data || data.length === 0) {
      return Response.json({ templates: FALLBACK_TEMPLATES, source: "fallback" });
    }

    return Response.json({ templates: data as TemplateRow[], source: "supabase" });
  } catch (unexpectedError) {
    console.error(
      "[Kirjaajanne] /api/templates: odottamaton virhe pohjien haussa:",
      unexpectedError
    );
    return Response.json({ templates: FALLBACK_TEMPLATES, source: "fallback" });
  }
}

export async function POST(req: Request) {
  const adminSecret = process.env.TEMPLATE_ADMIN_SECRET;

  if (!adminSecret) {
    console.error(
      "[Kirjaajanne] /api/templates: TEMPLATE_ADMIN_SECRET puuttuu ympäristömuuttujista — uusien pohjien lisäys on estetty."
    );
    return Response.json(
      { error: "Pohjien hallinta ei ole käytössä tässä ympäristössä." },
      { status: 503 }
    );
  }

  const providedSecret = req.headers.get("x-admin-secret");
  if (providedSecret !== adminSecret) {
    return Response.json({ error: "Virheellinen tunnussana." }, { status: 401 });
  }

  if (!isSupabaseConfigured || !supabaseServerClient) {
    return Response.json(
      { error: "Supabase ei ole konfiguroitu, uutta pohjaa ei voitu tallentaa." },
      { status: 503 }
    );
  }

  const body: { label?: string; template?: string } = await req.json().catch(() => ({}));
  const label = body.label?.trim();
  const template = body.template?.trim();

  if (!label || !template) {
    return Response.json(
      { error: "Sekä otsikko (label) että pohjateksti (template) vaaditaan." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServerClient
    .from("templates")
    .insert({ label, template_text: template })
    .select("id, label, template_text, sort_order")
    .single();

  if (error) {
    console.error("[Kirjaajanne] /api/templates: uuden pohjan tallennus epäonnistui:", error);
    return Response.json(
      { error: "Pohjan tallennus epäonnistui. Onko otsikko jo olemassa?" },
      { status: 500 }
    );
  }

  console.log("[Kirjaajanne] /api/templates: uusi sanelupohja luotu:", label);
  return Response.json({ template: data as TemplateRow }, { status: 201 });
}
