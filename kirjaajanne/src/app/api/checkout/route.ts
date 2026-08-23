import { isStripeConfigured, stripe } from "@/lib/stripe";
import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Kirjaajanne — Stripe Checkout (SaaS-maksuintegraatio).
 *
 * Liiketoimintamalli: 30 päivän (~1kk) ilmainen kokeilujakso, sen jälkeen
 * 20 EUR / kk. `NEXT_PUBLIC_STRIPE_PRICE_ID` osoittaa Stripen tuotteen
 * (Kirjaajanne PRO) kuukausihintaan Stripe Dashboardissa/API:ssa —
 * TIETOTURVA: hinta-ID luetaan yksinomaan `.env.local`/Vercelin
 * ympäristömuuttujista, sitä ei koskaan kovakoodata tähän tiedostoon.
 * (Muuttuja on `NEXT_PUBLIC_`-etuliitteinen, koska tehtävänannon mukaan sitä
 * käytetään myös clientillä, mutta tässä reitissä se luetaan aina
 * palvelimen `process.env`:stä, ei koskaan clientin lähettämästä pyynnöstä
 * — client ei voi koskaan vaihtaa hintaa vaihtamalla pyynnön sisältöä.)
 */
export async function POST(req: Request) {
  if (!isStripeConfigured || !stripe) {
    console.error(
      "[Kirjaajanne] /api/checkout: STRIPE_SECRET_KEY puuttuu ympäristömuuttujista."
    );
    return Response.json(
      { error: "Maksujärjestelmä ei ole konfiguroitu tässä ympäristössä." },
      { status: 503 }
    );
  }

  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
  if (!priceId) {
    console.error(
      "[Kirjaajanne] /api/checkout: NEXT_PUBLIC_STRIPE_PRICE_ID puuttuu ympäristömuuttujista."
    );
    return Response.json(
      { error: "Tilaustuotetta ei ole määritelty tässä ympäristössä." },
      { status: 503 }
    );
  }

  const body: { deviceId?: string } = await req.json().catch(() => ({}));
  const deviceId = body.deviceId?.trim();

  if (!deviceId) {
    return Response.json(
      { error: "Laitetunnistetta (deviceId) ei vastaanotettu." },
      { status: 400 }
    );
  }

  const origin =
    req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    // Jos device_id:lle on jo aiemmin luotu Stripe-asiakas (esim. käyttäjä
    // peruutti Checkoutin kesken ja yrittää uudelleen), käytetään samaa
    // asiakasta uudelleen sen sijaan että luotaisiin duplikaatteja.
    let existingCustomerId: string | undefined;

    if (isSupabaseConfigured && supabaseServerClient) {
      const { data: existingProfile } = await supabaseServerClient
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", deviceId)
        .maybeSingle();

      existingCustomerId = existingProfile?.stripe_customer_id ?? undefined;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: existingCustomerId,
      client_reference_id: deviceId,
      // KRIITTINEN VAATIMUS: pakotetaan 30 päivän ilmainen kokeilu suoraan
      // Checkout-session luonnissa, riippumatta siitä onko Stripe-hinnalle
      // itselleen asetettu erillistä kokeiluasetusta Dashboardissa.
      subscription_data: {
        trial_period_days: 30,
        metadata: { device_id: deviceId },
      },
      // Stripen Checkout kerää sähköpostiosoitteen automaattisesti uudelta
      // asiakkaalta (ei tarvitse asettaa `customer_email`-kenttää erikseen),
      // ja lähettää sen jälkeen laskutus-/kuittiviestit suoraan asiakkaalle.
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe ei palauttanut Checkout-session URL-osoitetta.");
    }

    console.log(
      `[Kirjaajanne] /api/checkout: Checkout-sessio luotu (deviceId=${deviceId}, ` +
        `sessionId=${session.id}, trial_period_days=30).`
    );

    return Response.json({ url: session.url });
  } catch (error) {
    console.error(
      "[Kirjaajanne] /api/checkout: Checkout-session luonti epäonnistui:",
      error
    );
    return Response.json(
      { error: "Checkout-session luonti epäonnistui. Yritä hetken kuluttua uudelleen." },
      { status: 500 }
    );
  }
}
