export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const EXPIRES_IN_KEY = "expireIn";
export const USER_ROLE_KEY = "userRole";
export const AUTH_EXPIRES_KEY = "auth_expires_at";

/** @deprecated use ACCESS_TOKEN_KEY */
export const AUTH_TOKEN_KEY = ACCESS_TOKEN_KEY;

export const AUTH_COOKIE_KEYS = [
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXPIRES_IN_KEY,
  USER_ROLE_KEY,
  AUTH_EXPIRES_KEY,
] as const;
