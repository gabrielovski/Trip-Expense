import { getSupabaseClient } from "../supabaseClient";
import bcrypt from "bcryptjs";

export async function signIn(login, password) {
  const supabase = getSupabaseClient("seguranca");

  // Buscar o usuário pelo login
  const { data: userData, error: userError } = await supabase
    .from("tbusuarios")
    .select("*")
    .eq("login", login)
    .single();

  if (userError || !userData) {
    throw new Error("Usuário não encontrado");
  }

  // Verificar a senha usando bcrypt.compare
  const senhaCorreta = await bcrypt.compare(password, userData.senha);
  if (!senhaCorreta) {
    throw new Error("Senha incorreta");
  }

  return { user: userData };
}

export async function signUp(login, password, nome) {
  const supabase = getSupabaseClient("seguranca");

  // Verificar se o login já existe
  const { data: existingUser } = await supabase
    .from("tbusuarios")
    .select("login")
    .eq("login", login)
    .single();

  if (existingUser) {
    throw new Error("Este login já está em uso");
  }

  // Gerar um ID único para o usuário usando o timestamp atual + random
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const usuario_id = parseInt(timestamp + random, 36) % 1000000000; // Garantir que seja menor que 1 bilhão

  // Criar o registro do usuário
  const { data: newUser, error } = await supabase
    .from("tbusuarios")
    .insert([
      {
        usuario_id,
        nome,
        login,
        senha: password, // Em um sistema real, você deve hash a senha
        atualizado_em: new Date().toISOString(),
        atualizado_por: null, // Será atualizado quando tivermos o ID do usuário que fez a alteração
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { user: newUser };
}

export async function signOut() {
  // Limpar o estado local da aplicação
  localStorage.removeItem("user");
}

export async function getCurrentUser() {
  // Obter usuário do localStorage
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
