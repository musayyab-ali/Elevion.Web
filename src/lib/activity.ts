import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { isReportableProduct, shouldReportView } from "@/lib/activity-rules";

const STORAGE_KEY = "activity:productViews";
const MAX_REMEMBERED = 100;

function readLast(): Record<string, number> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLast(map: Record<string, number>) {
  try {
    // Keep the list short: drop the oldest entries.
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, MAX_REMEMBERED);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* storage blocked: the server still counts a repeat only once per visit */
  }
}

/**
 * Tells the shop that the signed-in customer opened a product (used for "still thinking about it?" advice).
 * Fire and forget: it never throws and never shows anything. The server only records it for customers who agreed to
 * analytics or personalization, and does nothing for everyone else. Guests are never reported.
 */
export function trackProductView(productId: unknown): void {
  if (typeof window === "undefined" || !isReportableProduct(productId) || !isAuthenticated()) return;

  const now = Date.now();
  const last = readLast();
  if (!shouldReportView(last[String(productId)], now)) return;

  last[String(productId)] = now;
  writeLast(last);
  void api.post("/api/v1/CustomerActivity/ProductViewed", { ProductId: productId }).catch(() => {
    /* a missing view is not worth an error message */
  });
}
