/**
 * Custom Vocabulary Store & Helper (The Double-Barrel STT Architecture)
 * Tallentaa käyttäjän oman STT-korjaussanakirjan selaimen localStorageen
 * ja tarjoaa metodit sanaston syöttämiseen Whisper STT -promptiin ja LLM:lle.
 */

export interface VocabularyEntry {
  id: string;
  wrongWord: string;
  correctWord: string;
  createdAt: string;
}

const STORAGE_KEY = "kirjaajanne:custom-vocabulary";

export function getCustomVocabulary(): VocabularyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VocabularyEntry[];
  } catch (err) {
    console.warn("[Kirjaajanne] Mukautetun sanakirjan lukeminen epäonnistui:", err);
    return [];
  }
}

export function saveCustomVocabulary(entries: VocabularyEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn("[Kirjaajanne] Mukautetun sanakirjan tallennus epäonnistui:", err);
  }
}

export function addVocabularyEntry(correctWord: string, wrongWord: string = ""): VocabularyEntry[] {
  const current = getCustomVocabulary();
  const trimmedCorrect = correctWord.trim();
  const trimmedWrong = wrongWord.trim();

  if (!trimmedCorrect) return current;

  // Poistetaan mahdolliset aiemmat samanlaiset merkinnät tuplien välttämiseksi
  const filtered = current.filter(
    (item) => item.correctWord.toLowerCase() !== trimmedCorrect.toLowerCase()
  );

  const newEntry: VocabularyEntry = {
    id: `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    wrongWord: trimmedWrong,
    correctWord: trimmedCorrect,
    createdAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...filtered];
  saveCustomVocabulary(updated);
  return updated;
}

export function removeVocabularyEntry(id: string): VocabularyEntry[] {
  const current = getCustomVocabulary();
  const updated = current.filter((item) => item.id !== id);
  saveCustomVocabulary(updated);
  return updated;
}

export function clearCustomVocabulary(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[Kirjaajanne] Sanakirjan tyhjennys epäonnistui:", err);
  }
}

/**
 * Muodostaa Whisper STT prompt -määritteen (max ~50 sanaa/termiä),
 * joka ohjaa Whisper-mallia kuulemaan ammattitermit oikein.
 */
export function getWhisperPromptTerms(limit = 50): string {
  const entries = getCustomVocabulary();
  const terms = entries
    .map((e) => e.correctWord.trim())
    .filter(Boolean)
    .slice(0, limit);

  return terms.join(", ");
}

/**
 * Muodostaa LLM:lle syötettävän JSON-muotoisen sanakirjan
 * (Väärin kuultu sana -> Oikea ammattitermi).
 */
export function getLLMVocabularyMapping(): { wrong: string; correct: string }[] {
  const entries = getCustomVocabulary();
  return entries
    .filter((e) => e.correctWord)
    .map((e) => ({
      wrong: e.wrongWord || "N/A",
      correct: e.correctWord,
    }));
}
