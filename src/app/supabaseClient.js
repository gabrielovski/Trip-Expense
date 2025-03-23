import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseSeguranca = createClient(supabaseUrl, supabaseKey, {
  db: { schema: "seguranca" },
});

export const supabaseFinanceiro = createClient(supabaseUrl, supabaseKey, {
  db: { schema: "financeiro" },
});

export const supabaseViagem = createClient(supabaseUrl, supabaseKey, {
  db: { schema: "viagem" },
});
