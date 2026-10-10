/**
 * "Recently viewed" products, kept only in this browser (localStorage): nothing about it is sent to the server.
 * Only public catalogue facts are stored (id, name, image, price), never anything about the customer.
 */

export type RecentProduct = {
  id: number;
  detailId?: number;
  name: string;
  image: string;
  price: number;
  category?: string;
  categoryId?: number;
};

const KEY = "recently_viewed_v1";
const MAX_ITEMS = 12;
export const RECENTLY_VIEWED_EVENT = "recently-viewed:changed";

function isRecent(value: unknown): value is RecentProduct {
  const v = value as RecentProduct;
  return Boolean(v) && typeof v.id === "number" && typeof v.name === "string" && typeof v.image === "string" && typeof v.price === "number";
}

export function getRecentlyViewed(): RecentProduct[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isRecent).slice(0, MAX_ITEMS) : [];
  } catch {
    // Storage blocked (private mode) or corrupted: behave as if nothing was viewed.
    return [];
  }
}

/** Puts the product first; a product seen again moves up instead of being listed twice. */
export function addRecentlyViewed(product: RecentProduct): void {
  try {
    const rest = getRecentlyViewed().filter((p) => p.id !== product.id);
    window.localStorage.setItem(KEY, JSON.stringify([product, ...rest].slice(0, MAX_ITEMS)));
    window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
  } catch {
    // Not being able to remember a product must never affect the page.
  }
}

export function clearRecentlyViewed(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
  } catch {
    // ignore
  }
}
