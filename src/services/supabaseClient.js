import { createClient } from '@supabase/supabase-js'

// Strict env loading: never hardcode keys in code.
// Read strictly from Vite environment variables (.env.local).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabasePublishableKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null
