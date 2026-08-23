import { createClient } from "@supabase/supabase-js";

/**
 * Palvelinpuolen Supabase-asiakas anonymisoidun datapankin
 * (`anonymized_records`-taulu) kirjoituksia varten.
 *
 * TIETOTURVA: tämä tiedosto ajetaan vain palvelimella (`/api/chat`-reitti,
 * `export const runtime = "nodejs"`). Avaimia ei koskaan viedä clientille.
 * `SUPABASE_SERVICE_ROLE_KEY` luetaan yksinomaan `.env.local`-tiedostosta,
 * joka on `.gitignore`ssa eikä koskaan päädy versionhallintaan. Muuttujilla
 * ei ole `NEXT_PUBLIC_`-etuliitettä, joten Next.js ei koskaan pura niitä
 * selaimelle lähetettävään bundleen.
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseServiceRoleKey
);

export const supabaseServerClient =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;
