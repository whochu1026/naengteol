import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "naengteol_token";
const PROTECTED = ["/dashboard", "/ingredients", "/plan", "/consumed", "/stats", "/trash", "/account"];
const AUTH_PAGES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(token ? "/dashboard" : "/login", request.url));
  }

  const isProtected = PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/ingredients/:path*", "/plan/:path*", "/consumed/:path*", "/stats/:path*", "/trash/:path*", "/account/:path*"],
};
