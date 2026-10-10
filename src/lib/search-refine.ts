/**
 * Sorting and filtering of search results inside the browser. The API returns matches in name order only
 * (it ignores other sort values), so price / newest ordering is done here on the fetched matches.
 * Pure functions, no imports from the app: easy to test.
 */

export type RefinableProduct = {
  name: string;
  category: string;
  price: number;
  new: boolean;
  sale: boolean;
  inStock?: boolean;
  comingSoon?: boolean;
};

export type SortKey = "relevance" | "price-asc" | "price-desc" | "newest" | "name";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Best match" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "newest", label: "New arrivals" },
  { key: "name", label: "Name A-Z" },
];

export type Refinement = {
  sort: SortKey;
  /** Empty = every category. */
  category: string;
  inStockOnly: boolean;
  onSaleOnly: boolean;
};

export const DEFAULT_REFINEMENT: Refinement = { sort: "relevance", category: "", inStockOnly: false, onSaleOnly: false };

export function isSellable(product: RefinableProduct): boolean {
  // An unknown stock state counts as available: the API only says "out of stock" when it knows.
  return product.inStock !== false && !product.comingSoon;
}

/** Name matches rank before category-only matches; the API's own order is kept inside each group. */
function relevanceRank(product: RefinableProduct, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const name = product.name.toLowerCase();
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  return 3;
}

export function refineProducts<T extends RefinableProduct>(products: T[], refinement: Refinement, query = ""): T[] {
  let list = products.filter(
    (p) =>
      (!refinement.category || p.category === refinement.category) &&
      (!refinement.inStockOnly || isSellable(p)) &&
      (!refinement.onSaleOnly || p.sale),
  );

  // Array.prototype.sort is stable, so equal items keep the API's order.
  switch (refinement.sort) {
    case "price-asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "newest":
      list = [...list].sort((a, b) => Number(b.new) - Number(a.new));
      break;
    case "name":
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      list = [...list].sort((a, b) => relevanceRank(a, query) - relevanceRank(b, query));
  }
  return list;
}

/** Categories present in the results with how many products each has, biggest first. */
export function categoryFacets(products: RefinableProduct[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const name = p.category?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
