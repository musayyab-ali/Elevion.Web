/**
 * Server side: reads the shop's branding from the API once a minute (Next caches the answer), so every page of the storefront
 * gets the shop's name, contact details, theme, benefits, social links and pages without a request per visitor.
 * When the API cannot be reached the last good answer is used for a while, and after that a neutral default: the site never fails because of this.
 */
import { API_URL, BRAND_NAME } from "@/lib/config";
import { Branding, defaultBranding, parseBranding } from "@/lib/branding-model";
import { ThemeTokens, getServerTheme } from "@/lib/theme";

const REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 4000;

let lastGood: Branding | null = null;

export async function fetchBranding(): Promise<Branding> {
  const base = (process.env.API_BACKEND_URL || API_URL || "").replace(/\/+$/, "");
  if (!base) return lastGood ?? defaultBranding(BRAND_NAME);

  try {
    const response = await fetch(`${base}/api/v1/TenantLanding/branding`, {
      headers: { "api-security-key": process.env.API_SECURITY_KEY ?? "", Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { Data?: unknown };
    lastGood = parseBranding(body?.Data, BRAND_NAME);
    return lastGood;
  } catch (error) {
    console.error("Failed to fetch branding:", error instanceof Error ? error.message : error);
    return lastGood ?? defaultBranding(BRAND_NAME);
  }
}

/** The theme to write into the page: the shop's colours on top of the build-time theme (which is what shows when the API is away). */
export function themeFor(branding: Branding): ThemeTokens {
  return { ...getServerTheme(), ...branding.theme.colors };
}
