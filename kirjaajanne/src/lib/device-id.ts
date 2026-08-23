"use client";

/**
 * Kirjaajanne — Stripe-maksuintegraatio.
 *
 * Sovelluksessa ei (vielä) ole käytössä Supabase Authia (ei kirjautumis-UI:ta,
 * ks. kommentti `supabase/migrations/20260825_create_profiles_subscriptions.sql`
 * -tiedostossa). Jotta 1kk ilmainen kokeilu + 20 EUR/kk -maksumuuri voidaan
 * silti toteuttaa nyt, käytetään kevyttä, selaimessa generoitua ja pysyvästi
 * `localStorage`iin tallennettua anonyymia `device_id`-tunnistetta (UUID).
 * Tämä EI ole henkilötieto sellaisenaan — se ei sisällä nimeä, sähköpostia
 * eikä mitään yksilöivää tietoa käyttäjästä, vain satunnainen laitekohtainen
 * arvo, jota käytetään ainoastaan `profiles`-taulun rivin tunnisteena.
 *
 * `stripe_customer_id` linkitetään tähän `device_id`:hen Checkout-session
 * `client_reference_id`-kentän kautta (ks. `/api/checkout/route.ts`), ja
 * webhook-käsittelijä (`/api/webhooks/stripe/route.ts`) käyttää samaa arvoa
 * `profiles`-rivin päivittämiseen.
 */
const DEVICE_ID_STORAGE_KEY = "kirjaajanne:device-id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    throw new Error(
      "getOrCreateDeviceId() voidaan kutsua vain selaimessa (client-komponentissa)."
    );
  }

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;

    const generated = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch (storageError) {
    // Jos localStorage ei jostain syystä ole käytettävissä (esim. yksityinen
    // selaus tietyissä selaimissa), luodaan silti väliaikainen tunniste
    // tämän istunnon ajaksi sen sijaan että koko maksuvirta kaatuisi.
    console.warn(
      "[Kirjaajanne] device_id:tä ei voitu tallentaa localStorageen, käytetään väliaikaista tunnistetta:",
      storageError
    );
    return crypto.randomUUID();
  }
}
