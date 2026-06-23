import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register");
  const isRootPage = pathname === "/";
  const isDashboardPage = pathname.startsWith("/dashboard");

  // 1. Si el usuario está autenticado e intenta ir a login, registro o raíz
  if (token && (isAuthPage || isRootPage)) {
    if (token.rol === "administrador") {
      return NextResponse.redirect(new URL("/dashboard/administrador", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/agricultor", request.url));
  }

  // 2. Si el usuario NO está autenticado e intenta acceder al dashboard o la raíz
  if (!token && isDashboardPage) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (!token && isRootPage) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // 3. Si el usuario está autenticado y accede al dashboard, validar roles
  if (token && isDashboardPage) {
    const userRol = token.rol;

    if (pathname.startsWith("/dashboard/administrador")) {
      if (userRol !== "administrador") {
        return NextResponse.redirect(new URL("/dashboard/agricultor", request.url));
      }
    } else {
      if (userRol === "administrador") {
        return NextResponse.redirect(new URL("/dashboard/administrador", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/auth/login",
    "/auth/register"
  ],
};
