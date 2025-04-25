import { getSupabaseClient } from "./supabaseClient";
import bcrypt from "bcryptjs";

// Cache do usuário atual para evitar chamadas repetidas ao localStorage
let cachedUser = null;

// Custo de hash bcrypt - 10 é mais seguro que 8, mantendo boa performance
const SALT_ROUNDS = 10;

// Função de log segura que não expõe dados sensíveis
const secureLog = (message, sensitive = false) => {
  if (process.env.NODE_ENV !== "production" || !sensitive) {
    console.log(message);
  }
};

export async function signIn(login, password) {
  try {
    secureLog(`Tentando login para: ${login}`);
    const supabase = getSupabaseClient("seguranca");

    // Otimização: selecionar apenas os campos necessários
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id, nome, login, senha, atualizado_em")
      .eq("login", login)
      .single();

    if (userError || !userData) {
      throw new Error("Usuário não encontrado");
    }

    // Garantir que temos uma senha para comparar
    if (!userData.senha) {
      secureLog("Erro: Usuário não possui senha definida", true);
      throw new Error("Erro de autenticação");
    }

    // Sem logar informações da senha
    const passwordMatch = bcrypt.compareSync(password, userData.senha);

    if (!passwordMatch) {
      throw new Error("Senha incorreta");
    }

    // Preparar objeto de usuário para armazenamento (sem senha)
    const userForStorage = { ...userData };
    delete userForStorage.senha;

    // Atualizar cache com versão sem senha
    cachedUser = userForStorage;

    try {
      // Usar sessionStorage e localStorage para persistência
      if (typeof window !== "undefined") {
        const userJson = JSON.stringify(userForStorage);
        sessionStorage.setItem("user", userJson);
        localStorage.setItem("user", userJson);

        // Definir também um cookie para o middleware
        document.cookie = `user=${encodeURIComponent(
          userJson
        )}; path=/; max-age=86400; SameSite=Strict`;
      }
    } catch (e) {
      secureLog(`Erro ao salvar no storage: ${e.message}`, true);
      // Não interrompa o login se o armazenamento falhar
    }

    return { user: userForStorage };
  } catch (error) {
    secureLog(`Erro no login: ${error.message}`, true);
    throw error;
  }
}

export async function signUp(login, password, nome) {
  try {
    const supabase = getSupabaseClient("seguranca");

    // Verificar se o login já existe - com operação otimizada
    const { count, error: countError } = await supabase
      .from("tbusuarios")
      .select("usuario_id", { count: "exact", head: true })
      .eq("login", login);

    if (countError)
      throw new Error("Erro ao verificar disponibilidade do login");
    if (count > 0) throw new Error("Este login já está em uso");

    // ID simplificado com timestamp para garantir unicidade
    const usuario_id = Date.now();
    const senhaHash = bcrypt.hashSync(password, SALT_ROUNDS);

    const { error } = await supabase.from("tbusuarios").insert([
      {
        usuario_id,
        nome,
        login,
        senha: senhaHash,
        cargo: "usuario", // cargo padrão
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      },
    ]);

    if (error) throw new Error(error.message);

    // Tentar login com uma pequena espera para garantir que o banco de dados processou a inserção
    await new Promise((resolve) => setTimeout(resolve, 500));
    return signIn(login, password);
  } catch (error) {
    throw error;
  }
}

export const signOut = () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");

      // Limpar cookies definindo expiração no passado
      document.cookie =
        "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict";
    }
  } catch (e) {
    secureLog(`Erro ao remover dados de usuário: ${e.message}`, true);
  }
  // Sempre limpar o cache independentemente de erros
  cachedUser = null;
};

export const getCurrentUser = () => {
  // Usar cache primeiro para melhor performance
  if (cachedUser) return cachedUser;

  try {
    // Verificar primeiro sessionStorage (mais seguro)
    let userData = sessionStorage.getItem("user");

    // Cair para localStorage se não encontrar no sessionStorage
    if (!userData) {
      userData = localStorage.getItem("user");
    }

    if (!userData) return null;

    cachedUser = JSON.parse(userData);
    return cachedUser;
  } catch (e) {
    secureLog("Erro ao obter usuário do storage:", true);
    return null;
  }
};

// Novas funções para recuperação de senha
export async function requestPasswordReset(login) {
  try {
    const supabase = getSupabaseClient("seguranca");

    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id")
      .eq("login", login)
      .single();

    if (userError || !userData) throw new Error("Usuário não encontrado");

    // Gerar código de recuperação mais seguro - 8 dígitos
    const resetCode = Math.floor(
      10000000 + Math.random() * 90000000
    ).toString();

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

    // Em um sistema real, enviaríamos o código por email
    // Retornamos o código apenas para facilitar o desenvolvimento
    return { success: true, resetCode };
  } catch (error) {
    throw error;
  }
}

export async function verifyResetCode(login, code) {
  try {
    const supabase = getSupabaseClient("seguranca");

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
    secureLog(`Iniciando redefinição de senha para: ${login}`);

    // Primeiro verificar o código
    const { valid, resetId } = await verifyResetCode(login, code);

    if (!valid) throw new Error("Código de verificação inválido");

    const supabase = getSupabaseClient("seguranca");

    // Buscar usuário pelo login
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id")
      .eq("login", login)
      .single();

    if (userError || !userData) throw new Error("Usuário não encontrado");

    // Gerar hash da nova senha com SALT_ROUNDS mais forte
    const salt = bcrypt.genSaltSync(SALT_ROUNDS);
    const senhaHash = bcrypt.hashSync(newPassword, salt);

    // Atualizar senha do usuário com o hash gerado
    const { error: updateError } = await supabase
      .from("tbusuarios")
      .update({
        senha: senhaHash,
        atualizado_em: new Date().toISOString(),
      })
      .eq("usuario_id", userData.usuario_id);

    if (updateError) {
      throw new Error("Erro ao atualizar senha");
    }

    // Marcar código como utilizado
    await supabase
      .from("tbrecuperacao")
      .update({ utilizado: true })
      .eq("id", resetId);

    // Garantir que o cache seja limpo
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    cachedUser = null;

    return { success: true };
  } catch (error) {
    secureLog(`Erro ao resetar senha: ${error.message}`, true);
    throw error;
  }
}
