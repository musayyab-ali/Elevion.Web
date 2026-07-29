import api from "@/lib/api";
import { fetchFeaturedProducts } from "@/lib/featured-products";

export interface ProductVariantCombination {
  ProductDetailId: number;
  VariantId: number;
  VariantGroupId: number;
  VariantName: string;
  Price: number;
  DiscountedPrice: number;
  SKU: string;
  ProductVariantCombinationId: number;
  ProductId: number;
  IsPromotional: boolean;
  IsCampaignApplied: boolean;
  Discount: number;
  DiscountType: number;
  SortOrder: number;
  InStock: boolean;
  ImageName: string;
  TotalStock: number;
  AvailableStock: number | null;
  InventoryManagement: boolean;
}

export interface ProductImage {
  ProductImageId: number;
  ImageName: string;
  IconImagePath: string;
  LargeImagePath: string;
  OriginalImagePath: string;
  IsDefault: boolean;
  SortOrder: number;
}

export interface ProductVariantGroup {
  VariantGroupId: number;
  VariantGroupName: string;
  ProductDetails: unknown[];
}

export interface RelatedProduct {
  ProductId: number;
  ProductName: string;
  IsPromotionalProduct: boolean;
  IsFeaturedProduct: boolean;
  IsNewProduct: boolean;
  ThumbnailImagePath: string;
  Category: {
    CategoryId: number;
    CategoryName: string;
    CategoryDescription: string;
    Seo: {
      MetaTitle: string | null;
      MetaDescription: string | null;
      UrlSlug: string | null;
      MetaKeywords: string | null;
    };
  };
  Seo: {
    MetaTitle: string | null;
    MetaDescription: string | null;
    UrlSlug: string | null;
    MetaKeywords: string | null;
  };
}

export interface ProductDetailData {
  ProductId: number;
  ProductDetailId: number;
  Name: string;
  Description: string;
  LongDescription: string;
  UnitShortName: string | null;
  ProductVariantDetail: {
    productVariantCombinationList: ProductVariantCombination[];
  };
  RelatedProductIds: number[];
  relatedProductList: RelatedProduct[];
  ProductImages: ProductImage[];
  WishItemList: unknown[];
  InStock: boolean;
  Category: string;
  CategoryId: number;
  ProductImageCount: number;
  DiscountValueType: number;
  Discount: number;
  IsCampaignApplied: boolean;
  IsPromotional: boolean;
  IsCustomProduct: boolean;
  IsFeaturedProduct?: boolean;
  IsNewProduct?: boolean;
  Status: number;
  ProductVariantGroups: ProductVariantGroup[];
  MinPrice: number;
  MaxPrice: number;
  noImage: string | null;
  AverageRating: number;
  EnableSubmitRatingReviews: boolean;
  EnableRatingReviewsFromSettings: boolean;
  Tags: string;
  BrandId: number;
  BrandName: string | null;
  DefaultSKU: string;
  IsAvaliableForSelectedLocation: boolean;
  InventoryManagement: boolean;
  SizeChartImageUrl: string | null;
  Seo: {
    MetaTitle: string | null;
    MetaDescription: string | null;
    UrlSlug: string | null;
    MetaKeywords: string | null;
  };
  TenantInventoryManagementFlag: boolean;
  ComingSoon: boolean;
}

interface ProductDetailResponse {
  Data: ProductDetailData;
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

type LandingPageProduct = {
  ProductId: number;
  ProductDetailId?: number;
};

const PLACEHOLDER_IMAGE_PATTERNS = ["large_noImage", "noImage"];

export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  return PLACEHOLDER_IMAGE_PATTERNS.some((pattern) => url.includes(pattern));
}

export function getProductImages(detail: ProductDetailData): string[] {
  const galleryImages = (detail.ProductImages ?? [])
    .map(
      (image) =>
        image.LargeImagePath || image.OriginalImagePath || image.IconImagePath,
    )
    .filter((url) => url && !isPlaceholderImage(url));

  if (galleryImages.length > 0) {
    return galleryImages;
  }

  const variantImage =
    detail.ProductVariantDetail?.productVariantCombinationList?.find(
      (variant) => variant.ImageName && !isPlaceholderImage(variant.ImageName),
    )?.ImageName;

  if (variantImage) {
    return [variantImage];
  }

  return ["/images/product/1000x1000.png"];
}

/**
 * Always use variant.ImageName from API response when present.
 * Do not replace it with product gallery images.
 */
export function getVariantDisplayImage(
  variant: ProductVariantCombination,
  detail?: ProductDetailData,
): string {
  const imageName = variant.ImageName?.trim();
  if (imageName) {
    return imageName;
  }

  if (detail) {
    return getProductImages(detail)[0] ?? "/images/product/1000x1000.png";
  }

  return "/images/product/1000x1000.png";
}

export function getDisplayImages(
  detail: ProductDetailData,
  selectedVariant?: ProductVariantCombination | null,
): string[] {
  const galleryImages = getProductImages(detail);

  if (!selectedVariant) {
    return galleryImages;
  }

  // Use exact ImageName from selected variant when API provides it.
  const variantImageName = selectedVariant.ImageName?.trim();
  if (variantImageName) {
    if (galleryImages.includes(variantImageName)) {
      return [
        variantImageName,
        ...galleryImages.filter((img) => img !== variantImageName),
      ];
    }
    return [variantImageName, ...galleryImages];
  }

  return galleryImages;
}

export function getVariantPrice(variant: ProductVariantCombination): number {
  return variant.DiscountedPrice > 0 ? variant.DiscountedPrice : variant.Price;
}

export function getDetailSalePrice(detail: ProductDetailData): number {
  const discount = detail.Discount ?? 0;
  const discountValueType = detail.DiscountValueType ?? 0;

  if (discount > 0 && detail.MinPrice > 0) {
    const discounted =
      discountValueType === 1
        ? Math.max(0, detail.MinPrice - discount)
        : Math.round(detail.MinPrice * (1 - discount / 100));

    if (discounted > 0 && discounted < detail.MinPrice) {
      return discounted;
    }
  }

  return detail.MinPrice;
}

export function formatRsPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

/** DiscountType 1 = fixed amount, otherwise percentage. */
export function formatDiscountBadge(
  discount: number,
  discountType = 0,
): string | null {
  if (!discount || discount <= 0) return null;
  if (discountType === 1) {
    return `-${formatRsPrice(discount)}`;
  }
  return `-${discount}%`;
}

export function getActiveDiscount(
  detail: ProductDetailData,
  selectedVariant?: ProductVariantCombination | null,
): { discount: number; discountType: number } {
  if (selectedVariant && (selectedVariant.Discount ?? 0) > 0) {
    return {
      discount: selectedVariant.Discount,
      discountType: selectedVariant.DiscountType ?? 0,
    };
  }

  return {
    discount: detail.Discount ?? 0,
    discountType: detail.DiscountValueType ?? 0,
  };
}

export function getAvailableStockCount(
  detail: ProductDetailData,
  selectedVariant?: ProductVariantCombination | null,
): number | null {
  const inventoryOn = Boolean(
    selectedVariant?.InventoryManagement ?? detail.InventoryManagement,
  );
  if (!inventoryOn) return null;

  const rawStock =
    selectedVariant?.AvailableStock ??
    (detail as ProductDetailData & { AvailableStock?: number | null })
      .AvailableStock;

  if (rawStock === null || rawStock === undefined) return null;

  const stock = Number(rawStock);
  return Number.isNaN(stock) ? null : stock;
}

export function canAddProductToCart(
  detail: ProductDetailData,
  options?: {
    selectedVariant?: ProductVariantCombination | null;
    inStock?: boolean;
  },
): { allowed: boolean; reason?: string } {
  if (detail.ComingSoon) {
    return {
      allowed: false,
      reason: "This product is coming soon.",
    };
  }

  if (detail.Status === 0) {
    return {
      allowed: false,
      reason: "This product is currently unavailable.",
    };
  }

  const inStock =
    options?.inStock ??
    options?.selectedVariant?.InStock ??
    detail.InStock;

  if (!inStock) {
    return {
      allowed: false,
      reason: "This product is out of stock.",
    };
  }

  const stockCount = getAvailableStockCount(detail, options?.selectedVariant);
  if (stockCount !== null && stockCount <= 0) {
    return {
      allowed: false,
      reason: "This product is out of stock.",
    };
  }

  return { allowed: true };
}

export function getComparePrice(
  detail: ProductDetailData,
  selectedVariant?: ProductVariantCombination | null,
): number {
  if (selectedVariant) {
    if (
      selectedVariant.DiscountedPrice > 0 &&
      selectedVariant.DiscountedPrice < selectedVariant.Price
    ) {
      return selectedVariant.Price;
    }
    return 0;
  }

  const salePrice = getDetailSalePrice(detail);
  if (salePrice < detail.MinPrice) {
    return detail.MinPrice;
  }

  return 0;
}
export function parseVariantGroupOptions(detail: ProductDetailData): { groupName: string; options: string[] }[] {
  const variants =
    detail.ProductVariantDetail?.productVariantCombinationList ?? [];
  const groups = detail.ProductVariantGroups ?? [];

  if (variants.length === 0 || groups.length === 0) {
    return [];
  }

  return groups.map((group, groupIndex) => {
    const options = Array.from(
      new Set(
        variants
          .map((variant) => {
            if (!variant || !variant.VariantName) return "";
            const parts = String(variant.VariantName).split(",").map((part) =>
              part.trim(),
            );
            return parts[groupIndex] ?? parts[parts.length - 1] ?? variant.VariantName;
          })
          .filter(Boolean),
      ),
    );

    return {
      groupName: group.VariantGroupName,
      options,
    };
  });
}
export function findVariantByGroupSelection(
  detail: ProductDetailData,
  selections: Record<string, string>,
): ProductVariantCombination | null {
  const variants =
    detail.ProductVariantDetail?.productVariantCombinationList ?? [];
  const groups = detail.ProductVariantGroups ?? [];

  if (variants.length === 0) return null;

  return (
    variants.find((variant) => {
      const parts = variant.VariantName.split(",").map((part) => part.trim());

      return groups.every((group, index) => {
        const selected = selections[group.VariantGroupName];
        if (!selected) return true;
        const part = parts[index] ?? parts[parts.length - 1];
        return part === selected;
      });
    }) ?? null
  );
}

export async function resolveProductDetailId(
  productId: number,
  preferredDetailId?: number,
): Promise<number> {
  if (preferredDetailId && preferredDetailId > 0) {
    return preferredDetailId;
  }

  try {
    const landingRes = await api.get("/api/v1/Product/landing-page");
    for (const category of landingRes.data?.Data ?? []) {
      const product = (category.ProductList as LandingPageProduct[] | undefined)?.find(
        (item) => item.ProductId === productId,
      );
      if (product?.ProductDetailId && product.ProductDetailId > 0) {
        return product.ProductDetailId;
      }
    }
  } catch {
    // Continue to featured fallback
  }

  try {
    const featuredProducts = await fetchFeaturedProducts();
    const featuredProduct = featuredProducts.find(
      (item) => item.ProductId === productId,
    ) as LandingPageProduct | undefined;

    if (featuredProduct?.ProductDetailId && featuredProduct.ProductDetailId > 0) {
      return featuredProduct.ProductDetailId;
    }
  } catch {
    // Continue to details fallback
  }

  try {
    const response = await api.get<ProductDetailResponse>(
      "/api/v1/Product/details",
      {
        params: {
          ProductId: productId,
          ProductDetailId: 0,
        },
      },
    );

    const detail = response.data?.Data;
    const firstVariant =
      detail?.ProductVariantDetail?.productVariantCombinationList?.[0];

    if (firstVariant?.ProductDetailId) {
      return firstVariant.ProductDetailId;
    }

    if (detail?.ProductDetailId) {
      return detail.ProductDetailId;
    }
  } catch {
    // Final fallback failed
  }

  throw new Error("Unable to resolve product detail id.");
}

export async function fetchProductDetails(
  productId: number,
  productDetailId?: number,
): Promise<ProductDetailData> {
  const resolvedDetailId = await resolveProductDetailId(productId, productDetailId);

  const response = await api.get<ProductDetailResponse>(
    "/api/v1/Product/details",
    {
      params: {
        ProductId: productId,
        ProductDetailId: resolvedDetailId,
      },
    },
  );

  if (!response.data?.Data) {
    throw new Error("Product details not found.");
  }

  return response.data.Data;
}

export interface SaveProductRatingPayload {
  Rating: number;
  Review: string;
  ProductId: number;
}

export interface SaveProductRatingData {
  Rating: number;
  Review: string;
  ProductId: number;
}

interface SaveProductRatingResponse {
  Data: SaveProductRatingData | null;
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

function unwrapApiBody<T extends { Data?: unknown; Message?: string }>(
  response: unknown,
): T {
  if (response && typeof response === "object") {
    if ("Data" in response || "Message" in response) {
      return response as T;
    }

    if ("data" in response) {
      return (response as { data: T }).data;
    }
  }

  throw new Error("Invalid API response.");
}

export async function saveProductRating(
  payload: SaveProductRatingPayload,
): Promise<{ data: SaveProductRatingData; message: string }> {
  const response = await api.post<SaveProductRatingResponse>(
    "/api/v1/Product/save/rating",
    payload,
  );

  const body = unwrapApiBody<SaveProductRatingResponse>(response);
  const isSuccess =
    body.Type === "Success" ||
    body.HttpStatusCode === 200 ||
    Boolean(body.Data);

  if (!isSuccess || !body.Data) {
    throw new Error(body.Message || "Failed to submit rating.");
  }

  const apiMessage = body.Message?.trim() ?? "";
  const message =
    apiMessage && /rating|review|success/i.test(apiMessage)
      ? apiMessage
      : "Your review has been submitted successfully.";

  return {
    data: body.Data,
    message,
  };
}
