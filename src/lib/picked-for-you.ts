import type { RecentProduct } from "@/lib/recently-viewed";

/**
 * The category the customer looked at most (ties go to the most recently viewed one).
 * `recent` is newest first, as stored by recently-viewed.ts.
 */
export function topCategory(recent: RecentProduct[]): { id: number; name: string } | null {
  const counts = new Map<number, { count: number; firstIndex: number; name: string }>();

  recent.forEach((item, index) => {
    if (!item.categoryId) return;
    const entry = counts.get(item.categoryId);
    if (entry) entry.count += 1;
    else counts.set(item.categoryId, { count: 1, firstIndex: index, name: item.category ?? "" });
  });

  let best: { id: number; count: number; firstIndex: number; name: string } | null = null;
  const entries = Array.from(counts.entries());
  for (let i = 0; i < entries.length; i++) {
    const [id, entry] = entries[i];
    if (!best || entry.count > best.count || (entry.count === best.count && entry.firstIndex < best.firstIndex)) {
      best = { id, ...entry };
    }
  }
  return best ? { id: best.id, name: best.name } : null;
}

/** Suggestions never repeat what the customer has already looked at. */
export function excludeSeen<T extends { id: string | number }>(candidates: T[], recent: RecentProduct[]): T[] {
  const seen = new Set(recent.map((item) => String(item.id)));
  return candidates.filter((candidate) => !seen.has(String(candidate.id)));
}
