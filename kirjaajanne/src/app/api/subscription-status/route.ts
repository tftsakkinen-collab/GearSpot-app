import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Kirjaajanne — Stripe-maksuintegraatio.
 *
 * Palauttaa clientille (maksumuurin, ks. dictation-panel.tsx) yksinkertaisen
 * tilan: onko tämän `device_id`:n tilaus tällä hetkellä aktiivinen (joko
 * "trialing" tai "active"). Client ei koskaan lue Supabasea suoraan —
 * `service_role`-avain pysyy aina palvelimella (ks. src/lib/supabase.ts).
 */
const ACTIVE_STATUSES = new Set(["trialing", "active"]);

export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get("deviceId");

  if (!deviceId) {
    return Response.json(
      { error: "Laitetunnistetta (deviceId) ei vastaanotettu." },
      { status: 400 }
    );
  }

  // Jos Supabasea ei ole konfiguroitu tässä ympäristössä, päästetään
  // käyttäjä läpi lokaalin/dev-testauksen ajaksi sen sijaan että koko
  // sovellus jäisi lukkoon — sama varaperiaate kuin /api/templates-reitillä.
  if (!isSupabaseConfigured || !supabaseServerClient) {
    console.warn(
      "[Kirjaajanne] /api/subscription-status: Supabase ei ole konfiguroitu — maksumuuri ohitetaan (dev-varakäytös)."
    );
    return Response.json({ isActive: true, status: "unconfigured" });
  }

  try {
    const { data, error } = await supabaseServerClient
      .from("profiles")
      .select("subscription_status, trial_end, current_period_end")
      .eq("id", deviceId)
      .maybeSingle();

    if (error) {
      console.error("[Kirjaajanne] /api/subscription-status: haku epäonnistui:", error);
      return Response.json({ isActive: false, status: "error" });
    }

    if (!data) {
      // Ei vielä koskaan aloittanut Checkoutia.
      return Response.json({ isActive: false, status: "none" });
    }

    const isActive = ACTIVE_STATUSES.has(data.subscription_status);

    return Response.json({
      isActive,
      status: data.subscription_status,
      trialEnd: data.trial_end,
      currentPeriodEnd: data.current_period_end,
    });
  } catch (unexpectedError) {
    console.error(
      "[Kirjaajanne] /api/subscription-status: odottamaton virhe:",
      unexpectedError
    );
    return Response.json({ isActive: false, status: "error" });
  }
}
