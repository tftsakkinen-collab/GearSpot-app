import { isSupabaseConfigured, supabaseServerClient } from "@/lib/supabase";
import { isPublicSupabaseConfigured, supabaseClient } from "@/lib/supabaseClient";

export const runtime = "nodejs";

// Globaalit varalaskurit (fallback, jos Supabase-yhteyttä ei vielä ole määritetty)
let inMemoryWordsTaught = 1450;
let inMemoryTimeSavedMinutes = 12350;

export async function GET() {
  try {
    const client = isSupabaseConfigured && supabaseServerClient
      ? supabaseServerClient
      : isPublicSupabaseConfigured && supabaseClient
      ? supabaseClient
      : null;

    if (client) {
      const { data, error } = await client
        .from("community_stats")
        .select("total_words_taught, total_time_saved_minutes")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return Response.json({
          total_words_taught: Number(data.total_words_taught) || inMemoryWordsTaught,
          total_time_saved_minutes: Number(data.total_time_saved_minutes) || inMemoryTimeSavedMinutes,
        });
      }
    }
  } catch (err) {
    console.warn("[Kirjaajanne] GET /api/stats Supabase-haku epäonnistui, käytetään varalaskuria:", err);
  }

  return Response.json({
    total_words_taught: inMemoryWordsTaught,
    total_time_saved_minutes: inMemoryTimeSavedMinutes,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const wordsDelta = Math.max(0, Number(body.wordsDelta) || 0);
    const minutesDelta = Math.max(0, Number(body.minutesDelta) || 0);

    if (wordsDelta === 0 && minutesDelta === 0) {
      return Response.json({ message: "Ei kasvatettavia arvoja." }, { status: 400 });
    }

    inMemoryWordsTaught += wordsDelta;
    inMemoryTimeSavedMinutes += minutesDelta;

    const client = isSupabaseConfigured && supabaseServerClient
      ? supabaseServerClient
      : isPublicSupabaseConfigured && supabaseClient
      ? supabaseClient
      : null;

    if (client) {
      // 1. Haetaan nykyinen aloitusrivi
      const { data: current, error: fetchErr } = await client
        .from("community_stats")
        .select("id, total_words_taught, total_time_saved_minutes")
        .limit(1)
        .maybeSingle();

      if (!fetchErr && current) {
        const nextWords = (Number(current.total_words_taught) || 0) + wordsDelta;
        const nextMinutes = (Number(current.total_time_saved_minutes) || 0) + minutesDelta;

        const { error: updateErr } = await client
          .from("community_stats")
          .update({
            total_words_taught: nextWords,
            total_time_saved_minutes: nextMinutes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", current.id);

        if (!updateErr) {
          return Response.json({
            total_words_taught: nextWords,
            total_time_saved_minutes: nextMinutes,
          });
        }
      }
    }
  } catch (err) {
    console.error("[Kirjaajanne] POST /api/stats kasvatus epäonnistui:", err);
  }

  return Response.json({
    total_words_taught: inMemoryWordsTaught,
    total_time_saved_minutes: inMemoryTimeSavedMinutes,
  });
}
