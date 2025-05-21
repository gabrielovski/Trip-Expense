import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Erro: Variáveis de ambiente do Supabase não estão definidas corretamente!"
  );
}

// Cliente único Supabase para toda a aplicação
let supabaseClient = null;
// Mapeamento para clientes de schema específicos para evitar recriação
const schemaClients = {};

/**
 * Obtém cliente Supabase considerando o schema especificado
 * @param {string} schema - O schema a ser usado ('seguranca', 'financeiro', 'viagem' ou undefined para default)
 * @returns {Object} - Cliente Supabase configurado
 */
export function getSupabaseClient(schema) {
  // Se não temos um cliente ainda, criar um
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseKey) {
      console.error("⚠️ Variáveis de ambiente do Supabase não encontradas!");
    }

    supabaseClient = createClient(supabaseUrl || "", supabaseKey || "", {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  // Se um schema específico foi pedido e já temos um cliente para ele, usá-lo
  if (schema) {
    if (!schemaClients[schema]) {
      schemaClients[schema] = supabaseClient.schema(schema);
    }
    return schemaClients[schema];
  }
  // Caso contrário, retorna o cliente padrão
  return supabaseClient;
}

// Funções auxiliares para acessar tabelas específicas de cada schema
export const usuariosTable = () =>
  getSupabaseClient("seguranca").from("tbusuarios");
export const recuperacaoTable = () =>
  getSupabaseClient("seguranca").from("tbrecuperacao");
export const viagemTable = () => getSupabaseClient("viagem").from("tbviagem");
export const viagemTipoTable = () =>
  getSupabaseClient("viagem").from("tbviagemtipo");
export const contasPagarTable = () =>
  getSupabaseClient("financeiro").from("tbcontaspagar");
export const tipoTituloTable = () =>
  getSupabaseClient("financeiro").from("tbtipotitulo");

export default getSupabaseClient();
