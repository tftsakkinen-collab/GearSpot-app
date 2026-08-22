import { after } from "next/server";
import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";

export const runtime = "nodejs";

const MODEL_ID = "gemini-3.6-flash";

/**
 * Vaihe 1: Kanta-kirjaus.
 * OMT-fysioterapeutin näkökulmasta jäsennelty, tekstistetty potilaskertomus,
 * joka striimataan suoraan käyttöliittymään heti kun malli tuottaa tekstiä.
 */
const KANTA_SYSTEM_PROMPT = `Olet huipputason OMT-fysioterapian ja purentaelimistön (TMD) kliiniseen kirjaamiseen erikoistunut tekoäly.
Tehtäväsi on muuttaa asiantuntijan vapaa ja nopea sanelu viralliseksi, kieliopillisesti virheettömäksi Kanta-yhteensopivaksi tekstiksi.

KLIININEN SANAKIRJA (Käytä näitä termejä, kun tunnistat foneettista epäselvyyttä):
* Nivelet ja liikkeet: TMD, mandibulan depressio, elevaatio, protraktio, retraktio, lateraaliset liu'ut. Palautuva ja palautumaton discusdislokaatio, resiprookkinaksahdus, J-deviaatio, bruksismi, hypomobiliteetti, hypermobiliteetti.
* Lihakset: M. masseter (pars superficialis/profunda), M. temporalis, M. pterygoideus lateralis, M. pterygoideus medialis, M. digastricus, M. geniohyoideus, M. mylohyoideus, M. platysma, M. sternocleidomastoideus.
* Yläniska ja hermosto: C0-C1 fleksio/ekstensio, Ligamentum transversum, Ligamentum alaria, Arteria vertebralis, Cervical joint position error test, N. facialis, N. trigeminus, N. occipitalis.

RAKENNE (Jäsennä teksti aina näihin osioihin, vaikka sanelija ei sanoisi otsikoita ääneen):
1. Esitiedot
2. Tila
3. Hoito
4. Ohjeet
5. Suunnitelma

Pidä teksti ammattimaisena, tiiviinä ja kliinisesti eksaktina. Poista kaikki puhekielisyydet ja epäolennaisuudet (esim. maininnat taustamusiikista).`;
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
  });

  return result.toTextStreamResponse();
}
