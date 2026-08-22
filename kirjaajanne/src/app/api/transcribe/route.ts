import { APICallError, AISDKError, transcribe } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";

/**
 * OpenAI Whisper -malli äänen litterointiin. Vaihda tarvittaessa esim.
 * "gpt-4o-mini-transcribe" -malliin, jos Whisper-1 ei ole käytettävissä.
 */
const TRANSCRIPTION_MODEL_ID = "whisper-1";

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

  try {
    const formData = await req.formData();
    audioFile = formData.get("audio");
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

    console.log(
      `[Kirjaajanne] /api/transcribe: vastaanotettu ${audioBuffer.byteLength} tavua ääntä, ` +
        `lähetetään Whisperille (${TRANSCRIPTION_MODEL_ID})...`
    );

    const { text } = await transcribe({
      model: openai.transcription(TRANSCRIPTION_MODEL_ID),
      audio: audioBuffer,
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

