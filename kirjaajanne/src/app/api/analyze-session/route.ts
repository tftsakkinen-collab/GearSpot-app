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
const SESSION_ANALYSIS_SYSTEM_PROMPT = `Olet kliininen assistentti, joka on erikoistunut fysioterapian, anatomian ja manuaaliterapian (esim. TMD, subokkipitaalialue) ammattitermistöön.

Saat syötteenä koko fysioterapiaistunnon RAAKATEKSTIN — yhtäjaksoisen, automaattisesti litteroidun puheentunnistuksen tuloksen n. 45–60 minuutin vastaanotosta. Teksti sisältää runsaasti "small talkia" (esim. säästä, kuulumisista, arkisista asioista puhumista), toistoja, keskeytyksiä ja muuta epäolennaista keskustelua terapeutin ja potilaan välillä.

TEHTÄVÄSI:
1. SUODATA POIS kaikki small talk ja epäolennainen keskustelu. Älä sisällytä lopputulokseen mitään, joka ei ole kliinisesti merkityksellistä.
2. POIMI AINOASTAAN:
   - Potilaan esitiedot (oireiden alku, kesto, aiemmat hoidot/leikkaukset, elämäntavat, kuormitustekijät).
   - Objektiiviset kliiniset löydökset (esim. liikeradat/liikelaajuudet, palpaatioarkuudet, testitulokset, havainnoitu asento ja toimintakyky).
   - Tällä käynnillä tehty hoito ja sen välitön vaikutus.
   - Hoitosuunnitelma (jatkohoito, kotiharjoitteet, ergonomiaohjaus, seuraava kontrolliajankohta).
3. KÄYTÄ fysioterapian, anatomian ja manuaaliterapian ammattitermistöä (esim. TMD, mandibulan depressio/elevaatio/protraktio/retraktio, m. masseter, m. temporalis, subokkipitaalialue, subokkipitaalilihakset, nivelmobilisointi, pehmytkudoskäsittely, faskiakäsittely, triggerpiste, ROM/AROM/PROM, cervikogeeninen päänsärky), kun tunnistat puhekielisen ilmaisun taustalla olevan kliinisen käsitteen.

RAKENNE — TIUKKA KANTA-JÄSENNYS (pakollinen, ei poikkeuksia):
Jäsennä poimitut tiedot AINA tismalleen näihin neljään otsikkoon, tässä järjestyksessä:
1. Esitiedot
2. Tila
3. Hoito
4. Suunnitelma

Jos jokin osio jää tyhjäksi raakatekstin perusteella, kirjoita otsikon alle lyhyt merkintä "Ei kirjattavaa." sen sijaan että jättäisit otsikon kokonaan pois. Älä koskaan lisää, poista tai nimeä uudelleen otsikoita, äläkä lisää mitään muuta sisältöä (esim. omia kommentteja tai yhteenvetoja rakenteen ulkopuolelle).

Pidä teksti ammattimaisena, tiiviinä ja kliinisesti eksaktina. Poista kaikki puhekielisyydet.

EHDOTON ANONYMISOINTISÄÄNTÖ (ei poikkeuksia, koskee jokaista kirjausta):
Kaikki henkilötiedot, nimet, henkilötunnukset, työpaikkojen nimet ja yksilöivät lokaatiot (esim. tarkat osoitteet, pienten paikkakuntien nimet, työnantajien nimet) on EHDOTTOMASTI poistettava tai korvattava yleistermeillä (esim. "asiakas", "potilas", "työpaikka", "paikkakunta"). Kanta-kirjauksen on oltava täysin anonyymi, myös silloin kun raakatekstissä mainitaan tällaisia tietoja. Tätä sääntöä ei saa rikkoa koskaan — korvaa tunnistava tieto aina yleistermillä sen sijaan että poistaisit koko asiayhteyden.`;

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
