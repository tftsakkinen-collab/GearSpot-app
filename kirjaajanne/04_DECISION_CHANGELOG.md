# 04_DECISION_CHANGELOG.md (Kirjaajanne — paikallinen kopio)

Tämä on paikallinen (`kirjaajanne`-repo) kopio Kirjaajannetta koskevista päätöslokimerkinnöistä. Kanoninen, kaikkien projektien yhteinen loki ylläpidetään Google Drivessa (`G:\My Drive\AI - automaatiot\04_DECISION_CHANGELOG.md`, ks. `03_DEV_AND_SYSTEMS.md` / `config/rules.md`, kohta 2). Uusin merkintä ylimpänä.

## 2026-08-24 — Bugiraportointijärjestelmän Apps Script -backend (Trello / Notion webhook-silta)

**Uudet komponentit / tiedostot:**
- `google-apps-script/Code.gs` (Google Apps Script Web App -toteutus)

**Yhteenveto:**
- Rakennettiin Google Apps Script -backend (`doPost(e)`), joka toimii turvallisena webhook-siltana tulevan frontend-sovelluksen ja Kanban-taulun (tuki sekä Trello että Notion) välillä.
- **Payload-tuki:** Vastaanottaa `userText` (ongelmakuvaus), `deviceInfo` (OS, sovellusversio, laitemalli) ja `actionLogs` (käyttöliittymä- / virhelokit).
- **Turvallisuus & Avaintenhallinta:** API-avaimet ja lista-ID:t haetaan dynamic-muodossa `PropertiesService.getScriptProperties()` -rajapinnasta (ei kovakoodattuja avaimia koodissa).
- **Tikkettien muotoilu:** Generoi tiketin otsikkoon sovellusversion ja lyhyen otteen käyttäjän ongelmakuvauksesta. Tiketin leipätekstiin muotoillaan laitetiedot, aikaleima ja lokimerkinnät selkeinä Markdown-lohkoina.
- **Vastaukset & Virheenkäsittely:** Palauttaa JSON-vastauksen (`ContentService.MimeType.JSON`) HTTP 200/400/500 -tiloilla ja virhelokittaa mahdolliset HTTP-pyyntövirheet.

## 2026-08-24 — Session-based (Istuntopohjainen) saneluarkkitehtuuri, STT-palautesilmukka ja päivitetty System Prompt

**Uudet ja muutetut tiedostot:**
- `src/components/dictation-panel.tsx` (Istuntopohjainen käyttöliittymä, kertyvä sanelupuskuri, 🚩 STT-virheraportointimodaali)
- `src/components/stt-error-modal.tsx` (Uusi komponentti: "Minkä sanan tekoäly ymmärsi väärin?" STT-sanakirjan pohjustukseen)
- `src/app/api/chat/route.ts` & `src/app/api/analyze-session/route.ts` (Päivitetty ammattimainen, empaattinen ja potilaan preferenssit säilyttävä System Prompt)

**Yhteenveto:**
- **Session State:** Siirrytty yksittäisistä "Single-shot" -saneluista jatkuvaan "Session-based" -malliin. Terapeutti voi sanella useita pätkiä (esim. tutkimus, hoito, tulokset) yhden vastaanoton aikana. Pätkät kertyvät yhtenäiseen muokattavaan puskuriin ilman yksittäisten osien poisto-/kopiointipainikkeita.
- **Ensisijainen toiminto:** Lisätty "Päätä vastaanotto ja generoi kirjaus" -painike, joka lähettää kertyneen vastaanottopuskurin kielimallille Kanta-jäsennystä varten.
- **STT-virheraportointi (🚩):** Tekstiosioiden yhteyteen lisätty 🚩-ikoni ja korjausmodaali ('Väärä sana' -> 'Oikea sana'), joka lähettää virhetiedot webhookiin (`NEXT_PUBLIC_BUG_WEBHOOK_URL`) käyttäjäkohtaisen STT-sanakirjan kehitystä varten.
- **System Prompt:** Päivitetty LLM-ohjeistus:
  1. Fysioterapian kokenut ammattilainen & kirjuri -rooli.
  2. Ammattimainen, Kanta-yhteensopiva mutta persoonallinen ja empaattinen sävy.
  3. Kriittinen sääntö potilaan henkilökohtaisten preferenssien (esim. musiikki, mieltymykset) säilyttämisestä ja muotoilusta osaksi hoito-ohjeita tai huomioita.

## 2026-08-24 — Kaksivaiheinen itseoppiva STT-korjausmekanismi (The Double-Barrel STT Architecture)

**Uudet ja muutetut tiedostot:**
- `src/lib/custom-vocabulary.ts` (Sanakirjan tilanhallinta ja localStorage-pysyvyys: `CustomVocabulary`)
- `src/components/vocabulary-manager-dialog.tsx` (Uusi "Oma Sanakirja" hallintanäkymä asetuksiin)
- `src/components/stt-error-modal.tsx` (Automaattitallennus `addVocabularyEntry` -metodilla)
- `src/app/api/transcribe/route.ts` (Whisper Prompt Injection: syöttää 50 viimeisintä `correctWord`-termiä Whisperin `prompt`-parametriin)
- `src/app/api/chat/route.ts` & `src/app/api/analyze-session/route.ts` (LLM Post-Processing: syöttää sanakirjan dynaamisesti Gemini-järjestelmäpromptiin automaattikorjausta varten)
- `src/components/dictation-panel.tsx` (Kytketty Whisper & LLM vocabulary injection sekä 📖 "Oma sanakirja" -nappi)

**Yhteenveto:**
- **Aktiivinen korjaus (Whisper Injection):** Syöttää käyttäjän tallentamat anatomian/manuaaliterapian termit Whisper STT -pyynnön `prompt`-parametriin biasoidakseen mallin kuuloalueen oikeisiin ammattitermeihin.
- **Passiivinen turvaverkko (LLM Post-Processing):** Syöttää sanaparit JSON-muodossa Gemini-kielimallille, joka korjaa tekstistä mahdolliset puheentunnistusvirheet Kanta-kirjauksen generoinnin aikana.
- **Käyttäjän sanakirja & UI:** Käyttäjä voi hallinnoida sanaparia 📖 "Oma sanakirja" -dialogista ja kasvattaa sanakirjaa automaattisesti 🚩 "Raportoi STT-virhe" -modaalin kautta.

---

## 2026-08-23 — Stripe-maksuintegraatio (SaaS: 1kk ilmainen kokeilu, sitten 20 EUR/kk)

**Uudet tiedostot:**
- `supabase/migrations/20260825_create_profiles_subscriptions.sql`
- `src/lib/stripe.ts`, `src/lib/device-id.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/subscription-status/route.ts`
- `src/hooks/use-subscription.ts`

**Muutetut tiedostot:** `src/components/dictation-panel.tsx`, `.env.local`, `package.json` (`stripe@22.5.0`, `@stripe/stripe-js@9.14.0`).

**Yhteenveto:** Täysi Stripe Checkout -integraatio. `/api/checkout` luo Checkout-session pakotetulla `subscription_data.trial_period_days: 30`. `/api/webhooks/stripe` kuuntelee `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed` ja päivittää uuden `profiles`-taulun `service_role`-avaimella allekirjoituksen tarkistuksen (`stripe.webhooks.constructEvent`) jälkeen. Käyttäjän tunnisteena toimii toistaiseksi anonyymi, selaimessa generoitu `device_id` (localStorage), koska sovelluksessa ei vielä ole Supabase Authia — `profiles.id` on `uuid`-tyyppinen ja suoraan yhteensopiva tulevan `auth.users(id)`-viittauksen kanssa. `.env.local`:n `NEXT_PUBLIC_STRIPE_PRICE_ID` korjattiin (oli vahingossa Product ID, ei Price ID). Maksumuuri (`dictation-panel.tsx`) estää sanelun kokonaan ilman aktiivista (`trialing`/`active`) tilausta ja näyttää "Aloita 30 pv ilmainen kokeilu" -napin.

**Validointi:** `npm run lint`/`npm run build` vihreät. Stripe CLI (`stripe listen`) + Playwright-selaintesti vahvistivat koko käyttäjäpolun toimivan lokaalisti aidolla Stripe-testitilillä: paywall → Checkout (30 days free, €0.00 due today) → testikortilla (4242...) suoritettu maksu → `?checkout=success`-paluu → kaikki neljä webhook-tapahtumaa vastaanotettu ja käsitelty (HTTP 200, allekirjoitus validoitu).

**Jatkotoimenpide käyttäjälle:** Aja `supabase/migrations/20260825_create_profiles_subscriptions.sql` Supabase SQL-editorissa (ei voitu ajaa automaattisesti — projektin osoite ei resolvoitunut agentin verkosta, sama rajoitus kuin aiemmilla migraatioilla).

Täydellinen, laajempi versio tästä merkinnästä: ks. Google Driven kanoninen `04_DECISION_CHANGELOG.md`.
