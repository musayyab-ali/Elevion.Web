import Cookies from "js-cookie";
import api from "@/lib/api";
import {
  ACCESS_TOKEN_KEY,
  AUTH_EXPIRES_KEY,
  EXPIRES_IN_KEY,
  REFRESH_TOKEN_KEY,
  USER_ROLE_KEY,
} from "@/lib/auth-keys";

const DEFAULT_SESSION_SECONDS = 24 * 60 * 60;

export type AuthSessionData = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userRole?: string | number;
};

type CookieOptions = {
  expires: number;
  secure: boolean;
  sameSite: "Strict";
  path: string;
};

let logoutTimer: ReturnType<typeof setTimeout> | null = null;

function getCookieOptions(expiresInSeconds: number): CookieOptions {
  const cookieDays = expiresInSeconds / (24 * 60 * 60);

  return {
    expires: cookieDays > 0 ? cookieDays : 1 / 24,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/",
  };
}

function readNestedValue(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

export function parseAuthResponse(data: unknown): AuthSessionData | null {
  if (!data || typeof data !== "object") return null;

  const body = data as Record<string, unknown>;
  const nested =
    body.Data && typeof body.Data === "object"
      ? (body.Data as Record<string, unknown>)
      : body.data && typeof body.data === "object"
        ? (body.data as Record<string, unknown>)
        : null;

  const source = nested ?? body;

  const accessToken = readNestedValue(source, [
    "accessToken",
    "AccessToken",
    "access_token",
    "token",
    "Token",
  ]);

  if (typeof accessToken !== "string" || !accessToken.trim()) {
    return null;
  }

  const refreshToken = readNestedValue(source, [
    "refreshToken",
    "RefreshToken",
    "refresh_token",
  ]);

  const expiresInRaw = readNestedValue(source, [
    "expireIn",
    "expiresIn",
    "ExpiresIn",
    "expires_in",
    "AccessTokenExpiresIn",
  ]);

  const userRole = readNestedValue(source, [
    "userRole",
    "UserRole",
    "user_role",
  ]);

  const expiresIn =
    typeof expiresInRaw === "number"
      ? expiresInRaw
      : typeof expiresInRaw === "string"
        ? Number(expiresInRaw)
        : undefined;

  return {
    accessToken: accessToken.trim(),
    refreshToken:
      typeof refreshToken === "string" ? refreshToken.trim() : undefined,
    expiresIn: expiresIn && expiresIn > 0 ? expiresIn : undefined,
    userRole:
      typeof userRole === "string" || typeof userRole === "number"
        ? userRole
        : undefined,
  };
}

export function setAuthSessionFromResponse(data: unknown): boolean {
  const session = parseAuthResponse(data);
  if (!session) return false;

  setAuthSession(session);
  return true;
}

export function setAuthSession(session: AuthSessionData) {
  const expiresInSeconds = session.expiresIn ?? DEFAULT_SESSION_SECONDS;
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const options = getCookieOptions(expiresInSeconds);

  Cookies.set(ACCESS_TOKEN_KEY, session.accessToken, options);
  Cookies.set(AUTH_EXPIRES_KEY, String(expiresAt), options);
  Cookies.set(EXPIRES_IN_KEY, String(expiresInSeconds), options);

  if (session.refreshToken) {
    Cookies.set(REFRESH_TOKEN_KEY, session.refreshToken, options);
  }

  if (session.userRole !== undefined) {
    Cookies.set(USER_ROLE_KEY, String(session.userRole), options);
  }

  scheduleAutoLogout();
}

export function getAuthToken(): string | undefined {
  const token = Cookies.get(ACCESS_TOKEN_KEY);
  const expiresAt = Cookies.get(AUTH_EXPIRES_KEY);

  if (!token || !expiresAt || Date.now() > Number(expiresAt)) {
    clearAuthSession();
    return undefined;
  }

  return token;
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_KEY);
}

export function getUserRole(): string | undefined {
  return Cookies.get(USER_ROLE_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}

export function clearAuthSession() {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }

  const removeOptions = { path: "/" };
  Cookies.remove(ACCESS_TOKEN_KEY, removeOptions);
  Cookies.remove(REFRESH_TOKEN_KEY, removeOptions);
  Cookies.remove(EXPIRES_IN_KEY, removeOptions);
  Cookies.remove(USER_ROLE_KEY, removeOptions);
  Cookies.remove(AUTH_EXPIRES_KEY, removeOptions);
}

export function logout() {
  clearAuthSession();
}

function performAutoLogout() {
  logout();

  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login?expired=1";
  }
}

export function scheduleAutoLogout() {
  const expiresAt = Cookies.get(AUTH_EXPIRES_KEY);
  if (!expiresAt) return;

  const remaining = Number(expiresAt) - Date.now();

  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }

  if (remaining <= 0) {
    performAutoLogout();
    return;
  }

  logoutTimer = setTimeout(performAutoLogout, remaining);
}

export function initAuthSessionWatcher() {
  const token = getAuthToken();
  if (token) {
    scheduleAutoLogout();
  }
}

export async function loginWithCredentials(username: string, password: string) {
  let response;

  try {
    response = await api.post("/api/v1/oauth/token", {
      UserName: username,
      Password: password,
    });
  } catch {
    response = await api.post("/api/v1/oauth/token", {
      grant_type: "password",
      username,
      password,
    });
  }

  const saved = setAuthSessionFromResponse(response.data);
  if (!saved) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  return response.data;
}

export async function completeLoginAfterVerification(
  verifyResponseData: unknown,
  username: string,
) {
  if (setAuthSessionFromResponse(verifyResponseData)) {
    return true;
  }

  const regPassword =
    typeof window !== "undefined"
      ? sessionStorage.getItem("regPassword")
      : null;

  if (regPassword) {
    await loginWithCredentials(username, regPassword);
    sessionStorage.removeItem("regPassword");
    return true;
  }

  return false;
}
