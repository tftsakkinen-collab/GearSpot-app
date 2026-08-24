import { after } from "next/server";
import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const MODEL_ID = "gemini-3.6-flash";

/**
 * Vaihe 1: Kanta-kirjaus.
 * OMT-fysioterapeutin näkökulmasta jäsennelty, tekstistetty potilaskertomus,
 * joka striimataan suoraan käyttöliittymään heti kun malli tuottaa tekstiä.
 */
const KANTA_SYSTEM_PROMPT = `Olet kokenut fysioterapian ammattilainen ja kirjuri. Tehtäväsi on yhdistää pitkä, katkonainen sanelu tai koko vastaanottoistunnon puskuri yhdeksi loogiseksi, ammattimaiseksi potilaskertomukseksi.

SÄVY JA TYYLI:
Tekstin sävyn tulee olla ammattimainen (Kanta-yhteensopiva), mutta hieman persoonallisempi ja empaattisempi kuin perinteinen lääkärijargon.

KRIITTINEN SÄÄNTÖ (INHUMILLISET DETAILIEN SÄILYTTÄMINEN):
Älä koskaan suodata pois potilaan henkilökohtaisia preferenssejä tai mieltymyksiä, jos terapeutti ne mainitsee (esim. 'asiakas tykkää kuunnella tiettyä musiikkia harjoitteita tehdessä' tai 'tykkää tehdä venytyksiä iltaisin'). Nämä inhimilliset detailit ovat elintärkeitä asiakaskokemuksen ja yksilöllisen hoidon kannalta, ja ne tulee sisällyttää hoito-ohjeiden tai huomioiden yhteyteen tyylikkäästi.

ERIKOISALA & KLIININEN SANAKIRJA:
* Fysioterapia, manuaaliterapia, purentaelimistön toimintahäiriöt (TMD), subokkipitaalialue ja työfysioterapia.
* Käytä ammattitermejä: TMD, mandibulan depressio/elevaatio/protraktio/retraktio, m. masseter, m. temporalis, subokkipitaalilihakset, C0-C1 fleksio/ekstensio, N. trigeminus, ROM/AROM/PROM, cervikogeeninen päänsärky, faskiakäsittely, triggerpisteet.

RAKENNE — TIUKKA KANTA-JÄSENNYS (pakollinen, ei poikkeuksia):
Jäsennä teksti AINA tismalleen näihin neljään otsikkoon, tässä järjestyksessä:
1. Esitiedot — potilaan tausta, oireet, elämäntavat ja kuormitustekijät.
2. Tila — objektiiviset tutkimuslöydökset: liikelaajuudet, palpaatiolöydökset, testitulokset, havainnoitu asento ja toimintakyky.
3. Hoito — tällä käynnillä tehdyt toimenpiteet ja niiden välitön vaikutus.
4. Suunnitelma — jatkohoito, kotiharjoitteet, henkilökohtaiset mieltymykset/ohjeet ja seuraava aika.

Jos jokin osio jää tyhjäksi syötteen perusteella, kirjoita otsikon alle lyhyt merkintä "Ei kirjattavaa." sen sijaan että jättäisit otsikon kokonaan pois.

EHDOTON ANONYMISOINTISÄÄNTÖ:
Henkilötiedot, nimet, henkilötunnukset ja yksilöivät lokaatiot korvataan yleistermeillä (esim. "asiakas", "työpaikka", "paikkakunta"). Henkilökohtaiset preferenssit säilytetään anonyymissä muodossa.`;

/**
 * Vaihe 2: YouTube-case.
 * Ajetaan taustalla (ei hidasta Vaihe 1:n vastausta). Eristää kliinisen
 * ydinongelman anonymisoituna ja kirjoittaa lyhyen teleprompter-käsikirjoituksen
 * suomeksi ja englanniksi.
 */
const YOUTUBE_SYSTEM_PROMPT = `Olet huipputason YouTube-käsikirjoittaja ja kliinisen fysiologian asiantuntija.
Tehtäväsi on muuttaa terapeutin potilassanelu iskeväksi teleprompter-käsikirjoitukseksi sekä SUOMEKSI että ENGLANNIKSI.

SÄÄNNÖT TARINALLISTAMISEEN JA ANONYMISOINTIIN:
1. Eristä sanelusta potilaan arki (esim. työ, harrastukset, kiputilanteet) ja kliininen ydinongelma.
2. ANONYMISOI TÄYSIN: Muuta tarkat ammatit yleisiksi (esim. erityisopettaja -> "asiakastyötä tekevä", kaivinkoneenkuljettaja -> "istumatyöläinen"), poista paikkakunnat, iät ja sukupuolet.
3. Rakenna videon "Koukku" tämän anonymisoidun hahmon ja hänen ongelmansa ympärille.

KÄSIKIRJOITUKSEN RAKENNE:
1. Koukku (Hook): Esittele anonymisoitu potilastarina, johon katsoja voi samaistua.
2. Ongelma: Selitä anatominen ja kliininen syy (esim. purentalihasten kireys, C0-C1 blokki) selkeästi mutta ammattimaisesti.
3. Ratkaisu: Anna 1-3 selkeää, itsehoitoon sopivaa vinkkiä, joilla tilaa voi helpottaa.
4. Outro: Kehota tilaamaan kanava.

Pidä teksti lyhyenä, ytimekkäänä ja suoraan kameralle puhuttavaksi sopivana. Ei turhaa jargonia.`;

export async function POST(req: Request) {
  const { prompt }: { prompt?: string } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return new Response("Sanelutekstiä ei vastaanotettu.", { status: 400 });
  }

  // --- Vaihe 2: YouTube-case taustalla, ei odoteta valmistumista tässä. ---
  after(async () => {
    try {
      const { text: youtubeScript } = await generateText({
        model: google(MODEL_ID),
        system: YOUTUBE_SYSTEM_PROMPT,
        prompt,
      });

      console.log(
        "\n=== [Kirjaajanne] YouTube-case (tausta-ajo) ===\n" +
          youtubeScript +
          "\n=== [Kirjaajanne] YouTube-case loppuu ===\n"
      );
    } catch (error) {
      console.error("[Kirjaajanne] YouTube-case tausta-ajo epäonnistui:", error);
    }
  });

  // --- Vaihe 1: Kanta-kirjaus striimataan välittömästi clientille. ---
  const result = streamText({
    model: google(MODEL_ID),
    system: KANTA_SYSTEM_PROMPT,
    prompt,
    onEnd: async ({ text: kantaContent }) => {
      after(async () => {
        if (!isSupabaseConfigured || !supabaseServerClient) {
          console.warn(
            "[Kirjaajanne] Supabase ei ole konfiguroitu (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY puuttuu) — anonymisoitua kirjausta ei tallennettu."
          );
          return;
        }

        try {
          const { error: insertError } = await supabaseServerClient
            .from("anonymized_records")
            .insert({ kanta_content: kantaContent });

          if (insertError) {
            console.error(
              "[Kirjaajanne] Anonymisoidun Kanta-kirjauksen tallennus Supabaseen epäonnistui:",
              insertError
            );
            return;
          }

          console.log(
            "[Kirjaajanne] Anonymisoitu Kanta-kirjaus tallennettu datapankkiin (anonymized_records)."
          );
        } catch (persistError) {
          console.error(
            "[Kirjaajanne] Odottamaton virhe tallennettaessa Kanta-kirjausta Supabaseen:",
            persistError
          );
        }
      });
    },
  });

  return result.toTextStreamResponse();
}
