/**
 * "Use it soon" hint for a voucher that is about to expire. The API sends UTC times, sometimes without a
 * time-zone suffix, so a missing suffix is read as UTC. Returns null when no warning is needed
 * (no expiry, far away, or already past: the voucher status covers that case).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_WARNING_DAYS = 7;

export function parseApiDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function expiryHint(expiresOn: string | null | undefined, now: Date = new Date()): string | null {
  const expires = parseApiDate(expiresOn);
  if (!expires) return null;

  const msLeft = expires.getTime() - now.getTime();
  if (msLeft <= 0) return null;

  // Counted in the customer's own calendar days, so "today" and "tomorrow" mean what they expect.
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(expires) - startOfDay(now)) / DAY_MS);
  if (days > EXPIRY_WARNING_DAYS) return null;
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}
