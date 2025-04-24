import { getSupabaseClient } from "./supabaseClient";
import bcrypt from "bcryptjs";

// Cache do usuário atual para evitar chamadas repetidas ao localStorage
let cachedUser = null;

// Custo de hash reduzido para melhor performance
const SALT_ROUNDS = 8;

export async function signIn(login, password) {
  try {
    console.log("Tentando login para:", login);
    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("*")
      .eq("login", login)
      .single();

    if (userError || !userData) {
      console.log("Usuário não encontrado");
      throw new Error("Usuário não encontrado");
    }

    // Log para debug - não mostra a senha real no console
    console.log("Senha fornecida: [comprimento]", password.length);
    console.log("Hash armazenado:", userData.senha);

    // Usando compareSync para melhor desempenho
    const passwordMatch = bcrypt.compareSync(password, userData.senha);
    console.log("Senhas correspondem?", passwordMatch);

    if (!passwordMatch) {
      throw new Error("Senha incorreta");
    }

    // Atualizar cache
    cachedUser = userData;
    try {
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (e) {
      console.log("Erro ao salvar no localStorage:", e);
    }

    return { user: userData };
  } catch (error) {
    console.log("Erro no login:", error.message);
    throw error;
  }
}

export async function signUp(login, password, nome) {
  try {
    const supabase = getSupabaseClient();

    // Verificar se o login já existe - com operação otimizada
    const { count, error: countError } = await supabase
      .from("tbusuarios")
      .select("*", { count: "exact", head: true })
      .eq("login", login);

    if (countError)
      throw new Error("Erro ao verificar disponibilidade do login");
    if (count > 0) throw new Error("Este login já está em uso");

    // ID simplificado com timestamp para garantir unicidade
    const usuario_id = Date.now();
    const senhaHash = bcrypt.hashSync(password, SALT_ROUNDS);

    // Log para debug
    console.log("Criando usuário com hash:", senhaHash);

    const { error } = await supabase.from("tbusuarios").insert([
      {
        usuario_id,
        nome,
        login,
        senha: senhaHash,
        atualizado_em: new Date().toISOString(),
      },
    ]);

    if (error) throw new Error(error.message);

    return signIn(login, password);
  } catch (error) {
    throw error;
  }
}

export const signOut = () => {
  try {
    localStorage.removeItem("user");
  } catch (e) {
    console.log("Erro ao remover do localStorage:", e);
  }
  cachedUser = null;
};

export const getCurrentUser = () => {
  // Usar cache primeiro para melhor performance
  if (cachedUser) return cachedUser;

  try {
    const userData = localStorage.getItem("user");
    if (!userData) return null;

    cachedUser = JSON.parse(userData);
    return cachedUser;
  } catch (e) {
    console.log("Erro ao obter usuário do localStorage:", e);
    return null;
  }
};

// Novas funções para recuperação de senha
export async function requestPasswordReset(login) {
  try {
    const supabase = getSupabaseClient();

    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id")
      .eq("login", login)
      .single();

    if (userError || !userData) throw new Error("Usuário não encontrado");

    // Gerar código de recuperação com 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Calcular expiração (1 hora)
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    // Armazenar código de recuperação no banco de dados
    const { error } = await supabase.from("tbrecuperacao").insert([
      {
        usuario_id: userData.usuario_id,
        codigo: resetCode,
        expira_em: expiration.toISOString(),
        utilizado: false,
      },
    ]);

    if (error) throw new Error("Erro ao gerar código de recuperação");

    // Em um sistema real, você enviaria o código por email
    // Mas para demonstração, vamos retornar o código para mostrar na interface
    return { resetCode };
  } catch (error) {
    throw error;
  }
}

export async function verifyResetCode(login, code) {
  try {
    const supabase = getSupabaseClient();

    // Buscar usuário pelo login
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id")
      .eq("login", login)
      .single();

    if (userError || !userData) throw new Error("Usuário não encontrado");

    // Buscar código de recuperação
    const { data: resetData, error: resetError } = await supabase
      .from("tbrecuperacao")
      .select("*")
      .eq("usuario_id", userData.usuario_id)
      .eq("codigo", code)
      .eq("utilizado", false)
      .single();

    if (resetError || !resetData)
      throw new Error("Código de recuperação inválido");

    // Verificar se o código expirou
    const expiration = new Date(resetData.expira_em);
    if (expiration < new Date())
      throw new Error("Código de recuperação expirado");

    return { valid: true, resetId: resetData.id };
  } catch (error) {
    throw error;
  }
}

export async function resetPassword(login, code, newPassword) {
  try {
    console.log("Iniciando redefinição de senha para:", login);

    // Primeiro verificar o código
    const { valid, resetId } = await verifyResetCode(login, code);

    if (!valid) throw new Error("Código de verificação inválido");

    const supabase = getSupabaseClient();

    // Buscar usuário pelo login
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("*")
      .eq("login", login)
      .single();

    if (userError || !userData) throw new Error("Usuário não encontrado");

    // Gerar hash da nova senha - como a trigger foi removida, precisamos fazer isso no código
    // Usando um salt consistente para melhorar confiabilidade
    const salt = bcrypt.genSaltSync(SALT_ROUNDS);
    const senhaHash = bcrypt.hashSync(newPassword, salt);

    console.log("Novo hash bcrypt gerado:", senhaHash);

    // Atualizar senha do usuário com o hash gerado
    const { error: updateError } = await supabase
      .from("tbusuarios")
      .update({
        senha: senhaHash, // Agora enviamos o hash em vez da senha em texto puro
        atualizado_em: new Date().toISOString(),
      })
      .eq("usuario_id", userData.usuario_id);

    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      throw new Error("Erro ao atualizar senha");
    }

    console.log("Senha atualizada com sucesso");

    // Marcar código como utilizado
    await supabase
      .from("tbrecuperacao")
      .update({ utilizado: true })
      .eq("id", resetId);

    // Garantir que o cache seja limpo
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      // Também limpar qualquer cookie de sessão que possa existir
      document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    cachedUser = null;

    // Verificar se a senha foi realmente alterada
    const { data: checkUser } = await supabase
      .from("tbusuarios")
      .select("senha")
      .eq("usuario_id", userData.usuario_id)
      .single();

    if (checkUser) {
      console.log("Hash armazenado após atualização:", checkUser.senha);
      const verifyTest = bcrypt.compareSync(newPassword, checkUser.senha);
      console.log("Teste de validação (deve ser true):", verifyTest);

      if (!verifyTest) {
        console.error("Erro grave: A senha atualizada não pode ser validada!");
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao resetar senha:", error);
    throw error;
  }
}
