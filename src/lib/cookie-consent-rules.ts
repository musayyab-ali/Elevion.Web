/**
 * Cookie / browser-storage choice, pure rules (no browser access, so they can be tested).
 *
 * Strictly necessary storage (sign-in, cart, checkout, this choice itself) needs no consent and is never switched off.
 * Everything else is OFF until the visitor says yes:
 *  - preferences: "recently viewed" and "picked for you" (kept in this browser only)
 *  - analytics: telling the shop which products a signed-in customer looked at
 */

export const CONSENT_COOKIE = "cookie_consent";
/** Bump when the categories change: everyone is asked again. */
export const CONSENT_VERSION = 1;
/** Ask again after about six months. */
export const CONSENT_DAYS = 180;
export const CONSENT_MAX_AGE_SECONDS = CONSENT_DAYS * 24 * 60 * 60;

export type CookieChoice = { preferences: boolean; analytics: boolean };
export type StoredChoice = CookieChoice & { version: number; at: number };

export const NOTHING_OPTIONAL: CookieChoice = { preferences: false, analytics: false };

export function buildChoice(choice: CookieChoice, now: number): StoredChoice {
  return { version: CONSENT_VERSION, at: now, preferences: choice.preferences === true, analytics: choice.analytics === true };
}

export function serializeChoice(stored: StoredChoice): string {
  return encodeURIComponent(JSON.stringify(stored));
}

/** Returns the stored choice, or null when there is none, it is damaged, from an older version or older than the allowed time (then the visitor is asked again). */
export function parseChoice(raw: string | null | undefined, now: number): StoredChoice | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<StoredChoice>;
    if (!value || typeof value !== "object") return null;
    if (value.version !== CONSENT_VERSION) return null;
    if (typeof value.at !== "number" || !Number.isFinite(value.at)) return null;
    if (value.at > now + 60_000) return null;                                    // from the future: clock trouble or tampering
    if (now - value.at > CONSENT_MAX_AGE_SECONDS * 1000) return null;
    return { version: value.version, at: value.at, preferences: value.preferences === true, analytics: value.analytics === true };
  } catch {
    return null;
  }
}

export function readCookieValue(cookieHeader: string | null | undefined, name: string = CONSENT_COOKIE): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

/** The consent types the server stores (same numbers as the API: Personalization = 4, AnalyticsCookies = 5). */
export const SERVER_CONSENT = { personalization: 4, analytics: 5 } as const;

export function toServerChoices(choice: CookieChoice): { type: number; isGranted: boolean }[] {
  return [
    { type: SERVER_CONSENT.personalization, isGranted: choice.preferences },
    { type: SERVER_CONSENT.analytics, isGranted: choice.analytics },
  ];
}

/** What has to be wiped when a category is switched off (it was on before, or unknown). */
export function categoriesToClear(before: CookieChoice | null, after: CookieChoice): { preferences: boolean; analytics: boolean } {
  return {
    preferences: !after.preferences && (before === null || before.preferences),
    analytics: !after.analytics && (before === null || before.analytics),
  };
}
