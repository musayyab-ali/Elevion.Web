export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const EXPIRES_IN_KEY = "expireIn";
export const USER_ROLE_KEY = "userRole";
export const AUTH_EXPIRES_KEY = "auth_expires_at";
/** Readable hint (not a secret): until when the refresh cookie, and so the logged-in session, is valid. */
export const SESSION_UNTIL_KEY = "auth_session_until";
/** Readable display hints (name / email) taken from the access token on the server; the token itself stays httpOnly. */
export const AUTH_PROFILE_KEY = "auth_profile";

/** @deprecated use ACCESS_TOKEN_KEY */
export const AUTH_TOKEN_KEY = ACCESS_TOKEN_KEY;

export const AUTH_COOKIE_KEYS = [
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXPIRES_IN_KEY,
  USER_ROLE_KEY,
  AUTH_EXPIRES_KEY,
  SESSION_UNTIL_KEY,
  AUTH_PROFILE_KEY,
] as const;

