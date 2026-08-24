"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useCompletion } from "@ai-sdk/react";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useSessionRecorder } from "@/hooks/use-session-recorder";
import { useSubscription } from "@/hooks/use-subscription";
import {
  AlertCircle,
  FileText,
  Loader2,
  Lock,
  Mic,
  Radio,
  ScrollText,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  TemplateAdminDialog,
  type DictationTemplate,
} from "@/components/template-admin-dialog";

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Sessio-tila (Ambient Clinical Intelligence, Tehtävä 1): pidempi kello,
// joka näyttää tunnit myös silloin kun sessio venyy yli tunnin mittaiseksi.
function formatSessionTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = seconds.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}

// Tehtävä 1 (v2.1): Markdown-siivous leikepöydälle.
// Malli palauttaa Kanta-kirjauksen Markdown-muotoiluin (**Esitiedot**,
// listat jne.), jotka näytetään käyttöliittymässä sellaisenaan visuaalisen
// selkeyden vuoksi. Potilastietojärjestelmiin (Pegasos/Lifecare/Kanta) ei
// kuitenkaan saa liittää raakaa Markdownia, joten leikepöydälle vietävä
// teksti puhdistetaan aina tällä funktiolla ennen `navigator.clipboard
// .writeText()`-kutsua. UI:n oma esikatselu (`<pre>`) pysyy koskemattomana.
function stripMarkdownForClipboard(markdown: string): string {
  return (
    markdown
      // Otsikot ("# ", "## " jne. rivin alussa)
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      // Lihavoitu + kursivoitu yhdessä (***teksti*** / ___teksti___)
      .replace(/(\*\*\*|___)([^*_]+?)\1/g, "$2")
      // Lihavoitu (**teksti** / __teksti__)
      .replace(/(\*\*|__)([^*_]+?)\1/g, "$2")
      // Kursivoitu (*teksti* / _teksti_)
      .replace(/(\*|_)([^*_]+?)\1/g, "$2")
      // Inline-koodi (`teksti` tai ```teksti```)
      .replace(/`{1,3}([^`]+?)`{1,3}/g, "$1")
      // Lainausmerkinnät rivin alussa ("> ")
      .replace(/^>\s?/gm, "")
      // Listamerkit ("- ", "* ", "+ ") normalisoidaan yhdenmukaisiksi
      // ajatusviivoiksi, jotta jäljelle ei jää tulkinnanvaraisia merkkejä
      .replace(/^\s*[-*+]\s+/gm, "- ")
      // Rivien perässä oleva ylimääräinen välilyönti pois
      .replace(/[ \t]+$/gm, "")
      // Useampi kuin kaksi peräkkäistä rivinvaihtoa tiivistetään kahdeksi,
      // jotta teksti pysyy siististi rivitettynä eikä sisällä turhia
      // tyhjiä välejä
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// Selaimen localStorage-avaimet automaattitallennukselle (Tehtävä 3, v2.2:
// tallennetaan nyt sekä "Vapaa sanelu" -teksti että valmis Kanta-kirjaus).
const DRAFT_STORAGE_KEY = "kirjaajanne:sanelu-luonnos";
const COMPLETION_STORAGE_KEY = "kirjaajanne:kanta-kirjaus-luonnos";
// Sessio-tila (Ambient Clinical Intelligence, Tehtävä 4): koko istunnon
// kertyvä raakatranskripti pelastetaan localStorageen aina kun se kasvaa,
// jotta selaimen kaatuminen tai välilehden vahinkosulkeminen kesken 45–60
// minuutin nauhoituksen ei tuhoa jo litteroitua tekstiä.
const SESSION_TRANSCRIPT_STORAGE_KEY = "kirjaajanne:sessio-transkripti";

// Pikamallineet (Tehtävä 3 v2.1 / Tehtävä 1 v2.2): tästä eteenpäin pohjat
// haetaan dynaamisesti `/api/templates`-reitiltä (Supabase `templates`-
// taulu). Tämä on vain viimeinen varajoukko siltä varalta, että itse
// `fetch`-kutsu epäonnistuu kokonaan (esim. verkkokatkos) — reitti itse
// palauttaa jo oman kovakoodatun varajoukkonsa, jos Supabase ei vastaa.
const CLIENT_FALLBACK_TEMPLATES: DictationTemplate[] = [
  {
    id: "fallback-tmd-tutkimus",
    label: "TMD-tutkimus",
    template_text:
      "TMD-tutkimus: mandibulan liikelaajuudet mitattu (depressio/elevaatio/protraktio/retraktio), palpaatioarkuus m. masseter ja m. temporalis, niveläänet ja mahdollinen deviaatio avattaessa. ",
    sort_order: 1,
  },
  {
    id: "fallback-manuaaliterapia",
    label: "Manuaaliterapia",
    template_text:
      "Manuaaliterapia: pehmytkudoskäsittely ja nivelmobilisointi kohdealueelle. Hoidon jälkeen liikelaajuus ja kipu koettu subjektiivisesti parantuneeksi. ",
    sort_order: 2,
  },
  {
    id: "fallback-ergonomiaohjaus",
    label: "Ergonomiaohjaus",
    template_text:
      "Ergonomiaohjaus: käytiin läpi työpisteen/arjen ergonomia ja annettiin kirjalliset kotiharjoitteet kuormituksen tasaamiseksi. ",
    sort_order: 3,
  },
];

export function DictationPanel() {
  // Stripe-maksumuuri (SaaS: 1kk ilmainen kokeilu, sitten 20 EUR/kk).
  // `isActive` on totuus vasta kun `/api/subscription-status` on ehtinyt
  // vastata (status !== "loading") — ennen sitä käyttöliittymä näyttää
  // neutraalin latautumistilan sen sijaan että väläyttäisi maksumuuria
  // ensin näkyviin virheellisesti.
  const {
    status: subscriptionStatus,
    isActive: hasActiveSubscription,
    isLoading: isSubscriptionLoading,
    isStartingCheckout,
    startCheckout,
    refresh: refreshSubscription,
  } = useSubscription();

  // Jos käyttäjä palaa Stripe Checkoutista onnistuneesti (success_url
  // sisältää `?checkout=success`), tarkistetaan tilaustilanne heti
  // uudelleen sen sijaan että odotettaisiin sivun seuraavaa lataamista —
  // webhookin (checkout.session.completed) pitäisi ehtiä päivittää
  // Supabase muutamassa sekunnissa.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      console.log(
        "[Kirjaajanne] Palattu Stripe Checkoutista onnistuneesti, tarkistetaan tilaustilanne uudelleen."
      );
      refreshSubscription();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTrialClick = async () => {
    try {
      await startCheckout();
    } catch {
      toast.error("Kokeilun aloitus epäonnistui", {
        description: "Yritä hetken kuluttua uudelleen.",
      });
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Dynaamiset sanelupohjat (Tehtävä 1, v2.2): haetaan Supabasesta
  // `/api/templates`-reitin kautta. Alkuarvo on paikallinen varajoukko,
  // jotta napit näkyvät heti eivätkä välähdä tyhjinä ennen ensimmäistä
  // fetch-vastausta.
  const [templates, setTemplates] = useState<DictationTemplate[]>(
    CLIENT_FALLBACK_TEMPLATES
  );
  const [isTemplateAdminOpen, setIsTemplateAdminOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    fetch("/api/templates")
      .then((response) => response.json())
      .then((data: { templates?: DictationTemplate[] }) => {
        if (isCancelled) return;
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
        }
      })
      .catch((fetchError) => {
        console.warn(
          "[Kirjaajanne] Sanelupohjien haku epäonnistui, käytetään paikallista varajoukkoa:",
          fetchError
        );
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Automaattitallennuksen tila-indikaattori (Tehtävä 3, v2.2): näytetään
  // pieni "Tallennetaan..." / "Tallennettu" -viesti aina kun jompikumpi
  // seuratuista kentistä (Vapaa sanelu tai Kanta-kirjaus) muuttuu.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Huom: `setSaveStatus`-kutsut on tarkoituksella ajoitettu `setTimeout`-
  // kutsujen sisään eikä kutsuta suoraan effektin rungossa, jotta
  // react-hooks/set-state-in-effect-sääntö ei laukea. Tämä on turvallista,
  // koska indikaattori on puhtaasti visuaalinen sivuvaikutus (synkronoi
  // Reactin tilan localStorage-kirjoituksen kanssa), ei renderöinnin aikana
  // tarvittavaa tietoa.
  const flashSaveStatus = () => {
    if (saveStatusTimeoutRef.current !== null) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
    saveStatusTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saving");
      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus("saved");
      }, 400);
    }, 0);
  };

  // Tekstikenttä on täysin irrotettu Vercel AI SDK:n `input`-tilasta, koska
  // `useCompletion` tyhjentää sen taustalla viiveellä heti kun striimaus
  // käynnistyy. `localText` on ainoa lähde Textarean sisällölle, ja
  // `complete()` kutsutaan aina suoraan sillä.
  //
  // Alkuarvo luetaan lazy-initializerillä suoraan localStoragesta (Tehtävä 3:
  // Automaattinen tallennus), jotta aiemmin kesken jäänyt sanelu palautuu heti
  // ensimmäisellä renderöinnillä sivun uudelleenlatauksen jälkeen.
  const [localText, setLocalText] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
    } catch (storageError) {
      console.warn(
        "[Kirjaajanne] Luonnoksen lukeminen localStoragesta epäonnistui:",
        storageError
      );
      return "";
    }
  });

  // Kanta-kirjauksen (valmiin, tekoälyn tuottaman tekstin) luonnos
  // palautetaan samalla periaatteella kuin "Vapaa sanelu" -kenttä, jotta
  // molemmat tekstikentät säilyvät vahingossa tapahtuneen sivunpäivityksen
  // yli (Tehtävä 3, v2.2).
  const initialCompletionDraft = (() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(COMPLETION_STORAGE_KEY) ?? "";
    } catch (storageError) {
      console.warn(
        "[Kirjaajanne] Kanta-kirjausluonnoksen lukeminen localStoragesta epäonnistui:",
        storageError
      );
      return "";
    }
  })();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tekstikentän ergonomia (Tehtävä 3, v2.1): Textarea kasvaa dynaamisesti
  // pystysuunnassa sisällön mukana, jotta pitkää tutkimusta ei tarvitse
  // scrollata pienen laatikon sisällä. Toteutettu ilman uutta riippuvuutta
  // (esim. react-textarea-autosize): korkeus nollataan "autoksi" ennen
  // mittausta, jotta selain laskee todellisen `scrollHeight`in myös silloin
  // kun tekstiä poistetaan, ja asetetaan sitten korkeudeksi sisällön vaatima
  // tila. `min-h-32`-luokka (Tailwind) toimii edelleen alarajana.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [localText]);

  // Tallennetaan "Vapaa sanelu" -tekstikentän sisältö selaimeen aina kun se
  // muuttuu, jotta kesken jäänyt sanelu ei katoa vahingossa (esim.
  // välilehden sulkeutuessa tai sivun päivittyessä). `flashSaveStatus()`
  // näyttää käyttäjälle lyhyen "Tallennetaan..." → "Tallennettu" -viestin
  // (Tehtävä 3, v2.2).
  useEffect(() => {
    try {
      if (localText) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, localText);
      } else {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      flashSaveStatus();
    } catch (storageError) {
      console.warn(
        "[Kirjaajanne] Luonnoksen tallentaminen localStorageen epäonnistui:",
        storageError
      );
    }
  }, [localText]);

  const {
    completion,
    setCompletion,
    complete,
    isLoading,
    error,
  } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
    // Kanta-kirjauksen luonnos palautetaan localStoragesta (Tehtävä 3,
    // v2.2), samaan tapaan kuin "Vapaa sanelu" -kenttä yllä.
    initialCompletion: initialCompletionDraft,
    onFinish: (_prompt, finishedCompletion) => {
      console.log(
        "[Kirjaajanne] API-kutsu onnistui, Kanta-kirjaus vastaanotettu:",
        finishedCompletion
      );
    },
    onError: (apiError) => {
      console.error("[Kirjaajanne] API-kutsu epäonnistui:", apiError);
    },
  });

  // Tallennetaan myös valmis Kanta-kirjaus selaimeen aina kun se muuttuu
  // (Tehtävä 3, v2.2). Näin sekä raaka sanelu että jo jäsennelty kirjaus
  // palautuvat automaattisesti, jos sivu latautuu vahingossa uudelleen
  // ennen kuin käyttäjä on ehtinyt kopioida tekstin talteen.
  useEffect(() => {
    try {
      if (completion) {
        window.localStorage.setItem(COMPLETION_STORAGE_KEY, completion);
      } else {
        window.localStorage.removeItem(COMPLETION_STORAGE_KEY);
      }
      flashSaveStatus();
    } catch (storageError) {
      console.warn(
        "[Kirjaajanne] Kanta-kirjausluonnoksen tallentaminen localStorageen epäonnistui:",
        storageError
      );
    }
  }, [completion]);

  // Siivotaan tallennusindikaattorin ajastin komponentin purkautuessa.
  useEffect(() => {
    return () => {
      if (saveStatusTimeoutRef.current !== null) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  // useAudioRecorder (oma, natiivi MediaRecorder-pohjainen hook): hoitaa
  // mikrofonin käytön, nauhoituksen ja palauttaa valmiin äänen
  // `recordingBlob`-kenttään kun `stopRecording` on kutsuttu.
  const { startRecording, stopRecording, isRecording, recordingTime, recordingBlob } =
    useAudioRecorder((exception) => {
      console.error("[Kirjaajanne] Mikrofonin käyttöoikeus evätty tai laitetta ei löytynyt:", exception);
      setMicError("Mikrofonin käyttöoikeutta ei myönnetty tai laitetta ei löytynyt.");
    });

  // ==========================================================================
  // SESSIO-TILA (Ambient Clinical Intelligence) — Tehtävät 1–4.
  //
  // Erillinen toiminto "Vapaa sanelu" -napista: mahdollistaa koko 45–60
  // minuutin terapiaistunnon jatkuvan nauhoittamisen, taustalitteroinnin ja
  // lopuksi älykkään Kanta-jäsennyksen koko istunnon raakatekstistä.
  // ==========================================================================

  // Raaka, jatkuvasti kasvava sessiotranskripti (Tehtävä 2). `useRef` pitää
  // aina tuoreimman arvon suljinten sisällä (esim. jonon käsittelijässä),
  // `useState`-peili puolestaan pakottaa UI:n päivittymään aina kun teksti
  // kasvaa, jotta rullaava loki näkyy käyttäjälle reaaliajassa.
  // Palautetaan kesken jäänyt sessiotranskripti localStoragesta heti
  // ensimmäisellä renderöinnillä lazy-initializerillä (Tehtävä 4: selaimen
  // kaatumisen/päivityksen varalta) — sama periaate kuin `localText`- ja
  // `completion`-luonnoksilla yllä. Lazy-initializer (eikä `useEffect`)
  // valittiin tarkoituksella, jotta setState ei tapahdu efektin sisällä.
  const initialSessionTranscript = (() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(SESSION_TRANSCRIPT_STORAGE_KEY) ?? "";
    } catch (storageError) {
      console.warn(
        "[Kirjaajanne] Sessio-transkriptin lukeminen localStoragesta epäonnistui:",
        storageError
      );
      return "";
    }
  })();

  const sessionTranscriptRef = useRef(initialSessionTranscript);
  const [sessionTranscript, setSessionTranscript] = useState(
    initialSessionTranscript
  );
  const [isSessionOpen, setIsSessionOpen] = useState(
    initialSessionTranscript.length > 0
  );
  const [isAnalyzingSession, setIsAnalyzingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  // Näyttää käyttäjälle kuinka monta audiosegmenttiä on parhaillaan matkalla
  // /api/transcribe-reitille, jotta "Sessio käynnissä"-indikaattori kertoo
  // aidosti litteroinnin tilan eikä vain mikrofonin tilan.
  const [pendingSegmentCount, setPendingSegmentCount] = useState(0);
  const sessionLogEndRef = useRef<HTMLDivElement>(null);

  // Rullaa sessio-lokin aina alimpaan riviin uuden litteroinnin saapuessa.
  useEffect(() => {
    sessionLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionTranscript]);

  // Yksi audiosegmentti litteroidaan ja lisätään sessiotranskriptiin.
  // Segmentit lähetetään peräkkäin FIFO-järjestyksessä (ei rinnakkain),
  // jotta puheen kronologia säilyy litteroinnissa oikeana, mutta itse
  // lähetys tapahtuu aina taustalla — mikrofoni ja seuraavan segmentin
  // tallennus jatkuvat normaalisti tämän odottaessa vastausta.
  const transcriptionQueueRef = useRef<Promise<void>>(Promise.resolve());

  const appendSessionSegment = useCallback((text: string) => {
    if (!text) return;
    const next = sessionTranscriptRef.current
      ? `${sessionTranscriptRef.current} ${text}`
      : text;
    sessionTranscriptRef.current = next;
    setSessionTranscript(next);

    try {
      window.localStorage.setItem(SESSION_TRANSCRIPT_STORAGE_KEY, next);
    } catch (storageError) {
      console.warn(
        "[Kirjaajanne] Sessio-transkriptin tallentaminen localStorageen epäonnistui:",
        storageError
      );
    }
  }, []);

  const transcribeSegment = useCallback(
    (blob: Blob) => {
      setPendingSegmentCount((prev) => prev + 1);

      const task = async () => {
        try {
          console.log(
            "[Kirjaajanne] Sessio: lähetetään audiosegmentti /api/transcribe-reitille...",
            { size: blob.size, type: blob.type }
          );

          const formData = new FormData();
          formData.append("audio", blob, "sessio-segmentti.webm");

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorBody = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(
              errorBody?.error ||
                `Segmentin litterointi epäonnistui (tila ${response.status}).`
            );
          }

          const data = (await response.json()) as { text?: string };
          const segmentText = data.text?.trim();

          if (segmentText) {
            appendSessionSegment(segmentText);
          }
        } catch (segmentError) {
          // Yhden segmentin litterointivirhe ei saa katkaista koko sessiota
          // — nauhoitus ja seuraavat segmentit jatkuvat normaalisti.
          // Käyttäjälle näytetään kuitenkin huomautus.
          const message =
            segmentError instanceof Error
              ? segmentError.message
              : "Tuntematon virhe segmentin litteroinnissa.";
          console.error(
            "[Kirjaajanne] Sessio-segmentin litterointi epäonnistui:",
            segmentError
          );
          setSessionError(message);
        } finally {
          setPendingSegmentCount((prev) => Math.max(0, prev - 1));
        }
      };

      // Ketjutetaan tämän segmentin käsittely edellisen perään (FIFO-jono),
      // jotta selain ei koskaan yritä ampua kymmeniä rinnakkaisia
      // /api/transcribe-pyyntöjä pitkän session aikana.
      transcriptionQueueRef.current = transcriptionQueueRef.current.then(task);
    },
    [appendSessionSegment]
  );

  const { startSession, stopSession, isSessionActive, sessionSeconds } =
    useSessionRecorder({
      onSegment: transcribeSegment,
      onError: (exception) => {
        console.error(
          "[Kirjaajanne] Sessio-nauhoituksen mikrofonivirhe:",
          exception
        );
        setSessionError(
          "Mikrofonin käyttöoikeutta ei myönnetty tai laitetta ei löytynyt."
        );
      },
    });

  const handleStartSession = () => {
    setSessionError(null);
    setIsSessionOpen(true);
    console.log(
      "[Kirjaajanne] Sessio-nauhoitus aloitetaan (Ambient Clinical Intelligence)."
    );
    startSession();
  };

  const handleClearSession = () => {
    sessionTranscriptRef.current = "";
    setSessionTranscript("");
    setCompletion("");
    setSessionError(null);
    try {
      window.localStorage.removeItem(SESSION_TRANSCRIPT_STORAGE_KEY);
    } catch (storageError) {
      console.warn(
        "[Kirjaajanne] Sessio-transkriptin poistaminen localStoragesta epäonnistui:",
        storageError
      );
    }
  };

  // "Päätä sessio ja luo kirjaus" (Tehtävä 3): pysäyttää nauhoituksen,
  // odottaa että kaikki jonossa olevat segmentit (mukaan lukien viimeinen)
  // on litteroitu, ja lähettää sitten koko kertyneen raakatekstin uudelle
  // /api/analyze-session-reitille tiukkaa Kanta-jäsennystä varten.
  const handleFinishSession = async () => {
    setSessionError(null);

    if (isSessionActive) {
      console.log(
        "[Kirjaajanne] Sessio päätetään, odotetaan viimeistä audiosegmenttiä..."
      );
      await stopSession();
    }

    // Odotetaan koko litterointijonon tyhjentymistä, jotta kaikki segmentit
    // (myös viimeinen) ehtivät varmasti sessionTranscriptiin ennen analyysiä.
    await transcriptionQueueRef.current;

    const finalTranscript = sessionTranscriptRef.current.trim();
    if (!finalTranscript) {
      setSessionError("Sessiosta ei kertynyt litteroitua tekstiä.");
      return;
    }

    setIsAnalyzingSession(true);
    try {
      console.log(
        `[Kirjaajanne] Lähetetään koko sessiotranskripti (${finalTranscript.length} merkkiä) ` +
          "/api/analyze-session-reitille Kanta-jäsennystä varten."
      );

      const response = await fetch("/api/analyze-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          errorBody?.error ||
            `Session Kanta-jäsennys epäonnistui (tila ${response.status}).`
        );
      }

      const data = (await response.json()) as { text?: string };
      const kantaText = data.text?.trim();

      if (!kantaText) {
        throw new Error("Kanta-jäsennys ei palauttanut tekstiä.");
      }

      // Asetetaan valmis Kanta-rakenne samaan `completion`-tilaan jota
      // "Vapaa sanelu" -toiminto käyttää, jotta olemassa oleva esikatselu-
      // ja "Kopioi ja Tyhjennä" -UI toimii sellaisenaan myös sessiolle.
      // `isOpen` avataan, jotta tämä valmis tekstikenttä tulee heti näkyviin.
      setCompletion(kantaText);
      setIsOpen(true);
      toast.success("Sessio päätetty — Kanta-kirjaus muodostettu.", {
        description: "Tarkista jäsennelty kirjaus alta ennen kopiointia.",
      });
    } catch (analyzeError) {
      const message =
        analyzeError instanceof Error
          ? analyzeError.message
          : "Tuntematon virhe session analysoinnissa.";
      console.error(
        "[Kirjaajanne] Session Kanta-jäsennys epäonnistui:",
        analyzeError
      );
      setSessionError(message);
    } finally {
      setIsAnalyzingSession(false);
    }
  };

  const handleMicClick = () => {
    setIsOpen((prev) => !prev);
  };

  const handleRecorderButtonClick = () => {
    if (isRecording) {
      console.log("[Kirjaajanne] Nauhoitus lopetetaan käyttäjän pyynnöstä.");
      stopRecording();
      return;
    }
    setMicError(null);
    setIsOpen(true);
    console.log("[Kirjaajanne] Aloitetaan äänen nauhoitus mikrofonilla.");
    startRecording();
  };

  // Kun nauhoitus päättyy, useAudioRecorder täyttää `recordingBlob`-
  // kentän. Lähetetään Blob tässä /api/transcribe-reitille Whisper-litterointia
  // varten, ja syötetään palautunut teksti automaattisesti samaan
  // `complete`-funktioon, joka jo tuottaa Kanta-kirjauksen striimattuna.
  useEffect(() => {
    if (!recordingBlob) return;

    const transcribeAndComplete = async (blob: Blob) => {
      setIsTranscribing(true);
      setMicError(null);
      console.log(
        "[Kirjaajanne] Nauhoitus valmis, lähetetään audio-Blob /api/transcribe-reitille...",
        { size: blob.size, type: blob.type }
      );

      try {
        const formData = new FormData();
        formData.append("audio", blob, "sanelu.webm");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as {
            error?: string;
            details?: unknown;
          } | null;

          if (errorBody?.details) {
            console.error(
              "[Kirjaajanne] /api/transcribe palautti virheen yksityiskohdat:",
              errorBody.details
            );
          }

          throw new Error(
            errorBody?.error ||
              `Litterointipyyntö epäonnistui (tila ${response.status}).`
          );
        }

        const data = (await response.json()) as { text?: string };
        const transcribedText = data.text?.trim();

        if (!transcribedText) {
          throw new Error("Whisper ei palauttanut litteroitua tekstiä.");
        }

        console.log(
          "[Kirjaajanne] Whisper-litterointi onnistui, syötetään teksti Kanta-kirjaus-funktioon:",
          transcribedText
        );
        setLocalText(transcribedText);
        await complete(transcribedText);
      } catch (transcribeError) {
        const message =
          transcribeError instanceof Error
            ? transcribeError.message
            : "Tuntematon virhe äänen litteroinnissa.";
        console.error("[Kirjaajanne] Äänen litterointi epäonnistui:", transcribeError);
        setMicError(message);
      } finally {
        setIsTranscribing(false);
      }
    };

    void transcribeAndComplete(recordingBlob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingBlob]);

  // `localText` on ainoa totuudenlähde tekstikentälle, joten `complete()`
  // kutsutaan suoraan sillä eikä SDK:n `input`-tilalla tarvitse enää
  // ohittaa tyhjenemistä setTimeoutilla.
  //
  // Eriytetty omaksi funktiokseen (Tehtävä 2: Power User -pikanäppäimet),
  // jotta sama liipaisulogiikka on käytössä sekä lomakkeen submit-
  // tapahtumassa että Ctrl/Cmd+Enter-pikanäppäimessä.
  const triggerCompletion = () => {
    if (isLoading || isTranscribing) return;
    if (localText.trim().length === 0) {
      console.warn("[Kirjaajanne] Sanelu on tyhjä, API-kutsua ei lähetetä.");
      return;
    }

    console.log("[Kirjaajanne] Lähetetään sanelu Kanta-kirjausta varten:", localText);
    void complete(localText);
  };

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    triggerCompletion();
  };

  // Power user -pikanäppäin (Tehtävä 2): Ctrl+Enter (Windows/Linux) tai
  // Cmd+Enter (Mac) liipaisee "Muodosta Kanta-kirjaus" -toiminnon suoraan
  // tekstikentästä ilman että käyttäjän tarvitsee tarttua hiireen.
  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isSubmitShortcut = (event.ctrlKey || event.metaKey) && event.key === "Enter";
    if (!isSubmitShortcut) return;

    event.preventDefault();
    triggerCompletion();
  };

  const handleCopyAndClear = async () => {
    if (!completion) return;
    try {
      // Leikepöydälle viedään aina puhdas Plain Text -versio (Tehtävä 1),
      // vaikka `completion`-tila itsessään pysyy Markdown-muotoiltuna
      // yllä olevaa visuaalista esikatselua varten.
      const plainTextForClipboard = stripMarkdownForClipboard(completion);
      await navigator.clipboard.writeText(plainTextForClipboard);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      // Nämä tyhjentävät ruudun vasta kun olet aidosti kopioinut tekstin
      setCompletion("");
      setLocalText("");
      toast.success("Kanta-kirjaus kopioitu leikepöydälle", {
        description: "Voit nyt liittää sen potilastietojärjestelmään.",
      });
    } catch (clipboardError) {
      console.error(
        "[Kirjaajanne] Tekstin kopiointi leikepöydälle epäonnistui:",
        clipboardError
      );
      toast.error("Kopiointi epäonnistui", {
        description: "Leikepöydälle kirjoittaminen ei onnistunut. Yritä uudelleen.",
      });
    }
  };

  // Pikamallineen lisäys (Tehtävä 3): kirjoittaa valmiin tekstirungon
  // kursorin nykyiseen kohtaan Textareassa, jotta käyttäjä voi jatkaa
  // täydentämistä siitä. Jos kursorin sijaintia ei jostain syystä saada
  // selville (esim. ref ei vielä ole kiinnittynyt), teksti lisätään loppuun.
  const handleQuickInsert = (template: string) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      setLocalText((prev) => `${prev}${template}`);
      return;
    }

    const selectionStart = textarea.selectionStart ?? localText.length;
    const selectionEnd = textarea.selectionEnd ?? localText.length;
    const nextValue =
      localText.slice(0, selectionStart) +
      template +
      localText.slice(selectionEnd);

    setLocalText(nextValue);

    // Siirretään kursori lisätyn tekstin loppuun ja palautetaan fokus
    // Textareaan seuraavalla renderöintikierroksella (arvo on siihen mennessä
    // päivittynyt DOM:iin).
    requestAnimationFrame(() => {
      const caretPosition = selectionStart + template.length;
      textarea.focus();
      textarea.setSelectionRange(caretPosition, caretPosition);
    });
  };

  // ==========================================================================
  // STRIPE-MAKSUMUURI (SaaS: 1kk ilmainen kokeilu, sitten 20 EUR/kk).
  //
  // Jos tilaustilanne on vielä latautumassa, näytetään neutraali
  // latautumistila. Jos tilaus ei ole aktiivinen (trialing/active), koko
  // sanelutoiminto (sekä "Vapaa sanelu" että "Sessio-nauhoitus") estetään
  // kokonaan ja tilalle näytetään "Aloita 30 pv ilmainen kokeilu" -painike,
  // joka ohjaa Stripe Checkoutiin.
  // ==========================================================================
  if (isSubscriptionLoading) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 sm:h-32 sm:w-32">
          <Loader2 className="size-10 animate-spin text-primary/40 sm:size-12" />
        </div>
        <span className="text-sm text-muted-foreground">
          Tarkistetaan tilaustilannetta...
        </span>
      </div>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <CardTitle className="text-xl">
            {subscriptionStatus === "past_due" || subscriptionStatus === "canceled"
              ? "Tilauksesi ei ole aktiivinen"
              : "Kokeile Kirjaajannetta ilmaiseksi"}
          </CardTitle>
          <CardDescription>
            {subscriptionStatus === "past_due"
              ? "Viimeisin veloitus epäonnistui. Päivitä maksutietosi jatkaaksesi sanelun käyttöä."
              : subscriptionStatus === "canceled"
                ? "Tilauksesi on päättynyt. Aloita uusi tilaus jatkaaksesi sanelun käyttöä."
                : "30 päivän ilmainen kokeilu, ei sitoumuksia. Kokeilun jälkeen 20 €/kk. Peruuta koska tahansa."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={handleStartTrialClick}
            disabled={isStartingCheckout}
            className="w-full gap-2"
          >
            {isStartingCheckout ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isStartingCheckout
              ? "Ohjataan maksusivulle..."
              : subscriptionStatus === "past_due" || subscriptionStatus === "canceled"
                ? "Jatka tilausta"
                : "Aloita 30 pv ilmainen kokeilu"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Turvallinen maksu Stripen kautta. Ei veloitusta ennen kokeilun päättymistä.
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
        <Sparkles className="size-3.5" />
        <span>🎁 Vapaa testikäyttö – Maksutietoja ei tarvita!</span>
      </div>
      <div className="relative">
        {isRecording && (
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
        )}
        <Button
          size="lg"
          onClick={handleRecorderButtonClick}
          disabled={isTranscribing}
          className={cn(
            "relative h-24 w-24 rounded-full p-0 shadow-lg transition-transform hover:scale-105 sm:h-32 sm:w-32",
            isRecording
              ? "bg-destructive text-destructive-foreground shadow-destructive/30 hover:bg-destructive/90"
              : "shadow-primary/20"
          )}
          aria-label={isRecording ? "Lopeta nauhoitus" : "Aloita sanelun nauhoitus"}
          aria-pressed={isRecording}
        >
          {isTranscribing ? (
            <Loader2 className="size-10 animate-spin sm:size-12" />
          ) : isRecording ? (
            <Square className="size-10 sm:size-12" fill="currentColor" />
          ) : (
            <Mic className="size-10 sm:size-12" />
          )}
        </Button>
      </div>
      <span className="text-base font-semibold tracking-wide text-primary sm:text-lg">
        {isTranscribing
          ? "Litteroidaan puhetta..."
          : isRecording
            ? `Nauhoitetaan... ${formatRecordingTime(recordingTime)}`
            : "Sanele tästä"}
      </span>
      <span className="text-sm text-muted-foreground">
        {isRecording
          ? "Paina uudelleen lopettaaksesi nauhoituksen."
          : "Paina ja aloita sanelu – ei asennuksia, ei viivettä."}
      </span>

      {micError && (
        <div className="flex w-full max-w-2xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={handleMicClick}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Tai kirjoita sanelu käsin
        </button>
      )}

      {/* ==================================================================
          SESSIO-TILA (Ambient Clinical Intelligence) — Tehtävä 1.
          Erillinen, koko istunnon (45–60 min) jatkuvaan taustanauhoitukseen
          tarkoitettu toiminto, selkeästi erillään yllä olevasta lyhyestä
          "Vapaa sanelu" -mikrofonipainikkeesta.
          ================================================================== */}
      <div className="mt-2 flex w-full max-w-2xl flex-col items-center gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant={isSessionActive ? "destructive" : "outline"}
          size="lg"
          onClick={isSessionActive ? undefined : handleStartSession}
          disabled={isSessionActive || isRecording || isTranscribing}
          className="gap-2"
        >
          {isSessionActive ? (
            <Radio className="size-4 animate-pulse" />
          ) : (
            <Radio className="size-4" />
          )}
          {isSessionActive ? "Sessio käynnissä" : "Aloita Sessio-nauhoitus"}
        </Button>
        <span className="text-center text-xs text-muted-foreground">
          Koko vastaanoton (n. 45–60 min) jatkuva nauhoitus ja taustalitterointi.
        </span>
      </div>

      {isSessionActive && (
        <div className="flex w-full max-w-2xl items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          Sessio käynnissä: Kuuntelee ja litteroi... ({formatSessionTime(sessionSeconds)})
          {pendingSegmentCount > 0 && (
            <span className="text-xs font-normal text-primary/70">
              (litteroi {pendingSegmentCount} segmenttiä…)
            </span>
          )}
        </div>
      )}

      {sessionError && (
        <div className="flex w-full max-w-2xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{sessionError}</span>
        </div>
      )}

      {isSessionOpen && (
        <Card className="mt-2 w-full max-w-2xl text-left">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="size-4 text-primary" />
                Sessio-transkripti (raakanauhoitus)
              </CardTitle>
              <CardDescription>
                Koko istunnon raaka, jatkuvasti kasvava litterointi. Paina
                &quot;Päätä sessio ja luo kirjaus&quot;, kun vastaanotto on
                ohi, niin tekoäly suodattaa small talkin pois ja jäsentää
                jäljelle jäävät kliiniset löydökset Kanta-otsikoiden alle.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsSessionOpen(false)}
              aria-label="Piilota sessio-paneeli"
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3">
              {sessionTranscript ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {sessionTranscript}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Litteroitu teksti ilmestyy tähän n. 30 sekunnin välein
                  nauhoituksen aikana.
                </p>
              )}
              <div ref={sessionLogEndRef} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleFinishSession}
                disabled={
                  isAnalyzingSession ||
                  (!isSessionActive && sessionTranscript.trim().length === 0)
                }
                className="flex-1 gap-1.5"
              >
                {isAnalyzingSession ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                {isAnalyzingSession
                  ? "Jäsennetään Kanta-kirjaukseksi..."
                  : "Päätä sessio ja luo kirjaus"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleClearSession}
                disabled={isSessionActive || isAnalyzingSession}
                aria-label="Tyhjennä sessio-transkripti"
                title="Tyhjennä sessio-transkripti"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOpen && (
        <Card className="mt-4 w-full max-w-2xl text-left">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Vapaa sanelu</CardTitle>
              <CardDescription>
                Sanele mikrofonilla tai kirjoita/liitä teksti alle. Tekoäly
                jäsentää sen Kanta-yhteensopivaksi kirjaukseksi.
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsTemplateAdminOpen(true)}
                aria-label="Hallitse sanelupohjia"
                title="Hallitse sanelupohjia"
              >
                <Settings className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsOpen(false)}
                aria-label="Piilota sanelupaneeli"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={onFormSubmit} className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {templates.map((quickInsert) => (
                  <Button
                    key={quickInsert.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading || isTranscribing}
                    onClick={() => handleQuickInsert(quickInsert.template_text)}
                  >
                    {quickInsert.label}
                  </Button>
                ))}
              </div>
              <Textarea
                ref={textareaRef}
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Esim. Potilas kertoo alaselän kivusta, joka on jatkunut kaksi viikkoa nostotilanteen jälkeen..."
                className="min-h-32 resize-none overflow-hidden"
                disabled={isLoading || isTranscribing}
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Vinkki: Ctrl+Enter (Windows) / Cmd+Enter (Mac) muodostaa kirjauksen suoraan tekstikentästä.
                  </span>
                  <Button
                    type="submit"
                    disabled={isLoading || isTranscribing || localText.trim().length === 0}
                    className="shrink-0 gap-1.5"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {isLoading ? "Kirjataan..." : "Muodosta Kanta-kirjaus"}
                  </Button>
                </div>
                {/* Automaattitallennuksen tila-indikaattori (Tehtävä 3, v2.2) */}
                {saveStatus !== "idle" && (
                  <span className="text-xs text-muted-foreground/70">
                    {saveStatus === "saving" ? "Tallennetaan…" : "Tallennettu"}
                  </span>
                )}
              </div>
            </form>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Kirjauksen muodostaminen epäonnistui: {error.message}
                </span>
              </div>
            )}

            {completion && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="size-4 text-primary" />
                  Kanta-kirjaus
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {completion}
                </pre>
              </div>
            )}

            {completion && (
              <Button
                onClick={handleCopyAndClear}
                className={`w-full mt-2 font-bold text-lg py-6 transition-all ${
                  isCopied ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {isCopied ? "Kopioitu potilastietojärjestelmään!" : "Kopioi ja Tyhjennä (Ctrl+C)"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <TemplateAdminDialog
        open={isTemplateAdminOpen}
        onOpenChange={setIsTemplateAdminOpen}
        onTemplateCreated={(newTemplate) =>
          setTemplates((prev) => [...prev, newTemplate])
        }
      />
    </div>
  );
}

