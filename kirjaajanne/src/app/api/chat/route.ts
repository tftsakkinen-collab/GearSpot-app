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
const KANTA_SYSTEM_PROMPT =
  "Olet kokenut OMT-fysioterapeutti. Muuta vapaa sanelu ammattikieliseksi " +
  "Kanta-kirjaukseksi. Jäsennä otsikoihin: 1. Esitiedot, 2. Tila, 3. Hoito, " +
  "4. Ohjeet, 5. Suunnitelma. Älä keksi oireita, joita ei mainittu.";

/**
 * Vaihe 2: YouTube-case.
 * Ajetaan taustalla (ei hidasta Vaihe 1:n vastausta). Eristää kliinisen
 * ydinongelman anonymisoituna ja kirjoittaa lyhyen teleprompter-käsikirjoituksen
 * suomeksi ja englanniksi.
 */
const YOUTUBE_SYSTEM_PROMPT =
  "Eristä aiemmasta sanelusta kliininen ydinongelma. Anonymisoi data täysin " +
  "(poista nimet, henkilötunnukset, paikkakunnat ja muut tunnistetiedot). " +
  "Kirjoita lyhyt, iskevä teleprompter-käsikirjoitus YouTubeen aiheesta " +
  "suomeksi ja englanniksi.";

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
