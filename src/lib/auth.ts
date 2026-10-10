import Cookies from "js-cookie";
import api, { onSessionExpired } from "@/lib/api";
import {
  AUTH_EXPIRES_KEY,
  AUTH_PROFILE_KEY,
  SESSION_UNTIL_KEY,
  USER_ROLE_KEY,
} from "@/lib/auth-keys";

/**
 * Browser side of the session.
 *
 * The real access / refresh tokens never reach JavaScript: the /api-backend proxy keeps them in httpOnly cookies
 * (see src/app/api-backend). What the browser can see are harmless hints: until when the session lasts, the role and
 * the name/email for the header. "Logged in" therefore means "the session hint is still in the future".
 */

export type AuthSessionData = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userRole?: string | number;
};

export type AuthProfile = {
  email: string;
  name: string | null;
  fullName: string | null;
  userName: string | null;
};

let logoutTimer: ReturnType<typeof setTimeout> | null = null;

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

/** Recognises a login-style response (the proxy has already moved the real tokens into cookies). */
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

  const userRole = readNestedValue(source, ["userRole", "UserRole", "user_role"]);

  return {
    accessToken: accessToken.trim(),
    userRole:
      typeof userRole === "string" || typeof userRole === "number"
        ? userRole
        : undefined,
  };
}

/**
 * Call with the body of a login / OTP-verification / guest-order response. The session itself was created by the
 * proxy (cookies); this only confirms the response was a login and starts the expiry timer.
 */
export function setAuthSessionFromResponse(data: unknown): boolean {
  const session = parseAuthResponse(data);
  if (!session) return false;

  scheduleAutoLogout();
  return true;
}

function sessionUntil(): number | null {
  const raw = Cookies.get(SESSION_UNTIL_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function isAuthenticated(): boolean {
  const until = sessionUntil();
  return until !== null && Date.now() < until;
}

/**
 * Kept for older callers: returns a marker string when logged in (never a real token) and undefined otherwise.
 * Use isAuthenticated() / getAuthProfile() in new code.
 */
export function getAuthToken(): string | undefined {
  return isAuthenticated() ? "session" : undefined;
}

export function getUserRole(): string | undefined {
  return Cookies.get(USER_ROLE_KEY);
}

/** Name and email for the header, as hinted by the server when the session was created. */
export function getAuthProfile(): AuthProfile | null {
  if (!isAuthenticated()) return null;
  const raw = Cookies.get(AUTH_PROFILE_KEY);
  if (!raw) return null;

  try {
    const claims = JSON.parse(raw) as Record<string, unknown>;
    const str = (...keys: string[]) => {
      for (const key of keys) {
        const v = claims[key];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return null;
    };
    return {
      email: str("email") ?? "",
      name: str("name"),
      fullName: str("FullName", "fullName"),
      userName: str("UserName", "username", "unique_name", "sub"),
    };
  } catch {
    return null;
  }
}

/** Forget the browser-side hints (the proxy clears the httpOnly cookies when logout() calls it). */
export function clearAuthSession() {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }

  const removeOptions = { path: "/" };
  for (const key of [AUTH_EXPIRES_KEY, SESSION_UNTIL_KEY, USER_ROLE_KEY, AUTH_PROFILE_KEY]) {
    Cookies.remove(key, removeOptions);
  }
}

/** Log out: clears the httpOnly cookies on the server and the hints here. Await it before navigating. */
export async function logout(): Promise<void> {
  clearAuthSession();
  try {
    await api.delete("/session", { baseURL: "/api-backend" });
  } catch {
    // Offline or already logged out: the local hints are gone, and the server cookies expire on their own.
  }
}

function performAutoLogout() {
  void logout().finally(() => {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?expired=1";
    }
  });
}

/** Ends the session in the browser when the server says it is over (refresh failed / expired). */
export function handleSessionExpired() {
  if (typeof window === "undefined") return;
  if (!isAuthenticated() && window.location.pathname.startsWith("/login")) return;
  performAutoLogout();
}

export function scheduleAutoLogout() {
  const until = sessionUntil();
  if (until === null) return;

  const remaining = until - Date.now();

  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }

  if (remaining <= 0) {
    performAutoLogout();
    return;
  }

  // setTimeout cannot wait longer than ~24.8 days
  logoutTimer = setTimeout(performAutoLogout, Math.min(remaining, 2_000_000_000));
}

export function initAuthSessionWatcher() {
  if (isAuthenticated()) {
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

/** After OTP verification the API signs the customer in; if it did not, the customer is sent to the login page. */
export function completeLoginAfterVerification(verifyResponseData: unknown): boolean {
  return setAuthSessionFromResponse(verifyResponseData);
}

onSessionExpired(handleSessionExpired);
