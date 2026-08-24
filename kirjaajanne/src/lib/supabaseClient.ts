import { createClient } from "@supabase/supabase-js";

/**
 * Client-safe Supabase-asiakasohjelma julkisille kyselyille (esim. community_stats -laskurit).
 * Käyttää NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY -muuttujia.
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (typeof import.meta !== "undefined"
    ? (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL
    : "") ||
  "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  (typeof import.meta !== "undefined"
    ? (import.meta as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY
    : "") ||
  "";

export const isPublicSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseClient = isPublicSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
