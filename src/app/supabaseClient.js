import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente único com configuração padrão usando o schema 'seguranca'
const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  db: { schema: "seguranca" },
  autoRefreshToken: true,
  persistSession: true,
});

export function getSupabaseClient() {
  return supabaseClient;
}
