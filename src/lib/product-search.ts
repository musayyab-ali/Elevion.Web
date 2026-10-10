import api from "@/lib/api";
import { BRAND_ID } from "@/lib/config";
import { cachedRequest } from "@/lib/cache";
import { ProductType } from "@/type/ProductType";
import { mapLandingProductToProductType } from "@/lib/category-products";

/**
 * Search is done by the API (name / keyword match, paged), so the browser only ever receives the handful of
 * products it is about to show instead of downloading the whole catalogue first.
 */

export type SearchPage = { products: ProductType[]; total: number };

type RawProduct = Parameters<typeof mapLandingProductToProductType>[0];

type ByCategoryData = {
  TotalRecords?: number;
  productListViewModel?: RawProduct[];
  ProductListViewModel?: RawProduct[];
};

const SEARCH_CACHE_MS = 30_000;

async function requestPage(query: string, pageNumber: number, pageSize: number): Promise<SearchPage> {
  const res = await api.get("/api/v1/Product/by-category", {
    params: {
      BrandId: BRAND_ID,
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: "name",
      ...(query ? { ProductName: query } : {}),
    },
  });

  const data = ((res.data as { Data?: ByCategoryData })?.Data ?? {}) as ByCategoryData;
  const list = data.productListViewModel ?? data.ProductListViewModel ?? [];
  const products = list
    .filter((product) => Boolean((product as { ProductId?: number })?.ProductId))
    .map((product) => mapLandingProductToProductType(product));

  return { products, total: Number(data.TotalRecords) || products.length };
}

/** One page of matches for `query` (an empty query lists the catalogue). Repeated identical requests are shared for 30 s. */
export function searchCatalog(query: string, pageNumber = 1, pageSize = 8): Promise<SearchPage> {
  const q = query.trim().slice(0, 100);
  return cachedRequest(`search:${q.toLowerCase()}:${pageNumber}:${pageSize}`, SEARCH_CACHE_MS, () =>
    requestPage(q, Math.max(1, pageNumber), pageSize),
  );
}
