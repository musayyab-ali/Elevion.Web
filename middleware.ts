import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_KEY, AUTH_COOKIE_KEYS, AUTH_EXPIRES_KEY } from "@/lib/auth-keys";

const PROTECTED_ROUTES = [
  "/my-account",
  "/checkout",
  "/checkout2",
  "/order-tracking",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function clearAuthCookies(response: NextResponse) {
  AUTH_COOKIE_KEYS.forEach((key) => {
    response.cookies.delete(key);
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  const expiresAt = request.cookies.get(AUTH_EXPIRES_KEY)?.value;
  const isExpired = !expiresAt || Date.now() > Number(expiresAt);

  if (!token || isExpired) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    if (isExpired && token) {
      loginUrl.searchParams.set("expired", "1");
    }

    const response = NextResponse.redirect(loginUrl);
    clearAuthCookies(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/my-account/:path*",
    "/checkout/:path*",
    "/checkout2/:path*",
    "/order-tracking/:path*",
  ],
};
