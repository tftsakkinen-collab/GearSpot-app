"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sessio-tila (Ambient Clinical Intelligence) — Tehtävä 1.
 *
 * Segmenttien pituus millisekunteina. Tehtävänannossa pyydettiin
 * `MediaRecorder`-rajapinnan `timeslice`-parametria (esim. 30 000 ms).
 *
 * TÄRKEÄ ARKKITEHTUURIPÄÄTÖS (dokumentoitu myös 04_DECISION_CHANGELOG.md:ssä):
 * Pelkkä `mediaRecorder.start(30000)` (natiivi `timeslice`) EI toiminut
 * tähän käyttötarkoitukseen, koska WebM/Opus-tallennuksessa vain
 * ENSIMMÄINEN `ondataavailable`-tapahtuman Blob sisältää kelvollisen
 * EBML/WebM-kontainerin otsikkotiedot. Kaikki sitä seuraavat timeslice-
 * palat ovat pelkkiä irrallisia Matroska-klustereita ilman otsikkoa, eikä
 * OpenAI Whisper (eikä mikään muukaan dekooderi) pysty litteroimaan niitä
 * itsenäisinä tiedostoina — vain ensimmäinen 30s pätkä olisi koskaan
 * litteroitunut oikein koko istunnon ajalta.
 *
 * RATKAISU: "segmentoitu jatkuva nauhoitus". Yksi ja sama mikrofoni-
 * `MediaStream` pidetään auki koko session ajan (ei koskaan suljeta
 * segmenttien välissä), mutta `MediaRecorder`-instanssi käynnistetään
 * uudelleen n. 30 sekunnin välein. Jokainen uudelleenkäynnistys tuottaa
 * oman, itsenäisesti kelvollisen WebM-tiedoston, jonka Whisper pystyy
 * litteroimaan täysin normaalisti. Käyttäjälle ja muulle sovellukselle
 * lopputulos on identtinen alkuperäisen vaatimuksen kanssa: n. 30 sekunnin
 * välein vapautuva audio-chunk, joka lähetetään taustalla
 * `/api/transcribe`-reitille ilman että selain joutuu koskaan pitämään
 * koko 45–60 minuutin nauhoitusta yhtenä valtavana muistissa olevana
 * Blob-oliona.
 */
const SEGMENT_INTERVAL_MS = 30_000;

export interface SessionRecorderControls {
  startSession: () => void;
  /**
   * Palauttaa Promisen, joka ratkeaa vasta kun VIIMEINEN audiosegmentti on
   * varmasti muodostettu ja välitetty `onSegment`-callbackille (ja siten
   * jonotettu lähetettäväksi). Näin kutsuja (esim. "Päätä sessio ja luo
   * kirjaus" -nappi) voi odottaa tämän valmistumista ennen kuin se lukee
   * lopullisen `sessionTranscript`-tilan ja lähettää sen analysoitavaksi —
   * ilman tätä session viimeiset ~30 sekuntia saattaisivat pudota pois
   * lopullisesta Kanta-kirjauksesta.
   */
  stopSession: () => Promise<void>;
  isSessionActive: boolean;
  sessionSeconds: number;
}

interface UseSessionRecorderOptions {
  /** Kutsutaan aina kun n. 30s audiosegmentti on valmis lähetettäväksi. */
  onSegment: (blob: Blob) => void;
  onError?: (exception: DOMException | Error) => void;
}

/**
 * Riippumaton, natiivi `MediaRecorder`-pohjainen hook koko terapiaistunnon
 * (45–60 min) jatkuvaan taustanauhoitukseen ja pilkkomiseen. Katso yllä
 * oleva kommentti segmentointiratkaisusta.
 */
export function useSessionRecorder({
  onSegment,
  onError,
}: UseSessionRecorderOptions): SessionRecorderControls {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Ref-peili `isSessionActive`-tilalle: luetaan suljinten (closures) sisällä
  // (esim. `onstop`-käsittelijässä), joissa Reactin state-arvo voisi olla
  // vanhentunut ilman tätä.
  const activeRef = useRef(false);
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onSegmentRef = useRef(onSegment);
  const onErrorRef = useRef(onError);
  // Ratkaisija odottavalle `stopSession()`-Promiselle: kutsutaan viimeisen
  // segmentin `onstop`-käsittelijästä, jotta `stopSession` voi luotettavasti
  // odottaa viimeisen chunkin valmistumista ennen kuin Promise ratkeaa.
  const pendingStopResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSegmentRef.current = onSegment;
  }, [onSegment]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearTimers = useCallback(() => {
    if (segmentTimerRef.current !== null) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    if (clockTimerRef.current !== null) {
      clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /**
   * Käynnistää yhden n. 30 sekunnin segmentin nykyisellä `MediaStream`illa.
   * Kun segmentti loppuu (joko ajastimen tai `stopSession`-kutsun takia),
   * `onstop`-käsittelijä koostaa Blobin ja välittää sen eteenpäin
   * `onSegment`-callbackille, ja käynnistää heti seuraavan segmentin jos
   * sessio on yhä aktiivinen.
   *
   * Toteutettu ref-pohjaisena (ei `useCallback`illa), koska funktio
   * kutsuu itseään rekursiivisesti `onstop`-käsittelijän sisällä — tämä
   * välttää "käytetty ennen määrittelyä" -riippuvuusongelman, joka
   * syntyisi jos funktio yrittäisi viitata omaan `useCallback`-
   * identiteettiinsä ennen kuin se on vielä olemassa.
   */
  const startNextSegmentRef = useRef<() => void>(() => {});

  // Päivitetään ref jokaisen renderin jälkeen (ei renderin AIKANA — Reactin
  // uusi `react-hooks/refs`-sääntö kieltää ref.currentin asettamisen
  // suoraan render-rungossa). `useEffect` ilman riippuvuuslistaa ajetaan
  // jokaisen renderin jälkeen, joten funktio näkee aina tuoreimmat closure-
  // arvot (esim. `onSegment`-callbackin), vaikka itse funktio-olio
  // vaihtuisikin joka renderillä.
  useEffect(() => {
    startNextSegmentRef.current = () => {
      const stream = streamRef.current;
      if (!stream || !activeRef.current) return;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];

        if (blob.size > 0) {
          onSegmentRef.current(blob);
        }

        // Jos sessio on yhä käynnissä (eli tätä ei kutsuttu stopSessionista),
        // käynnistetään heti seuraava segmentti samalla mikrofonistreamilla
        // — mikrofoni ei koskaan sammu segmenttien välissä.
        if (activeRef.current) {
          startNextSegmentRef.current();
        } else if (pendingStopResolveRef.current) {
          // stopSession() odottaa juuri tätä: viimeinen segmentti on nyt
          // varmasti muodostettu ja jonotettu lähetettäväksi. Mikrofonin
          // stream suljetaan vasta nyt (ei aiemmin), jotta se ei ehdi
          // katkaista viimeisen segmentin `ondataavailable`-tapahtumaa.
          stopStream();
          pendingStopResolveRef.current();
          pendingStopResolveRef.current = null;
        }
      };

      recorder.start();

      // Ajastin, joka katkaisee tämän yksittäisen segmentin n. 30s kohdalla.
      // `recorder.stop()` laukaisee yllä olevan `onstop`-käsittelijän, joka
      // puolestaan käynnistää seuraavan segmentin — näin muodostuu jatkuva,
      // katkeamaton segmenttiketju koko session ajan.
      segmentTimerRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, SEGMENT_INTERVAL_MS);
    };
  });

  const startSession = useCallback(() => {
    if (activeRef.current) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        activeRef.current = true;
        setIsSessionActive(true);
        setSessionSeconds(0);

        clockTimerRef.current = setInterval(() => {
          setSessionSeconds((prev) => prev + 1);
        }, 1000);

        console.log(
          "[Kirjaajanne] Sessio-nauhoitus käynnistetty (jatkuva segmentointi, " +
            `${SEGMENT_INTERVAL_MS / 1000}s per segmentti).`
        );

        startNextSegmentRef.current();
      })
      .catch((exception: DOMException) => {
        onErrorRef.current?.(exception);
      });
  }, []);

  const stopSession = useCallback((): Promise<void> => {
    if (!activeRef.current) return Promise.resolve();

    // Asetetaan `activeRef` ensin epätodeksi, jotta käynnissä olevan
    // segmentin `onstop`-käsittelijä ei enää käynnistä uutta segmenttiä.
    activeRef.current = false;
    setIsSessionActive(false);
    clearTimers();

    const stopPromise = new Promise<void>((resolve) => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        // Mikrofonin stream suljetaan vasta `onstop`-käsittelijässä (ks.
        // startNextSegment yllä), jotta viimeisen segmentin data ehtii
        // varmasti tallentua ennen kuin track lopetetaan.
        pendingStopResolveRef.current = resolve;
        recorder.stop();
      } else {
        // Ei aktiivista MediaRecorderia (esim. juuri käynnistetyn ja heti
        // pysäytetyn session reunatapaus) — ei ole mitä odottaa.
        stopStream();
        resolve();
      }
    });

    console.log("[Kirjaajanne] Sessio-nauhoitus pysäytetään...");

    return stopPromise;
  }, [clearTimers, stopStream]);

  // Siivotaan mikrofoni ja ajastimet, jos komponentti puretaan kesken session.
  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimers();
      stopStream();
    };
  }, [clearTimers, stopStream]);

  return {
    startSession,
    stopSession,
    isSessionActive,
    sessionSeconds,
  };
}
