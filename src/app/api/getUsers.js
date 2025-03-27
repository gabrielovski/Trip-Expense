import { getSupabaseClient } from "../supabaseClient";

export async function getUsers() {
  const supabase = getSupabaseClient("seguranca");
  const { data, error } = await supabase.from("tbusuarios").select("nome");

  if (error) {
    // Evitar expor detalhes do erro em produção
    console.error("Erro ao buscar usuários:", error.message);
    return { success: false, message: "Erro ao buscar usuários", data: [] };
  }

  // Sanitizar os dados retornados (se necessário)
  const sanitizedData = data?.map((user) => ({
    nome: user.nome,
  }));

  return {
    success: true,
    message: "Usuários buscados com sucesso",
    data: sanitizedData || [],
  };
}
