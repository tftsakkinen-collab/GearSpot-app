import Stripe from "stripe";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Kirjaajanne — Stripe-webhookit (SaaS-tilausten elinkaari).
 *
 * Kuunnellaan neljää tapahtumaa (tehtävänannon mukaisesti) ja päivitetään
 * `profiles`-taulua Supabasen `service_role`-avaimella (ks. src/lib/supabase.ts):
 *  - checkout.session.completed  → asiakas linkitetään device_id:hen, tila = tilaus.status (yleensä "trialing")
 *  - customer.subscription.deleted → tila = "canceled"
 *  - invoice.payment_succeeded    → tila päivitetään tilauksen ajantasaisesta statuksesta ("active")
 *  - invoice.payment_failed       → tila = "past_due"
 *
 * TIETOTURVA (03_DEV_AND_SYSTEMS.md, kohta 7):
 *  - `STRIPE_WEBHOOK_SECRET` luetaan yksinomaan `.env.local`/Vercelin
 *    ympäristömuuttujista ja sitä käytetään AINA allekirjoituksen
 *    tarkistukseen (`stripe.webhooks.constructEvent`) ennen kuin pyynnön
 *    sisältöön luotetaan — muuten kuka tahansa voisi väärentää
 *    "maksu onnistui" -tapahtuman ja saada ilmaisen tilauksen.
 *  - `SUPABASE_SERVICE_ROLE_KEY` (ks. src/lib/supabase.ts) pysyy aina
 *    palvelimella; tämä on ainoa reitti, joka saa kirjoittaa
 *    `profiles`-tauluun tilaustietoja.
 */

async function readRawBody(req: Request): Promise<string> {
  return await req.text();
}

export async function POST(req: Request) {
  if (!isStripeConfigured || !stripe) {
    console.error(
      "[Kirjaajanne] /api/webhooks/stripe: STRIPE_SECRET_KEY puuttuu ympäristömuuttujista."
    );
    return Response.json({ error: "Stripe ei ole konfiguroitu." }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(
      "[Kirjaajanne] /api/webhooks/stripe: STRIPE_WEBHOOK_SECRET puuttuu ympäristömuuttujista — webhookit on estetty tietoturvasyistä."
    );
    return Response.json(
      { error: "Webhook-salaisuutta ei ole konfiguroitu." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Puuttuva stripe-signature-otsake." }, { status: 400 });
  }

  const rawBody = await readRawBody(req);

  let event: Stripe.Event;
  try {
    // Allekirjoituksen tarkistus estää väärennetyt/uudelleenlähetetyt
    // pyynnöt — TÄMÄ on ainoa tapa luottaa pyynnön sisältöön.
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (verificationError) {
    console.error(
      "[Kirjaajanne] /api/webhooks/stripe: allekirjoituksen tarkistus epäonnistui:",
      verificationError
    );
    return Response.json({ error: "Virheellinen allekirjoitus." }, { status: 400 });
  }

  console.log(
    `[Kirjaajanne] /api/webhooks/stripe: vastaanotettu tapahtuma ${event.type} (${event.id}).`
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = extractCustomerId(subscription.customer);
        if (!customerId) break;

        await upsertProfileByCustomerId(customerId, {
          subscription_status: "canceled",
          stripe_subscription_id: subscription.id,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = extractCustomerId(invoice.customer);
        const subscriptionId = extractSubscriptionId(invoice);
        if (!customerId) break;

        // Haetaan tilauksen ajantasainen status suoraan Stripestä sen
        // sijaan että oletettaisiin "active" — esim. ensimmäinen
        // kokeilujakson jälkeinen lasku voi olla eri tilassa.
        let subscriptionStatus = "active";
        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionStatus = subscription.status;
          const firstItem = subscription.items.data[0];
          currentPeriodEnd = firstItem
            ? new Date(firstItem.current_period_end * 1000).toISOString()
            : null;
        }

        await upsertProfileByCustomerId(customerId, {
          subscription_status: subscriptionStatus,
          stripe_subscription_id: subscriptionId,
          current_period_end: currentPeriodEnd,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = extractCustomerId(invoice.customer);
        const subscriptionId = extractSubscriptionId(invoice);
        if (!customerId) break;

        await upsertProfileByCustomerId(customerId, {
          subscription_status: "past_due",
          stripe_subscription_id: subscriptionId,
        });
        break;
      }

      default:
        console.log(
          `[Kirjaajanne] /api/webhooks/stripe: tapahtumatyyppiä ${event.type} ei käsitellä, ohitetaan.`
        );
    }

    return Response.json({ received: true });
  } catch (handlerError) {
    console.error(
      `[Kirjaajanne] /api/webhooks/stripe: tapahtuman ${event.type} käsittely epäonnistui:`,
      handlerError
    );
    // Palautetaan 500, jotta Stripe yrittää lähettää tapahtuman uudelleen
    // myöhemmin sen sijaan että tapahtuma katoaisi hiljaisesti.
    return Response.json({ error: "Webhook-käsittely epäonnistui." }, { status: 500 });
  }
}

/**
 * Uudemmissa Stripe API -versioissa (mm. tässä käytössä oleva
 * "2026-07-29.dahlia") laskun tilaus ei enää löydy suoraan
 * `invoice.subscription`-kentästä, vaan `invoice.parent.subscription_details
 * .subscription`-polusta. Tuetaan molempia muotoja, jotta koodi ei hajoa
 * mahdollisen tulevan/vanhemman API-version kanssa.
 */
function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacySubscription = (
    invoice as unknown as { subscription?: string | { id: string } | null }
  ).subscription;
  if (typeof legacySubscription === "string") return legacySubscription;
  if (legacySubscription && typeof legacySubscription === "object") {
    return legacySubscription.id;
  }

  const parentSubscription =
    invoice.parent?.subscription_details?.subscription;
  if (typeof parentSubscription === "string") return parentSubscription;
  if (parentSubscription && typeof parentSubscription === "object") {
    return parentSubscription.id;
  }

  return null;
}

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Päivittää `profiles`-rivin `stripe_customer_id`:n perusteella. Käytetään
 * aina kun tapahtuma koskee jo olemassa olevaa asiakasta
 * (subscription.deleted, invoice.payment_succeeded/failed) — Checkoutin
 * `client_reference_id` (device_id) on tällöin jo tallennettu riville
 * aiemmasta `checkout.session.completed`-tapahtumasta.
 */
async function upsertProfileByCustomerId(
  customerId: string,
  fields: Record<string, unknown>
) {
  if (!isSupabaseConfigured || !supabaseServerClient) {
    console.warn(
      "[Kirjaajanne] /api/webhooks/stripe: Supabase ei ole konfiguroitu — tilauspäivitystä ei tallennettu."
    );
    return;
  }

  const { error } = await supabaseServerClient
    .from("profiles")
    .update(fields)
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error(
      `[Kirjaajanne] /api/webhooks/stripe: profiles-päivitys epäonnistui (customerId=${customerId}):`,
      error
    );
  } else {
    console.log(
      `[Kirjaajanne] /api/webhooks/stripe: profiles päivitetty (customerId=${customerId}):`,
      fields
    );
  }
}

/**
 * `checkout.session.completed`: ensimmäinen kerta kun asiakas ja
 * `profiles`-rivi linkitetään toisiinsa `client_reference_id`:n (device_id)
 * kautta. Tässä vaiheessa tilaus on tyypillisesti tilassa "trialing" —
 * 30 päivän ilmainen kokeilu on juuri käynnistynyt (ks. /api/checkout).
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (!stripe) return;

  const deviceId = session.client_reference_id;
  const customerId = extractCustomerId(session.customer);

  if (!deviceId) {
    console.warn(
      "[Kirjaajanne] /api/webhooks/stripe: checkout.session.completed ilman client_reference_id (deviceId) — ohitetaan."
    );
    return;
  }
  if (!customerId) {
    console.warn(
      "[Kirjaajanne] /api/webhooks/stripe: checkout.session.completed ilman customer-ID:tä — ohitetaan."
    );
    return;
  }

  let subscriptionStatus = "trialing";
  let subscriptionId: string | null = null;
  let trialEnd: string | null = null;
  let currentPeriodEnd: string | null = null;

  if (session.subscription) {
    const subscriptionIdOrObject = session.subscription;
    const subscription =
      typeof subscriptionIdOrObject === "string"
        ? await stripe.subscriptions.retrieve(subscriptionIdOrObject)
        : subscriptionIdOrObject;

    subscriptionId = subscription.id;
    subscriptionStatus = subscription.status;
    trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
    const firstItem = subscription.items.data[0];
    currentPeriodEnd = firstItem
      ? new Date(firstItem.current_period_end * 1000).toISOString()
      : null;
  }

  if (!isSupabaseConfigured || !supabaseServerClient) {
    console.warn(
      "[Kirjaajanne] /api/webhooks/stripe: Supabase ei ole konfiguroitu — checkout.session.completed-päivitystä ei tallennettu."
    );
    return;
  }

  const { error } = await supabaseServerClient.from("profiles").upsert(
    {
      id: deviceId,
      email: session.customer_details?.email ?? null,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? null,
      subscription_status: subscriptionStatus,
      trial_end: trialEnd,
      current_period_end: currentPeriodEnd,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error(
      "[Kirjaajanne] /api/webhooks/stripe: profiles-upsert epäonnistui (checkout.session.completed):",
      error
    );
  } else {
    console.log(
      `[Kirjaajanne] /api/webhooks/stripe: profiili luotu/päivitetty deviceId=${deviceId}, ` +
        `status=${subscriptionStatus} (30 pv ilmainen kokeilu käynnistetty).`
    );
  }
}
