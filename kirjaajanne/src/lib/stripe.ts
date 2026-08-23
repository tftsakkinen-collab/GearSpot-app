import Stripe from "stripe";

/**
 * Palvelinpuolen Stripe-asiakas.
 *
 * TIETOTURVA (03_DEV_AND_SYSTEMS.md, kohta 7): `STRIPE_SECRET_KEY` luetaan
 * VÄLITTÖMÄSTI vain `.env.local`-tiedostosta (Vercelissä vastaavasta
 * ympäristömuuttujasta) — sitä ei koskaan kovakoodata, kysellä käyttäjältä
 * eikä paljasteta clientille. Tämä moduuli tuodaan yksinomaan palvelin-
 * puolen reiteiltä (`/api/checkout`, `/api/webhooks/stripe`, molemmat
 * `export const runtime = "nodejs"`).
 */
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const isStripeConfigured = Boolean(stripeSecretKey);

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      // Lukitaan SDK:n mukana tuleva uusin tuettu API-versio eksplisiittisesti,
      // jotta Stripe-tilin oletus-API-version muuttuminen Dashboardissa ei voi
      // koskaan hiljaisesti muuttaa tämän integraation käyttäytymistä.
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
    })
  : null;
