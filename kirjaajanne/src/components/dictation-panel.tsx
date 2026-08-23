"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useCompletion } from "@ai-sdk/react";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import {
  AlertCircle,
  FileText,
  Loader2,
  Mic,
  Send,
  Square,
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

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

// Selaimen localStorage-avain sanelu-luonnoksen automaattitallennukselle
// (Tehtävä 2: Automaattinen tallennus).
const DRAFT_STORAGE_KEY = "kirjaajanne:sanelu-luonnos";

// Pikamallineet (Tehtävä 3): valmiit tekstirungot, jotka lisätään kursorin
// kohdalle Textareaan ja joita käyttäjä voi täydentää.
const QUICK_INSERT_TEMPLATES: { label: string; template: string }[] = [
  {
    label: "TMD-tutkimus",
    template:
      "TMD-tutkimus: mandibulan liikelaajuudet mitattu (depressio/elevaatio/protraktio/retraktio), palpaatioarkuus m. masseter ja m. temporalis, niveläänet ja mahdollinen deviaatio avattaessa. ",
  },
  {
    label: "Manuaaliterapia",
    template:
      "Manuaaliterapia: pehmytkudoskäsittely ja nivelmobilisointi kohdealueelle. Hoidon jälkeen liikelaajuus ja kipu koettu subjektiivisesti parantuneeksi. ",
  },
  {
    label: "Ergonomiaohjaus",
    template:
      "Ergonomiaohjaus: käytiin läpi työpisteen/arjen ergonomia ja annettiin kirjalliset kotiharjoitteet kuormituksen tasaamiseksi. ",
  },
];

export function DictationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Tekstikenttä on täysin irrotettu Vercel AI SDK:n `input`-tilasta, koska
  // `useCompletion` tyhjentää sen taustalla viiveellä heti kun striimaus
  // käynnistyy. `localText` on ainoa lähde Textarean sisällölle, ja
  // `complete()` kutsutaan aina suoraan sillä.
  //
  // Alkuarvo luetaan lazy-initializerillä suoraan localStoragesta (Tehtävä 2:
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

  // Tallennetaan tekstikentän sisältö selaimeen aina kun se muuttuu, jotta
  // kesken jäänyt sanelu ei katoa vahingossa (esim. välilehden sulkeutuessa
  // tai sivun päivittyessä).
  useEffect(() => {
    try {
      if (localText) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, localText);
      } else {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
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

  // useAudioRecorder (oma, natiivi MediaRecorder-pohjainen hook): hoitaa
  // mikrofonin käytön, nauhoituksen ja palauttaa valmiin äänen
  // `recordingBlob`-kenttään kun `stopRecording` on kutsuttu.
  const { startRecording, stopRecording, isRecording, recordingTime, recordingBlob } =
    useAudioRecorder((exception) => {
      console.error("[Kirjaajanne] Mikrofonin käyttöoikeus evätty tai laitetta ei löytynyt:", exception);
      setMicError("Mikrofonin käyttöoikeutta ei myönnetty tai laitetta ei löytynyt.");
    });

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

  return (
    <div className="flex w-full flex-col items-center gap-4">
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Piilota sanelupaneeli"
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={onFormSubmit} className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_INSERT_TEMPLATES.map((quickInsert) => (
                  <Button
                    key={quickInsert.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading || isTranscribing}
                    onClick={() => handleQuickInsert(quickInsert.template)}
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
    </div>
  );
}

