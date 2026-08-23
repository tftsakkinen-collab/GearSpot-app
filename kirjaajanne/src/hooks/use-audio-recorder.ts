"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioRecorderControls {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  recordingTime: number;
  recordingBlob?: Blob;
}

/**
 * Kevyt, riippuvuudeton äänen nauhoitushook, joka käyttää selaimen natiivia
 * MediaRecorder-rajapintaa.
 *
 * Korvaa aiemmin käytetyn `react-audio-voice-recorder`-paketin, joka ei ole
 * yhteensopiva React 19:n kanssa: paketin oma, vanhentunut JSX-runtime-kopio
 * viittaa React 19:stä poistettuun
 * `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher`
 * -kenttään, mikä kaatoi koko sovelluksen moduulin arviointivaiheessa
 * selaimessa ("Cannot read properties of undefined (reading
 * 'ReactCurrentDispatcher')").
 */
export function useAudioRecorder(
  onNotAllowedOrFound?: (exception: DOMException) => void
): AudioRecorderControls {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | undefined>(
    undefined
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(() => {
    if (isRecording) return;

    setRecordingBlob(undefined);
    chunksRef.current = [];

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: mediaRecorder.mimeType || "audio/webm",
          });
          setRecordingBlob(blob);
          stopTracks();
        };

        // Whisper-optimointi (Tehtävä 4, v2.2): `start(1000)` pyytää
        // selainta vapauttamaan äänidatan noin sekunnin välein sen sijaan
        // että koko nauhoitus pidettäisiin yhtenä lohkona muistissa vasta
        // `stop()`-kutsuun asti. Tämä EI keskeytä eikä katkaise nauhoitusta
        // millään tavalla — `isRecording`-tila ja mikrofonin stream pysyvät
        // muuttumattomina koko ajan, ja pitkätkin miettimistauot (hiljaisuus)
        // tallentuvat normaalisti osaksi samaa nauhoitusta. Ainoa muutos on,
        // että pitkä sanelu ei enää kasvata yhtä valtavaa Blob-olioa vasta
        // lopussa, mikä tekee pidemmistä (esim. usean minuutin) saneluista
        // vakaampia sekä selaimen muistinkäytön että lopullisen
        // /api/transcribe-lähetyksen kannalta.
        mediaRecorder.start(1000);
        setIsRecording(true);
        setRecordingTime(0);

        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      })
      .catch((exception: DOMException) => {
        onNotAllowedOrFound?.(exception);
      });
  }, [isRecording, onNotAllowedOrFound, stopTracks]);

  const stopRecording = useCallback(() => {
    clearTimer();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, [clearTimer]);

  // Siivotaan mikrofoni ja ajastin, jos komponentti puretaan kesken
  // nauhoituksen.
  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
    };
  }, [clearTimer, stopTracks]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordingTime,
    recordingBlob,
  };
}
