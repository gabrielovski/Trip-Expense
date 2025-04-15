import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req) {
  const res = NextResponse.next();

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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rotas que não requerem autenticação
  const publicRoutes = ["/login", "/cadastro"];
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);

  if (!session && !isPublicRoute) {
    // Redireciona para login se não estiver autenticado e tentar acessar rota protegida
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session && isPublicRoute) {
    // Redireciona para dashboard se estiver autenticado e tentar acessar login/cadastro
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
