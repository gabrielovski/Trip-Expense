import { getSupabaseClient } from "./supabaseClient";
import bcrypt from "bcryptjs";

export async function signIn(login, password) {
  const supabase = getSupabaseClient("seguranca");
  const { data: userData, error: userError } = await supabase
    .from("tbusuarios")
    .select("*")
    .eq("login", login)
    .single();

  if (userError || !userData) throw new Error("Usuário não encontrado");
  if (!(await bcrypt.compare(password, userData.senha)))
    throw new Error("Senha incorreta");
  return { user: userData };
}

export async function signUp(login, password, nome) {
  const supabase = getSupabaseClient("seguranca");
  const { data: existingUser } = await supabase
    .from("tbusuarios")
    .select("login")
    .eq("login", login)
    .single();

  if (existingUser) throw new Error("Este login já está em uso");

  const usuario_id =
    parseInt(
      Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
      36
    ) % 1000000000;
  const { error } = await supabase.from("tbusuarios").insert([
    {
      usuario_id,
      nome,
      login,
      senha: await bcrypt.hash(password, 10),
      atualizado_em: new Date().toISOString(),
    },
  ]);

  if (error) throw new Error(error.message);
  return signIn(login, password);
}

export const signOut = () => localStorage.removeItem("user");
export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};
