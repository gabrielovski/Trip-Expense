import { getSupabaseClient } from "./supabaseClient";
import bcrypt from "bcryptjs";

// Cache do usuário atual para evitar chamadas repetidas ao localStorage
// Cache com TTL para garantir que dados não fiquem desatualizados
let cachedUser = null;
let cacheTimestamp = null;
const CACHE_TTL = 60 * 1000; // 1 minuto em milissegundos

// Custo de hash bcrypt - 10 é mais seguro que 8, mantendo boa performance
const SALT_ROUNDS = 10;

// Função de log segura que não expõe dados sensíveis
const secureLog = (message, sensitive = false) => {
  // Em produção, mostrar apenas logs não sensíveis
  // Em desenvolvimento, mostrar tudo exceto se explicitamente marcado como sensível e NODE_ENV=production
  if (process.env.NODE_ENV !== "production" || !sensitive) {
    console.log(`[Auth] ${message}`);
  }
};

export async function signIn(login, password) {
  try {
    secureLog(`Tentando login para: ${login}`);
    const supabase = getSupabaseClient("seguranca"); // Otimização: selecionar apenas os campos necessários

    secureLog("Conectando ao banco de dados para autenticação...");
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id, nome, login, senha, atualizado_em")
      .eq("login", login)
      .single();
    if (userError) {
      secureLog(
        "Erro ao buscar usuário: " + (userError.message || "Erro de conexão"),
        true
      );
      throw new Error(
        `Usuário não encontrado: ${userError.message || "Erro de conexão"}`
      );
    }

    if (!userData) {
      throw new Error("Usuário não encontrado");
    }

    secureLog("Usuário encontrado, verificando credenciais...");

    // Garantir que temos uma senha para comparar
    if (!userData.senha) {
      secureLog("Erro: Usuário não possui senha definida", true);
      throw new Error("Erro de autenticação");
    }

    // Sem logar informações da senha
    const passwordMatch = bcrypt.compareSync(password, userData.senha);

    if (!passwordMatch) {
      throw new Error("Senha incorreta");
    } // Preparar objeto de usuário para armazenamento (sem senha)
    const userForStorage = { ...userData };
    delete userForStorage.senha;

    // Definir o tipo_usuario com base no login
    // O admin e gabriel são tipo 2 (administradores), todos os outros usuários são tipo 1
    userForStorage.tipo_usuario =
      userForStorage.login === "admin" || userForStorage.login === "gabriel"
        ? 2
        : 1; // Atualizar cache com versão sem senha
    cachedUser = userForStorage;
    cacheTimestamp = Date.now();

    try {
      // Usar sessionStorage e localStorage para persistência
      if (typeof window !== "undefined") {
        const userJson = JSON.stringify(userForStorage);
        sessionStorage.setItem("user", userJson);
        localStorage.setItem("user", userJson); // Definir também um cookie para o middleware com flags de segurança
        document.cookie = `user=${encodeURIComponent(
          userJson
        )}; path=/; max-age=86400; SameSite=Strict; HttpOnly; Secure`;
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

    // Gerar um ID único dentro do intervalo permitido para integer
    const usuario_id = Math.floor(Math.random() * 2147483647);
    const senhaHash = bcrypt.hashSync(password, SALT_ROUNDS);
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
      sessionStorage.removeItem("user"); // Limpar cookies definindo expiração no passado e mantendo flags de segurança
      document.cookie =
        "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; HttpOnly; Secure";
    }
  } catch (e) {
    secureLog(`Erro ao remover dados de usuário: ${e.message}`, true);
  } // Sempre limpar o cache independentemente de erros
  cachedUser = null;
  cacheTimestamp = null;
};

export const getCurrentUser = () => {
  // Usar cache primeiro para melhor performance, verificando TTL
  if (cachedUser && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedUser;
  }

  try {
    // Verificar primeiro sessionStorage (mais seguro)
    let userData = sessionStorage.getItem("user");

    // Cair para localStorage se não encontrar no sessionStorage
    if (!userData) {
      userData = localStorage.getItem("user");
    }
    if (!userData) return null;

    cachedUser = JSON.parse(userData);
    cacheTimestamp = Date.now();
    return cachedUser;
  } catch (e) {
    secureLog("Erro ao obter usuário do storage:", true);
    return null;
  }
};

// Novas funções para recuperação de senha
export async function requestPasswordReset(login) {
  try {
    // Verificar se é o usuário admin - proteção especial
    if (login.toLowerCase() === "admin") {
      throw new Error("Não é permitido alterar a senha do administrador.");
    }
    const supabase = getSupabaseClient("seguranca");

    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id")
      .eq("login", login)
      .single();
    if (userError || !userData) throw new Error("Usuário não encontrado");

    secureLog("Usuário encontrado para recuperação de senha", false);

    // Garantir que o usuario_id seja um número inteiro
    const usuario_id = parseInt(userData.usuario_id);

    if (isNaN(usuario_id)) {
      throw new Error("ID de usuário inválido");
    } // Gerar código de recuperação com 6 dígitos para adequar-se à coluna VARCHAR(6)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    secureLog("Código de recuperação gerado com sucesso");

    // Calcular expiração (1 hora)
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);
    try {
      secureLog(
        "Tentando inserir código de recuperação na tabela tbrecuperacao"
      );

      // Armazenar código de recuperação no banco de dados
      const { error } = await supabase.from("tbrecuperacao").insert([
        {
          usuario_id: usuario_id, // Usar o ID convertido para int
          codigo: resetCode,
          expira_em: expiration.toISOString(),
          utilizado: false,
        },
      ]);
      if (error) {
        secureLog("Erro na recuperação de senha", true);
        secureLog(
          "Continuando com código temporário sem salvar no banco de dados",
          false
        );
        // Continuar mesmo com erro (modo de fallback)
      }
    } catch (dbError) {
      secureLog("Exceção ao salvar na tabela tbrecuperacao", true);
      secureLog(
        "Continuando com código temporário sem salvar no banco de dados",
        false
      );
      // Continuar mesmo com erro (modo de fallback)
    }

    // Armazenar temporariamente no localStorage (apenas para ambiente de teste/desenvolvimento)
    if (typeof window !== "undefined") {
      try {
        // Salvar o código no localStorage com o login como chave
        const resetData = {
          codigo: resetCode,
          expira_em: expiration.toISOString(),
          usuario_id: usuario_id,
        };
        localStorage.setItem(`resetCode_${login}`, JSON.stringify(resetData));
      } catch (err) {
        secureLog("Erro ao salvar código no localStorage", true);
      }
    }

    // Em um sistema real, enviaríamos o código por email    // Retornamos o código apenas para facilitar o desenvolvimento
    return { success: true, resetCode };
  } catch (error) {
    secureLog("Erro na recuperação de senha", true);

    // Transformar erros técnicos em mensagens amigáveis
    if (error.message && error.message.includes("value too long for type")) {
      throw new Error(
        "Não foi possível gerar código de recuperação. Por favor, tente novamente."
      );
    } else {
      throw error;
    }
  }
}

export async function verifyResetCode(login, code) {
  try {
    // Validar o código de recuperação
    if (!code || code.length > 6) {
      throw new Error("Código de recuperação inválido");
    }

    const supabase = getSupabaseClient("seguranca");

    // Buscar usuário pelo login com select otimizado (apenas ID)
    const { data: userData, error: userError } = await supabase
      .from("tbusuarios")
      .select("usuario_id")
      .eq("login", login)
      .single();

    if (userError || !userData) throw new Error("Usuário não encontrado");

    // Garantir que o usuario_id seja um número inteiro
    const usuario_id = parseInt(userData.usuario_id);

    if (isNaN(usuario_id)) {
      throw new Error("ID de usuário inválido");
    }

    secureLog("Verificando código para usuário");

    // Buscar código de recuperação com consulta otimizada (selecionando apenas campos necessários)
    const { data: resetData, error: resetError } = await supabase
      .from("tbrecuperacao")
      .select("id, expira_em")
      .eq("usuario_id", usuario_id)
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

    // Verificar se é o usuário admin - proteção especial
    if (login.toLowerCase() === "admin") {
      throw new Error("Não é permitido alterar a senha do administrador.");
    }

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
    } // Marcar código como utilizado
    try {
      const { error: updateError } = await supabase
        .from("tbrecuperacao")
        .update({ utilizado: true })
        .eq("id", parseInt(resetId));
      if (updateError) {
        secureLog("Erro ao marcar código como utilizado", true);
        // Continuar mesmo se houver erro para não impedir a redefinição de senha
      }
    } catch (markError) {
      secureLog("Exceção ao marcar código como utilizado", true);
      // Continuar mesmo se houver erro para não impedir a redefinição de senha
    }

    // Garantir que o cache seja limpo
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      document.cookie =
        "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; HttpOnly; Secure;";
    }
    cachedUser = null;
    cacheTimestamp = null;

    return { success: true };
  } catch (error) {
    secureLog(`Erro ao resetar senha: ${error.message}`, true);
    throw error;
  }
}
