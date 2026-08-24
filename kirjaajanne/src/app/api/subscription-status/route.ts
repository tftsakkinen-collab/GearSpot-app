import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Kirjaajanne — Stripe-maksuintegraatio.
 *
 * Palauttaa clientille (maksumuurin, ks. dictation-panel.tsx) yksinkertaisen
 * tilan: onko tämän `device_id`:n tilaus tällä hetkellä aktiivinen (joko
 * "trialing" tai "active"). Client ei koskaan lue Supabasea suoraan —
 * `service_role`-avain pysyy aina palvelimella (ks. src/lib/supabase.ts).
 */
const ACTIVE_STATUSES = new Set(["trialing", "active"]);

// Asetus vapaalle testikäytölle ilman maksutietoja
export const FREE_TEST_PERIOD_ACTIVE = true;

export async function GET(req: Request) {
  if (FREE_TEST_PERIOD_ACTIVE) {
    return Response.json({ isActive: true, status: "active", isFreeBeta: true });
  }

  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId") || "";

  if (!supabaseServerClient) {
    return Response.json({ isActive: false, status: "none" });
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
