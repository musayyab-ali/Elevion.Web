import api from "@/lib/api";
import { ProductType } from "@/type/ProductType";
import {
  fetchAllLandingProducts,
  filterProductsByQuery,
  mapLandingProductToProductType,
} from "@/lib/category-products";
import {
  fetchFeaturedProducts,
  mapFeaturedProductToProductType,
} from "@/lib/featured-products";

export { filterProductsByQuery };

function getBrandId(): number {
  const brandId = Number(process.env.NEXT_PUBLIC_BRAND_ID?.trim());
  return Number.isFinite(brandId) && brandId > 0 ? brandId : 1;
}

let cachedProducts: ProductType[] | null = null;
let cachePromise: Promise<ProductType[]> | null = null;

async function fetchFromByCategoryApi(): Promise<ProductType[]> {
  const res = await api.get("/api/v1/Product/by-category", {
    params: {
      BrandId: getBrandId(),
      PageNumber: 1,
      PageSize: 10,
      SortBy: "name",
    },
  });

  const data = res.data?.Data;
  const list =
    data?.productListViewModel ?? data?.ProductListViewModel ?? [];

  return list
    .filter((product: { ProductId?: number }) => Boolean(product?.ProductId))
    .map((product: Parameters<typeof mapLandingProductToProductType>[0]) =>
      mapLandingProductToProductType(product),
    );
}

async function loadAllSearchableProducts(): Promise<ProductType[]> {
  const seen = new Set<string>();
  const merged: ProductType[] = [];

  const addProducts = (items: ProductType[]) => {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  };

  try {
    addProducts(await fetchFromByCategoryApi());
  } catch {
    // Continue to landing page fallback
  }

  try {
    addProducts(await fetchAllLandingProducts());
  } catch {
    // Continue to featured fallback
  }

  try {
    const featured = await fetchFeaturedProducts();
    addProducts(featured.map(mapFeaturedProductToProductType));
  } catch {
    // No more fallbacks
  }

  return merged;
}

export async function getSearchableProducts(
  forceRefresh = false,
): Promise<ProductType[]> {
  if (!forceRefresh && cachedProducts) {
    return cachedProducts;
  }

  if (!forceRefresh && cachePromise) {
    return cachePromise;
  }

  cachePromise = loadAllSearchableProducts()
    .then((products) => {
      cachedProducts = products;
      return products;
    })
    .finally(() => {
      cachePromise = null;
    });

  return cachePromise;
}

export async function searchProducts(query: string): Promise<ProductType[]> {
  const products = await getSearchableProducts();
  return filterProductsByQuery(products, query);
}

export function getSuggestedProducts(
  products: ProductType[],
  query: string,
  limit = 6,
): ProductType[] {
  if (!query.trim()) {
    return products.filter((product) => product.new || product.sale).slice(0, limit);
  }

  return filterProductsByQuery(products, query).slice(0, limit);
}
