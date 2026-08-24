import { APICallError, AISDKError, transcribe } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";

// Whisper-litterointi pitkistä, taukoja sisältävistä saneluista voi kestää
// oletusaikakatkaisua (10s) pidempään. Nostetaan Vercelin serverless-
// funktion suurin sallittu suoritusaika 60 sekuntiin, jotta pitkä pohdinta
// tai pitkä sanelu ei koskaan katkea kesken Whisper-kutsun (Tehtävä 4).
export const maxDuration = 60;

/**
 * OpenAI Whisper -malli äänen litterointiin. Vaihda tarvittaessa esim.
 * "gpt-4o-mini-transcribe" -malliin, jos Whisper-1 ei ole käytettävissä.
 */
const TRANSCRIPTION_MODEL_ID = "whisper-1";

/**
 * Whisper API -optimointi (Tehtävä 4, v2.2): `prompt`-parametri ei toimi
 * järjestelmäohjeena, vaan se antaa Whisperille esimerkin oikeasta
 * sanastosta ja kirjoitusasusta, mikä ohjaa mallia tunnistamaan
 * harvinaisemmat, foneettisesti haastavat erikoistermit oikein suomeksi
 * sen sijaan että se arvaisi lähimmän yleiskielen sanan tilalle.
 * Sanasto on koottu samasta kliinisestä erikoisalasta kuin Kanta-kirjaus-
 * promptissa (ks. `src/app/api/chat/route.ts`): TMD/purentaelimistö,
 * subokkipitaalialue ja manuaaliterapia/ergonomia.
 */
const TRANSCRIPTION_VOCABULARY_PROMPT =
  "TMD, masseter, temporalis, pterygoideus, subokkipitaalialue, subokkipitaalilihakset, " +
  "mandibula, depressio, elevaatio, protraktio, retraktio, diskusdislokaatio, bruksismi, " +
  "manuaalinen mobilisointi, nivelmobilisointi, pehmytkudoskäsittely, faskiakäsittely, " +
  "triggerpiste, neurodynaaminen käsittely, liikelaajuustesti, palpaatioarkuus, " +
  "cervikogeeninen päänsärky, ergonomia, työfysioterapia, kuormitusergonomia, " +
  "työpistearvio, kotiharjoitteet, OMT-fysioterapia, Kanta-kirjaus.";

/**
 * Poimii virheestä mahdollisimman paljon debug-tietoa kehityksen ajaksi.
 * `APICallError` (esim. OpenAI:n palauttama virhe) sisältää statusCode-,
 * responseBody- ja url-kentät, jotka kertovat täsmälleen miksi pyyntö
 * hylättiin (esim. väärä API-avain, kiintiö loppu, virheellinen tiedostomuoto).
 */
function serializeError(error: unknown) {
  if (APICallError.isInstance(error)) {
    return {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      url: error.url,
      responseHeaders: error.responseHeaders,
      responseBody: error.responseBody,
      isRetryable: error.isRetryable,
      cause:
        error.cause instanceof Error
          ? { name: error.cause.name, message: error.cause.message }
          : error.cause,
    };
  }

  if (AISDKError.isInstance(error)) {
    return {
      name: error.name,
      message: error.message,
      cause:
        error.cause instanceof Error
          ? { name: error.cause.name, message: error.cause.message }
          : error.cause,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

export async function POST(req: Request) {
  let audioFile: unknown;
  let userTerms = "";

  try {
    const formData = await req.formData();
    audioFile = formData.get("audio");
    userTerms = (formData.get("userTerms") as string | null) || "";
  } catch (error) {
    console.error(
      "[Kirjaajanne] /api/transcribe: lomakedatan (FormData) purku epäonnistui:",
      error
    );
    return Response.json(
      {
        error: "Pyyntöä ei voitu lukea (odotettiin multipart/form-data).",
        details: serializeError(error),
      },
      { status: 400 }
    );
  }

  if (!audioFile || !(audioFile instanceof Blob) || audioFile.size === 0) {
    console.error(
      "[Kirjaajanne] /api/transcribe: äänitiedostoa ei vastaanotettu tai se oli tyhjä.",
      { received: audioFile }
    );
    return Response.json(
      { error: "Äänitiedostoa ei vastaanotettu." },
      { status: 400 }
    );
  }

  try {
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const whisperPrompt = userTerms.trim()
      ? `${userTerms.trim()}, ${TRANSCRIPTION_VOCABULARY_PROMPT}`
      : TRANSCRIPTION_VOCABULARY_PROMPT;

    console.log(
      `[Kirjaajanne] /api/transcribe: vastaanotettu ${audioBuffer.byteLength} tavua ääntä, ` +
        `Whisper Prompt -inject: "${whisperPrompt.slice(0, 100)}...", ` +
        `lähetetään Whisperille (${TRANSCRIPTION_MODEL_ID})...`
    );

    const { text } = await transcribe({
      model: openai.transcription(TRANSCRIPTION_MODEL_ID),
      audio: audioBuffer,
      providerOptions: {
        openai: {
          // Ohjaa Whisperiä tunnistamaan suomenkielinen fysioterapia- ja
          // anatomiasanasto sekä käyttäjän omat termit oikein (Double-Barrel STT Architecture).
          prompt: whisperPrompt,
          language: "fi",
        },
      },
    });

    console.log("[Kirjaajanne] /api/transcribe: Whisper-litterointi onnistui:", text);

    return Response.json({ text });
  } catch (error) {
    // Tulostetaan koko virheobjekti palvelimen konsoliin sellaisenaan, jotta
    // täysi stack trace / cause-ketju näkyy terminaalissa debugausta varten.
    console.error("[Kirjaajanne] /api/transcribe: Whisper-litterointi epäonnistui:", error);

    const details = serializeError(error);
    console.error("[Kirjaajanne] /api/transcribe: jäsennelty virhe:", details);

    return Response.json(
      {
        error: "Äänen litterointi epäonnistui.",
        details,
      },
      { status: 500 }
    );
  }
}

