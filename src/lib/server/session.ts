/**
 * Server-side session helpers for the /api-backend proxy (see src/app/api-backend).
 *
 * The browser never sees an access or refresh token: the proxy keeps them in httpOnly cookies, adds the
 * Authorization header and the API security key itself, and refreshes the access token when it runs out.
 * This module is pure (no Next.js imports) so it can be unit-tested with `npm test`.
 */

import {
  ACCESS_TOKEN_KEY,
  AUTH_EXPIRES_KEY,
  AUTH_PROFILE_KEY,
  REFRESH_TOKEN_KEY,
  SESSION_UNTIL_KEY,
  USER_ROLE_KEY,
} from "../auth-keys.ts";

/** How long the refresh cookie (and so the "remember me" window) lives. The API may end it sooner. */
export const REFRESH_COOKIE_DAYS = 14;
export const DEFAULT_ACCESS_SECONDS = 60 * 60;

/** Placeholder returned to the browser instead of a real token. */
export const TOKEN_PLACEHOLDER = "[session]";

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  /** seconds until the access token expires */
  expiresIn: number;
  role?: string;
};

export type CookieSpec = {
  name: string;
  value: string;
  httpOnly: boolean;
  maxAge: number;
  secure: boolean;
  sameSite: "strict";
  path: "/";
};

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(obj: Json, keys: string[]): { key: string; value: string } | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim() && v !== TOKEN_PLACEHOLDER) return { key, value: v.trim() };
  }
  return null;
}

function pickNumber(obj: Json, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

const ACCESS_KEYS = ["AccessToken", "accessToken", "access_token"];
const REFRESH_KEYS = ["RefreshToken", "refreshToken", "refresh_token"];
const EXPIRES_KEYS = ["ExpiresIn", "expiresIn", "expireIn", "AccessTokenExpiresIn", "expires_in"];
const ROLE_KEYS = ["UserRole", "userRole", "user_role"];

/**
 * Finds the token pair anywhere in an API response (login, OTP verification and guest-checkout order responses all
 * carry one, at different depths), replaces the real tokens with a placeholder IN PLACE and returns them.
 * Returns null when the response holds no token pair.
 */
export function extractAndScrubTokens(body: unknown, depth = 0): TokenSet | null {
  if (!isObject(body) && !Array.isArray(body)) return null;
  if (depth > 6) return null;

  if (isObject(body)) {
    const access = pickString(body, ACCESS_KEYS);
    const refresh = pickString(body, REFRESH_KEYS);
    if (access && refresh) {
      const tokens: TokenSet = {
        accessToken: access.value,
        refreshToken: refresh.value,
        expiresIn: pickNumber(body, EXPIRES_KEYS) ?? DEFAULT_ACCESS_SECONDS,
        role: ROLE_KEYS.map((k) => body[k]).find((v) => typeof v === "string" || typeof v === "number")?.toString(),
      };
      body[access.key] = TOKEN_PLACEHOLDER;
      body[refresh.key] = TOKEN_PLACEHOLDER;
      return tokens;
    }
  }

  const children = Array.isArray(body) ? body : Object.values(body);
  for (const child of children) {
    const found = extractAndScrubTokens(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Cookies to set after login / refresh. Only the two tokens are httpOnly; the rest are harmless hints for the UI. */
export function sessionCookies(tokens: TokenSet, secure: boolean, nowMs = Date.now()): CookieSpec[] {
  const refreshSeconds = REFRESH_COOKIE_DAYS * 24 * 60 * 60;
  const base = { secure, sameSite: "strict" as const, path: "/" as const };
  const cookies: CookieSpec[] = [
    { ...base, name: ACCESS_TOKEN_KEY, value: tokens.accessToken, httpOnly: true, maxAge: refreshSeconds },
    { ...base, name: REFRESH_TOKEN_KEY, value: tokens.refreshToken, httpOnly: true, maxAge: refreshSeconds },
    { ...base, name: AUTH_EXPIRES_KEY, value: String(nowMs + tokens.expiresIn * 1000), httpOnly: false, maxAge: refreshSeconds },
    { ...base, name: SESSION_UNTIL_KEY, value: String(nowMs + refreshSeconds * 1000), httpOnly: false, maxAge: refreshSeconds },
  ];
  if (tokens.role !== undefined) {
    cookies.push({ ...base, name: USER_ROLE_KEY, value: tokens.role, httpOnly: false, maxAge: refreshSeconds });
  }
  const profile = profileFromAccessToken(tokens.accessToken);
  if (profile) {
    cookies.push({ ...base, name: AUTH_PROFILE_KEY, value: profile, httpOnly: false, maxAge: refreshSeconds });
  }
  return cookies;
}

/** Names of every cookie that makes up a session (used to clear it). */
export const SESSION_COOKIE_NAMES = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_EXPIRES_KEY, SESSION_UNTIL_KEY, USER_ROLE_KEY, AUTH_PROFILE_KEY];

const PROFILE_CLAIMS = ["FullName", "fullName", "name", "email", "UserName", "username", "unique_name", "sub"];

/**
 * Display hints for the header (name, email) read from the access token's payload. Nothing is verified here: the payload is
 * readable by anyone who holds the token, the value is only used to greet the user, and the API checks the real token.
 */
export function profileFromAccessToken(jwt: string): string | null {
  const part = jwt.split(".")[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as Record<string, unknown>;
    const picked: Record<string, string> = {};
    for (const claim of PROFILE_CLAIMS) {
      const v = payload[claim];
      if (typeof v === "string" && v.length <= 200) picked[claim] = v;
    }
    return Object.keys(picked).length ? JSON.stringify(picked) : null;
  } catch {
    return null;
  }
}

/** Only real API paths may be proxied (never the proxy's own routes, never path tricks). */
export function isSafeApiPath(segments: string[]): boolean {
  if (segments.length < 2 || segments[0] !== "api") return false;
  return segments.every((s) => s.length > 0 && s !== "." && s !== ".." && !/[\\/\0]/.test(s) && !s.includes("%2e") && !s.includes("%2E"));
}

/** Writes need a same-origin Origin header: with SameSite=Strict cookies this closes cross-site request forgery. */
export function isSameOrigin(method: string, origin: string | null, host: string | null): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Token endpoints must never be retried with a refresh (they ARE the refresh / login). */
export function isTokenEndpoint(path: string): boolean {
  return /\/oauth\/token(\/refresh)?\/?$/i.test(path);
}

export function backendConfig(env: Record<string, string | undefined>): { baseUrl: string; securityKey: string } {
  const baseUrl = (env.API_BACKEND_URL || env.NEXT_PUBLIC_API_URL || env.NEXT_PUBLIC_API_KEY || "").trim().replace(/\/$/, "");
  const securityKey = (env.API_SECURITY_KEY || env.NEXT_PUBLIC_SECURITY_KEY || "").trim();
  return { baseUrl, securityKey };
}

/** Is the access token (per its hint cookie) already past its expiry? Unknown counts as not expired. */
export function isAccessExpired(expiresAtHint: string | undefined, nowMs = Date.now()): boolean {
  if (!expiresAtHint) return false;
  const at = Number(expiresAtHint);
  return Number.isFinite(at) && nowMs >= at - 5_000; // refresh a few seconds early
}

/** Pulls a token pair out of the API's refresh response ({ Data: { AccessToken, RefreshToken, ExpiresIn } }). */
export function tokensFromRefreshResponse(body: unknown, fallbackRole?: string): TokenSet | null {
  const tokens = extractAndScrubTokens(structuredCloneJson(body));
  if (!tokens) return null;
  if (!tokens.role && fallbackRole) tokens.role = fallbackRole;
  return tokens;
}

function structuredCloneJson(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
