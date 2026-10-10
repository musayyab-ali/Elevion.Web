import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_KEYS, REFRESH_TOKEN_KEY, SESSION_UNTIL_KEY } from "@/lib/auth-keys";

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

/**
 * A page is let through while a login session exists. The access token itself is renewed by the /api-backend proxy on
 * the first API call, so an expired access token does not matter here; only the end of the whole session does
 * (refresh cookie gone, or its hint in the past). Real authorization is always enforced by the API.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_KEY)?.value;
  const sessionUntil = Number(request.cookies.get(SESSION_UNTIL_KEY)?.value);
  const hasSession = Boolean(refreshToken) && Number.isFinite(sessionUntil) && Date.now() < sessionUntil;

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    if (refreshToken) {
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
