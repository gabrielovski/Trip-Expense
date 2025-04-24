import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rotas que não requerem autenticação - definidas uma única vez
const PUBLIC_ROUTES = ["/login", "/cadastro"];

export async function middleware(req) {
  const res = NextResponse.next();

  // Criação do cliente Supabase com configuração mínima necessária
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) =>
          res.cookies.set({ name, value, ...options }),
        remove: (name, options) =>
          res.cookies.set({ name, value: "", ...options }),
      },
    }
  );

  // Verificação de sessão otimizada
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  // Determinar se a rota atual é pública
  const path = req.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(path);

  // Redirecionamentos otimizados
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
