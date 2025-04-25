import { NextResponse } from "next/server";

// Rotas que não requerem autenticação
const PUBLIC_ROUTES = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/recuperar-senha/codigo",
  "/recuperar-senha/nova-senha",
];

// Função auxiliar para verificar se a URL atual é uma rota pública
function isPublicRoute(path) {
  return PUBLIC_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}

export async function middleware(req) {
  const res = NextResponse.next();

  // Obter o caminho da URL sem query parameters
  const path = new URL(req.url).pathname;

  // Verificar se é uma rota pública
  const isPublic = isPublicRoute(path);

  // Verificar se já existe uma sessão
  let session = null;
  try {
    const cookieStore = req.cookies;
    const userCookie = cookieStore.get("user");

    if (userCookie?.value) {
      try {
        session = JSON.parse(decodeURIComponent(userCookie.value));
      } catch (e) {
        console.error("Erro ao analisar cookie de usuário:", e);
      }
    }
  } catch (e) {
    console.error("Erro ao verificar autenticação:", e);
  }

  // Redirecionar baseado em autenticação e tipo de rota
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
