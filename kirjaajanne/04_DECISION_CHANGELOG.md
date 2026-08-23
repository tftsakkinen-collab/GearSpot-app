# 04_DECISION_CHANGELOG.md (Kirjaajanne — paikallinen kopio)

Tämä on paikallinen (`kirjaajanne`-repo) kopio Kirjaajannetta koskevista päätöslokimerkinnöistä. Kanoninen, kaikkien projektien yhteinen loki ylläpidetään Google Drivessa (`G:\My Drive\AI - automaatiot\04_DECISION_CHANGELOG.md`, ks. `03_DEV_AND_SYSTEMS.md` / `config/rules.md`, kohta 2). Uusin merkintä ylimpänä.

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
