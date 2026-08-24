import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// Koko 45–60 minuutin istunnon raakalitterointi voi olla erittäin pitkä
// (kymmeniä tuhansia merkkejä). Gemini-analyysi tälle tekstimäärälle voi
// kestää selvästi kauemmin kuin lyhyen "Vapaa sanelu" -tekstin jäsennys
// (ks. /api/chat), joten nostetaan suurin sallittu suoritusaika samaan
// tapaan kuin /api/transcribe-reitillä.
export const maxDuration = 120;

const MODEL_ID = "gemini-3.6-flash";

/**
 * Sessio-tila (Ambient Clinical Intelligence) — Tehtävä 3.
 *
 * Tämä on eri prompti kuin /api/chat-reitin `KANTA_SYSTEM_PROMPT`: siinä
 * missä /api/chat jäsentää jo valmiiksi tiiviin, terapeutin itsensä
 * saneleman yhteenvedon, tämän reitin syöte on koko istunnon RAAKA,
 * jatkuva puheentunnistuksen tuottama teksti — mukaan lukien small talk,
 * potilaan ja terapeutin arkinen keskustelu, toistot ja epäolennaisuudet.
 * Prompti on siksi tarkoituksella vielä tiukempi suodattamisen suhteen.
 */
const SESSION_ANALYSIS_SYSTEM_PROMPT = `Olet kokenut fysioterapian ammattilainen ja kirjuri. Tehtäväsi on yhdistää pitkä, katkonainen sanelu tai koko vastaanottoistunnon puskuri yhdeksi loogiseksi, ammattimaiseksi potilaskertomukseksi.

SÄVY JA TYYLI:
Tekstin sävyn tulee olla ammattimainen (Kanta-yhteensopiva), mutta hieman persoonallisempi ja empaattisempi kuin perinteinen lääkärijargon.

KRIITTINEN SÄÄNTÖ (INHUMILLISET DETAILIEN SÄILYTTÄMINEN):
Älä koskaan suodata pois potilaan henkilökohtaisia preferenssejä tai mieltymyksiä, jos terapeutti ne mainitsee (esim. 'asiakas tykkää kuunnella tiettyä musiikkia harjoitteita tehdessä' tai 'tykkää tehdä venytyksiä iltaisin'). Nämä inhimilliset detailit ovat elintärkeitä asiakaskokemuksen ja yksilöllisen hoidon kannalta, ja ne tulee sisällyttää hoito-ohjeiden tai huomioiden yhteyteen tyylikkäästi.

ERIKOISALA & TERMIT:
Käytä fysioterapian, anatomian ja manuaaliterapian ammattitermistöä (esim. TMD, mandibulan depressio/elevaatio/protraktio/retraktio, m. masseter, m. temporalis, subokkipitaalialue, subokkipitaalilihakset, nivelmobilisointi, pehmytkudoskäsittely, faskiakäsittely, triggerpiste, ROM/AROM/PROM, cervikogeeninen päänsärky), kun tunnistat puhekielisen ilmaisun taustalta kliinisen käsitteen.

RAKENNE — TIUKKA KANTA-JÄSENNYS (pakollinen):
Jäsennä poimitut tiedot AINA näihin neljään otsikkoon:
1. Esitiedot — potilaan tausta, oireet, elämäntavat ja henkilökohtaiset taustatiedot.
2. Tila — objektiiviset kliiniset löydökset (liikelaajuudet, palpaatio, testitulokset).
3. Hoito — tällä käynnillä tehty hoito ja sen välitön vaikutus.
4. Suunnitelma — jatkohoito, kotiharjoitteet, henkilökohtaiset mieltymykset/ohjeet ja seuraava aika.

Jos jokin osio jää tyhjäksi syötteen perusteella, kirjoita otsikon alle lyhyt merkintä "Ei kirjattavaa." Älä poista otsikoita.

EHDOTON ANONYMISOINTISÄÄNTÖ:
Tunnistettavat henkilötiedot (nimet, henkilötunnukset, osoitteet, tiettyjen työnantajien nimet) korvataan yleistermeillä (esim. "asiakas", "työpaikka", "paikkakunta"). Inhimilliset preferenssit ja elämäntavat säilytetään anonyymissä muodossa.`;

export async function POST(req: Request) {
  const { transcript }: { transcript?: string } = await req
    .json()
    .catch(() => ({}));

  if (
    !transcript ||
    typeof transcript !== "string" ||
    transcript.trim().length === 0
  ) {
    return Response.json(
      { error: "Sessio-transkriptiä ei vastaanotettu." },
      { status: 400 }
    );
  }

  console.log(
    `[Kirjaajanne] /api/analyze-session: vastaanotettu ${transcript.length} merkkiä ` +
      "raakatranskriptiä, lähetetään Geminille Kanta-jäsennystä varten..."
  );

  try {
    const { text: kantaContent } = await generateText({
      model: google(MODEL_ID),
      system: SESSION_ANALYSIS_SYSTEM_PROMPT,
      prompt: transcript,
    });

    console.log(
      "[Kirjaajanne] /api/analyze-session: Kanta-jäsennys onnistui."
    );

    // Tallennetaan anonymisoitu, jäsennelty Kanta-kirjaus samaan
    // datapankkiin kuin /api/chat-reitin lyhyt sanelu (ks. src/lib/supabase.ts).
    // Tehdään tämä vasta vastauksen palauttamisen jälkeen käyttäjän
    // näkökulmasta merkityksettömänä sivuvaikutuksena — ei koskaan hidasteta
    // tai estetä käyttäjälle palautuvaa vastausta tallennuksen takia.
    if (isSupabaseConfigured && supabaseServerClient) {
      supabaseServerClient
        .from("anonymized_records")
        .insert({ kanta_content: kantaContent })
        .then(({ error: insertError }) => {
          if (insertError) {
            console.error(
              "[Kirjaajanne] /api/analyze-session: anonymisoidun kirjauksen tallennus epäonnistui:",
              insertError
            );
          } else {
            console.log(
              "[Kirjaajanne] /api/analyze-session: anonymisoitu Kanta-kirjaus tallennettu datapankkiin."
            );
          }
        });
    }

    return Response.json({ text: kantaContent });
  } catch (error) {
    console.error(
      "[Kirjaajanne] /api/analyze-session: Kanta-jäsennys epäonnistui:",
      error
    );

    return Response.json(
      { error: "Session Kanta-jäsennys epäonnistui." },
      { status: 500 }
    );
  }
}
