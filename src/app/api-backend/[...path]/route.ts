import { NextRequest, NextResponse } from "next/server";
import {
  backendConfig,
  extractAndScrubTokens,
  isAccessExpired,
  isSafeApiPath,
  isSameOrigin,
  isTokenEndpoint,
  SESSION_COOKIE_NAMES,
  sessionCookies,
  tokensFromRefreshResponse,
  type TokenSet,
} from "@/lib/server/session";
import { ACCESS_TOKEN_KEY, AUTH_EXPIRES_KEY, REFRESH_TOKEN_KEY, USER_ROLE_KEY } from "@/lib/auth-keys";

/**
 * Same-origin gateway to the TheLink API ("backend for frontend").
 *
 *  - the browser calls /api-backend/api/v1/...; this route forwards it to the API;
 *  - the API security key is added here, so it is no longer part of the browser bundle;
 *  - access / refresh tokens live in httpOnly cookies and are added here: JavaScript (and so XSS) can never read them;
 *  - an expired access token is refreshed here, transparently, so customers are not logged out mid-checkout;
 *  - it also removes the "https page calling an http API" mixed-content problem.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "accept-language", "if-none-match"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "cache-control", "etag", "content-language", "content-disposition"];

// One refresh per refresh token at a time: the API rotates refresh tokens, so two parallel refreshes would invalidate each other.
const refreshing = new Map<string, Promise<TokenSet | null>>();

function isSecureRequest(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return proto === "https";
}

function applySession(res: NextResponse, tokens: TokenSet, secure: boolean) {
  for (const c of sessionCookies(tokens, secure)) {
    res.cookies.set(c.name, c.value, { httpOnly: c.httpOnly, maxAge: c.maxAge, secure: c.secure, sameSite: c.sameSite, path: c.path });
  }
}

function clearSession(res: NextResponse) {
  for (const name of SESSION_COOKIE_NAMES) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
}

async function refreshTokens(baseUrl: string, securityKey: string, access: string, refresh: string, role?: string): Promise<TokenSet | null> {
  const existing = refreshing.get(refresh);
  if (existing) return existing;

  const work = (async () => {
    try {
      const upstream = await fetch(`${baseUrl}/api/v1/oauth/token/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json", "api-security-key": securityKey },
        body: JSON.stringify({ AccessToken: access, RefreshToken: refresh }),
        cache: "no-store",
      });
      if (!upstream.ok) return null;
      const body = await upstream.json().catch(() => null);
      return tokensFromRefreshResponse(body, role);
    } catch {
      return null;
    }
  })();

  refreshing.set(refresh, work);
  try {
    return await work;
  } finally {
    setTimeout(() => refreshing.delete(refresh), 5_000); // late arrivals reuse the result instead of refreshing again
  }
}

async function forward(
  req: NextRequest,
  url: string,
  securityKey: string,
  accessToken: string | undefined,
  body: ArrayBuffer | undefined,
): Promise<Response> {
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }
  headers.set("api-security-key", securityKey);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  return fetch(url, { method: req.method, headers, body, cache: "no-store", redirect: "manual" });
}

async function handle(req: NextRequest, ctx: { params: { path: string[] } }): Promise<NextResponse> {
  const segments = ctx.params.path ?? [];

  if (!isSafeApiPath(segments)) {
    return NextResponse.json({ Message: "Not found" }, { status: 404 });
  }
  if (!isSameOrigin(req.method, req.headers.get("origin"), req.headers.get("host"))) {
    return NextResponse.json({ Message: "Cross-site request refused" }, { status: 403 });
  }

  const { baseUrl, securityKey } = backendConfig(process.env);
  if (!baseUrl) {
    return NextResponse.json({ Message: "The API address is not configured (API_BACKEND_URL)." }, { status: 503 });
  }

  const secure = isSecureRequest(req);
  const path = segments.join("/");
  const url = `${baseUrl}/${path}${req.nextUrl.search}`;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

  let access = req.cookies.get(ACCESS_TOKEN_KEY)?.value;
  const refresh = req.cookies.get(REFRESH_TOKEN_KEY)?.value;
  const role = req.cookies.get(USER_ROLE_KEY)?.value;
  let refreshed: TokenSet | null = null;
  let sessionLost = false;

  // The access token is known to be (nearly) expired: renew it before the request instead of failing first.
  if (access && refresh && !isTokenEndpoint(path) && isAccessExpired(req.cookies.get(AUTH_EXPIRES_KEY)?.value)) {
    refreshed = await refreshTokens(baseUrl, securityKey, access, refresh, role);
    if (refreshed) access = refreshed.accessToken;
    else sessionLost = true;
  }

  let upstream: Response;
  try {
    upstream = await forward(req, url, securityKey, access, body);
  } catch {
    return NextResponse.json({ Message: "The server could not be reached. Please try again." }, { status: 502 });
  }

  // Rejected although we thought the token was fine (e.g. revoked / clock skew): one refresh and one retry.
  if (upstream.status === 401 && access && refresh && !isTokenEndpoint(path) && !refreshed && !sessionLost) {
    refreshed = await refreshTokens(baseUrl, securityKey, access, refresh, role);
    if (refreshed) {
      try {
        upstream = await forward(req, url, securityKey, refreshed.accessToken, body);
      } catch {
        return NextResponse.json({ Message: "The server could not be reached. Please try again." }, { status: 502 });
      }
    } else {
      sessionLost = true;
    }
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  let response: NextResponse;
  let issued: TokenSet | null = null;

  // A file download (e.g. the GDPR data export) is passed through untouched, even when it is JSON.
  const isFile = Boolean(upstream.headers.get("content-disposition"));

  if (contentType.includes("application/json") && !isFile) {
    const text = await upstream.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = undefined;
    }

    if (parsed === undefined) {
      response = new NextResponse(text, { status: upstream.status });
    } else {
      issued = upstream.ok ? extractAndScrubTokens(parsed) : null; // tokens leave through cookies only
      response = NextResponse.json(parsed, { status: upstream.status });
    }
  } else {
    response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status });
  }

  for (const name of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(name);
    if (v) response.headers.set(name, v);
  }
  response.headers.set("cache-control", response.headers.get("cache-control") ?? "no-store");

  const newTokens = issued ?? refreshed;
  if (newTokens) {
    applySession(response, newTokens, secure);
  } else if (sessionLost && upstream.status === 401) {
    clearSession(response);
    response.headers.set("x-session-expired", "1");
  }

  return response;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
