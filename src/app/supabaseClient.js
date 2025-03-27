import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const clients = {
  seguranca: createClient(supabaseUrl, supabaseKey, {
    db: { schema: "seguranca" },
  }),
  financeiro: createClient(supabaseUrl, supabaseKey, {
    db: { schema: "financeiro" },
  }),
  viagem: createClient(supabaseUrl, supabaseKey, { db: { schema: "viagem" } }),
};

export function getSupabaseClient(schema) {
  return clients[schema] || clients.seguranca; // Default para 'seguranca' se não especificado
}
