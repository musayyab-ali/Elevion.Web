import { isAuthenticated } from "@/lib/auth";
import { saveConsents } from "@/lib/privacy";
import { clearRecentlyViewed } from "@/lib/recently-viewed";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  NOTHING_OPTIONAL,
  buildChoice,
  categoriesToClear,
  parseChoice,
  readCookieValue,
  serializeChoice,
  toServerChoices,
  type CookieChoice,
  type StoredChoice,
} from "@/lib/cookie-consent-rules";

export const COOKIE_CONSENT_EVENT = "cookie-consent:changed";
export const OPEN_COOKIE_SETTINGS_EVENT = "cookie-consent:open";

/** The visitor's saved choice, or null when they have not chosen yet (or it has expired). */
export function getStoredChoice(): StoredChoice | null {
  if (typeof document === "undefined") return null;
  return parseChoice(readCookieValue(document.cookie), Date.now());
}

/** What may be used right now: before a choice is made, nothing optional. */
export function currentChoice(): CookieChoice {
  const stored = getStoredChoice();
  return stored ? { preferences: stored.preferences, analytics: stored.analytics } : NOTHING_OPTIONAL;
}

export const preferencesAllowed = (): boolean => currentChoice().preferences;
export const analyticsAllowed = (): boolean => currentChoice().analytics;

function clearCategories(what: { preferences: boolean; analytics: boolean }) {
  try {
    if (what.preferences) clearRecentlyViewed();
    if (what.analytics) window.sessionStorage.removeItem("activity:productViews");
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/** Saves the choice in a first-party cookie, wipes what was switched off, tells the page, and (when signed in) the shop's records. */
export function saveChoice(choice: CookieChoice): void {
  const before = getStoredChoice();
  const stored = buildChoice(choice, Date.now());
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeChoice(stored)}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;

  clearCategories(categoriesToClear(before ? { preferences: before.preferences, analytics: before.analytics } : null, choice));
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));

  if (isAuthenticated()) {
    void saveConsents(toServerChoices(choice)).catch(() => {
      /* the browser choice already applies; the account page can be used to retry */
    });
  }
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
