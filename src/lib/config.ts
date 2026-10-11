/**
 * The one place that reads environment variables. Everything else imports from here, so a missing or
 * misspelled variable is noticed once, in one place, instead of silently becoming "" in twenty files.
 *
 * NEXT_PUBLIC_* values are compiled into the browser bundle: they are configuration, never secrets.
 * Real protection (who may call what) is enforced by the API on every request.
 */

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** Base URL of the TheLink API, e.g. http://api.example.com (https as soon as the server has a certificate). */
export const API_URL: string =
  clean(process.env.NEXT_PUBLIC_API_URL) ||
  // legacy name of the same setting (it was misnamed ..._API_KEY); kept so existing deployments keep working
  clean(process.env.NEXT_PUBLIC_API_KEY);

/** Public address of this website, used for payment return URLs. */
export const SITE_URL: string = clean(process.env.NEXT_PUBLIC_SITE_URL);

const brand = Number(clean(process.env.NEXT_PUBLIC_BRAND_ID));
/** Tenant brand whose catalogue is shown (defaults to 1). */
export const BRAND_ID: number = Number.isFinite(brand) && brand > 0 ? brand : 1;

/** Shop name shown in the header, footer, page titles and emails-to-customer texts; every tenant sets its own. */
export const BRAND_NAME: string = clean(process.env.NEXT_PUBLIC_BRAND_NAME) || "Our Store";

/** Same-origin path the Next.js rewrite proxies to the API (see next.config.js). */
export const API_PROXY_PATH = "/api-backend";

/** Requests that take longer than this are cancelled instead of hanging the page. */
export const API_TIMEOUT_MS = 30_000;
