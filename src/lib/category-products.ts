import api from "@/lib/api";
import { ProductType } from "@/type/ProductType";
import {
  fetchFeaturedProducts,
  mapFeaturedProductToProductType,
} from "@/lib/featured-products";

export interface LandingPageProduct {
  ProductId: number;
  ProductDetailId?: number;
  ProductName: string;
  Description?: string;
  MinPrice?: number;
  MaxPrice?: number;
  MinDiscountedPrice?: number;
  MaxDiscountedPrice?: number;
  ThumbnailImagePath?: string;
  IconImagePath?: string;
  LargeImagePath?: string;
  IsNewProduct?: boolean;
  IsFeaturedProduct?: boolean;
  IsProductInStock?: boolean;
  IsPromotionalProduct?: boolean;
  IsCampaignApplied?: boolean;
  Discount?: number;
  DiscountValueType?: number;
  ComingSoon?: boolean;
  Status?: number;
  InventoryManagement?: boolean;
  AvailableStock?: number | null;
  Category?: {
    CategoryId: number;
    CategoryName: string;
  };
}

/** Hide out-of-stock products from listings (coming soon still visible). */
export function isLandingProductVisible(product: LandingPageProduct): boolean {
  if (product.ComingSoon) return true;
  if (product.IsProductInStock === false) return false;
  return true;
}

export function canPurchaseLandingProduct(product: LandingPageProduct): boolean {
  if (product.ComingSoon) return false;
  if (product.Status === 0) return false;
  if (product.IsProductInStock === false) return false;
  return true;
}

export type HomeProductTab = "best sellers" | "on sale" | "new arrivals";

interface ByCategoryResponse {
  Data?: {
    productListViewModel?: LandingPageProduct[];
    ProductListViewModel?: LandingPageProduct[];
    TotalRecords?: number;
  };
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

function getBrandId(): number {
  const brandId = Number(process.env.NEXT_PUBLIC_BRAND_ID?.trim());
  return Number.isFinite(brandId) && brandId > 0 ? brandId : 1;
}

export interface LandingPageCategoryGroup {
  Category?: {
    CategoryId: number;
    CategoryName: string;
    CategoryDescription?: string;
  };
  ProductList?: LandingPageProduct[];
}

interface LandingPageResponse {
  Data: LandingPageCategoryGroup[];
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

function getProductImage(product: LandingPageProduct): string {
  return (
    product.LargeImagePath ||
    product.ThumbnailImagePath ||
    product.IconImagePath ||
    "/images/product/1000x1000.png"
  );
}

export interface ResolvedProductPricing {
  price: number;
  originPrice: number;
  hasDiscount: boolean;
  discountPercent: number;
}

export function resolveLandingProductPricing(
  product: LandingPageProduct,
): ResolvedProductPricing {
  const basePrice = product.MinPrice ?? 0;
  const minDiscounted = product.MinDiscountedPrice ?? 0;
  const discountValue = product.Discount ?? 0;
  const discountValueType = product.DiscountValueType ?? 0;

  let price = basePrice;
  let originPrice = basePrice;

  // API sends MinDiscountedPrice when a real discount exists.
  if (minDiscounted > 0 && basePrice > 0 && minDiscounted < basePrice) {
    price = minDiscounted;
    originPrice = basePrice;
  } else if (minDiscounted > 0 && basePrice <= 0) {
    price = minDiscounted;
    originPrice = product.MaxPrice ?? minDiscounted;
  } else if (discountValue > 0 && basePrice > 0) {
    originPrice = basePrice;
    price =
      discountValueType === 1
        ? Math.max(0, basePrice - discountValue)
        : Math.round(basePrice * (1 - discountValue / 100));

    if (price <= 0 || price >= originPrice) {
      price = basePrice;
      originPrice = basePrice;
    }
  }

  const hasDiscount = originPrice > price && price > 0 && originPrice > 0;
  const discountPercent = hasDiscount
    ? Math.round(((originPrice - price) / originPrice) * 100)
    : 0;

  return { price, originPrice, hasDiscount, discountPercent };
}

export function mapLandingProductToProductType(
  product: LandingPageProduct,
  categoryName = "",
): ProductType {
  const image = getProductImage(product);
  const pricing = resolveLandingProductPricing(product);
  const inStock = product.IsProductInStock !== false;
  const comingSoon = Boolean(product.ComingSoon);

  return {
    id: String(product.ProductId),
    productDetailId: product.ProductDetailId,
    category: product.Category?.CategoryName || categoryName,
    type: "product",
    name: product.ProductName,
    gender: "",
    new: Boolean(product.IsNewProduct),
    sale: pricing.hasDiscount,
    rate: 5,
    price: pricing.price,
    originPrice: pricing.originPrice,
    brand: "",
    sold: 0,
    quantity: inStock ? 100 : 0,
    quantityPurchase: 1,
    sizes: [],
    variation: [],
    thumbImage: [image],
    images: [image],
    description: product.Description || "",
    action: "add to cart",
    slug: String(product.ProductId),
    isPromotional: Boolean(product.IsPromotionalProduct),
    isFeatured: Boolean(product.IsFeaturedProduct),
    discount: product.Discount ?? 0,
    discountType: product.DiscountValueType ?? 0,
    inventoryManagement: Boolean(product.InventoryManagement),
    availableStock: product.AvailableStock ?? null,
    comingSoon,
    status: product.Status ?? 1,
    inStock,
  };
}

function normalizeProductList(
  data: LandingPageProduct[] | LandingPageProduct | null | undefined,
): LandingPageProduct[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

async function fetchFromLandingPage(
  categoryId: number,
): Promise<ProductType[]> {
  const res = await api.get<LandingPageResponse>("/api/v1/Product/landing-page");
  const products: ProductType[] = [];
  const seen = new Set<number>();

  for (const group of res.data?.Data ?? []) {
    for (const product of group.ProductList ?? []) {
      if (!product?.ProductId || seen.has(product.ProductId)) continue;

      const productCategoryId =
        product.Category?.CategoryId ?? group.Category?.CategoryId;

      if (productCategoryId !== categoryId) continue;
      if (!isLandingProductVisible(product)) continue;

      seen.add(product.ProductId);
      products.push(
        mapLandingProductToProductType(
          product,
          group.Category?.CategoryName || product.Category?.CategoryName || "",
        ),
      );
    }
  }

  return products;
}

async function fetchFromFeatured(categoryId: number): Promise<ProductType[]> {
  const featured = await fetchFeaturedProducts();
  return featured
    .filter((product) => product.Category?.CategoryId === categoryId)
    .map(mapFeaturedProductToProductType);
}

function extractProductListFromByCategory(
  data: ByCategoryResponse["Data"] | LandingPageProduct[] | LandingPageProduct | null | undefined,
): LandingPageProduct[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return normalizeProductList(data);
  }

  return normalizeProductList(
    data.productListViewModel ?? data.ProductListViewModel ?? [],
  );
}

export async function fetchProductsByBrand(
  pageNumber = 1,
  pageSize = 50,
): Promise<LandingPageProduct[]> {
  const res = await api.get<ByCategoryResponse>("/api/v1/Product/by-category", {
    params: {
      BrandId: getBrandId(),
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: "name",
    },
  });

  return extractProductListFromByCategory(res.data?.Data).filter(
    (product) => Boolean(product?.ProductId) && isLandingProductVisible(product),
  );
}

export function filterProductsForHomeTab(
  products: LandingPageProduct[],
  tab: HomeProductTab,
): LandingPageProduct[] {
  const visible = products.filter(isLandingProductVisible);

  switch (tab) {
    case "best sellers":
      return visible.filter((product) => product.IsFeaturedProduct);
    case "new arrivals":
      return visible.filter((product) => product.IsNewProduct);
    case "on sale": {
      const remaining = visible.filter(
        (product) => !product.IsNewProduct && !product.IsFeaturedProduct,
      );

      if (remaining.length > 0) {
        return remaining;
      }

      return visible.filter((product) => !product.IsFeaturedProduct);
    }
    default:
      return visible;
  }
}

export async function fetchHomeTabProducts(
  tab: HomeProductTab,
  pageSize = 50,
): Promise<ProductType[]> {
  const products = await fetchProductsByBrand(1, pageSize);
  return filterProductsForHomeTab(products, tab).map((product) =>
    mapLandingProductToProductType(product),
  );
}

async function fetchFromCategoryProductApi(
  categoryId: number,
): Promise<ProductType[]> {
  const res = await api.get<ByCategoryResponse>("/api/v1/Product/by-category", {
    params: {
      CategoryId: categoryId,
      BrandId: getBrandId(),
      PageNumber: 1,
      PageSize: 50,
      SortBy: "name",
    },
  });

  return extractProductListFromByCategory(res.data?.Data)
    .filter((product) => Boolean(product?.ProductId))
    .map((product) => mapLandingProductToProductType(product));
}

export async function fetchAllLandingProducts(): Promise<ProductType[]> {
  const res = await api.get<LandingPageResponse>("/api/v1/Product/landing-page");
  const products: ProductType[] = [];
  const seen = new Set<number>();

  for (const group of res.data?.Data ?? []) {
    const categoryName =
      group.Category?.CategoryName || "";

    for (const product of group.ProductList ?? []) {
      if (!product?.ProductId || seen.has(product.ProductId)) continue;

      seen.add(product.ProductId);
      products.push(
        mapLandingProductToProductType(
          product,
          product.Category?.CategoryName || categoryName,
        ),
      );
    }
  }

  return products;
}

export function filterProductsByQuery(
  products: ProductType[],
  query: string,
): ProductType[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return products;

  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword) ||
      product.description.toLowerCase().includes(keyword),
  );
}

export async function fetchProductsByCategoryId(
  categoryId: number,
): Promise<ProductType[]> {
  const seen = new Set<string>();
  const merged: ProductType[] = [];

  const sources = [
    () => fetchFromLandingPage(categoryId),
    () => fetchFromCategoryProductApi(categoryId),
    () => fetchFromFeatured(categoryId),
  ];

  for (const load of sources) {
    try {
      const items = await load();
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    } catch {
      // Try next source
    }
  }

  return merged;
}


