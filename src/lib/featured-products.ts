import api from "@/lib/api";
import { ProductType } from "@/type/ProductType";
import {
  RelatedProduct,
  getAvailableStockCount,
  getProductImages,
  isPlaceholderImage,
} from "@/lib/product-details";

export interface FeaturedProductCategory {
  CategoryId: number;
  CategoryName: string;
  CategoryDescription: string;
}

export interface FeaturedProductSeo {
  MetaTitle: string | null;
  MetaDescription: string | null;
  UrlSlug: string | null;
  MetaKeywords: string | null;
}

export interface FeaturedProduct {
  ProductId: number;
  ProductName: string;
  Description: string;
  Price: number;
  IconImagePath: string;
  LargeImagePath: string;
  ThumbnailImagePath: string;
  IsFeaturedProduct: boolean;
  IsNewProduct: boolean;
  IsProductInStock: boolean;
  IsPromotionalProduct: boolean;
  ProductDetailId?: number;
  ComingSoon?: boolean;
  InventoryManagement?: boolean;
  AvailableStock?: number | null;
  Status?: number;
  Category: FeaturedProductCategory;
  Seo: FeaturedProductSeo;
  Tags: string;
}

interface FeaturedProductResponse {
  Data: FeaturedProduct[];
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

export function getProductImage(product: FeaturedProduct): string {
  return (
    product.LargeImagePath ||
    product.ThumbnailImagePath ||
    product.IconImagePath ||
    "/images/product/1000x1000.png"
  );
}

export function getProductDetailUrl(
  productId: number | string,
  productDetailId?: number | string,
): string {
  const params = new URLSearchParams({ id: String(productId) });
  if (productDetailId) {
    params.set("detailId", String(productDetailId));
  }
  return `/product/default?${params.toString()}`;
}

export function mapProductDetailToProductType(
  detail: import("@/lib/product-details").ProductDetailData,
  selectedVariant?: import("@/lib/product-details").ProductVariantCombination,
): ProductType {
  const gallery = getProductImages(detail);
  const variantImage =
    selectedVariant?.ImageName?.trim() || null;
  const image =
    (variantImage && !isPlaceholderImage(variantImage)
      ? variantImage
      : null) ||
    gallery[0] ||
    "/images/product/1000x1000.png";
  const images =
    variantImage && !isPlaceholderImage(variantImage)
      ? [variantImage, ...gallery.filter((img) => img !== variantImage)]
      : gallery;

  const price = selectedVariant
    ? selectedVariant.DiscountedPrice > 0
      ? selectedVariant.DiscountedPrice
      : selectedVariant.Price
    : detail.MinPrice;

  const discount = selectedVariant?.Discount ?? detail.Discount ?? 0;
  const discountType =
    selectedVariant?.DiscountType ?? detail.DiscountValueType ?? 0;
  const inStock = selectedVariant?.InStock ?? detail.InStock;
  const inventoryManagement = Boolean(
    selectedVariant?.InventoryManagement ?? detail.InventoryManagement,
  );
  const availableStock = getAvailableStockCount(detail, selectedVariant);

  return {
    id: String(detail.ProductId),
    productDetailId:
      selectedVariant?.ProductDetailId ?? detail.ProductDetailId,
    category: detail.Category || "",
    type: detail.Category || "product",
    name: detail.Name,
    gender: "",
    new: Boolean(detail.IsNewProduct),
    sale: discount > 0 || detail.IsPromotional,
    rate: detail.AverageRating || 5,
    price,
    originPrice: selectedVariant?.Price ?? detail.MaxPrice ?? price,
    brand: detail.BrandName || "",
    sold: 0,
    quantity: inStock ? 100 : 0,
    quantityPurchase: 1,
    sizes:
      detail.ProductVariantDetail?.productVariantCombinationList?.map(
        (v) => v.VariantName,
      ) ?? [],
    variation: [],
    thumbImage: [image],
    images,
    description: detail.Description,
    action: "add to cart",
    slug: detail.Seo?.UrlSlug || String(detail.ProductId),
    isPromotional: Boolean(detail.IsPromotional),
    isFeatured: Boolean(detail.IsFeaturedProduct),
    discount,
    discountType,
    inventoryManagement,
    availableStock,
    comingSoon: Boolean(detail.ComingSoon),
    status: detail.Status,
    inStock,
  };
}

export function mapRelatedProductToProductType(
  product: RelatedProduct,
): ProductType {
  const image =
    product.ThumbnailImagePath &&
    !product.ThumbnailImagePath.includes("noImage")
      ? product.ThumbnailImagePath
      : "/images/product/1000x1000.png";

  return {
    id: String(product.ProductId),
    category: product.Category?.CategoryName || "",
    type: "product",
    name: product.ProductName,
    gender: "",
    new: product.IsNewProduct,
    sale: product.IsPromotionalProduct,
    rate: 5,
    price: 0,
    originPrice: 0,
    brand: "",
    sold: 0,
    quantity: 100,
    quantityPurchase: 1,
    sizes: [],
    variation: [],
    thumbImage: [image],
    images: [image],
    description: product.Category?.CategoryDescription || "",
    action: "add to cart",
    slug: product.Seo?.UrlSlug || String(product.ProductId),
    isPromotional: product.IsPromotionalProduct,
    isFeatured: Boolean(product.IsFeaturedProduct),
    discount: 0,
    discountType: 0,
    comingSoon: false,
    status: 1,
    inStock: true,
  };
}

export function mapFeaturedProductToProductType(
  product: FeaturedProduct,
): ProductType {
  const image = getProductImage(product);
  const inStock = product.IsProductInStock !== false;

  return {
    id: String(product.ProductId),
    productDetailId: product.ProductDetailId,
    category: product.Category?.CategoryName || "",
    type: "product",
    name: product.ProductName,
    gender: "",
    new: product.IsNewProduct,
    sale: product.IsPromotionalProduct,
    rate: 5,
    price: product.Price,
    originPrice: product.Price,
    brand: "",
    sold: 0,
    quantity: inStock ? 100 : 0,
    quantityPurchase: 1,
    sizes: [],
    variation: [],
    thumbImage: [image],
    images: [image],
    description: product.Description,
    action: "add to cart",
    slug: product.Seo?.UrlSlug || String(product.ProductId),
    isPromotional: product.IsPromotionalProduct,
    isFeatured: Boolean(product.IsFeaturedProduct),
    discount: 0,
    discountType: 0,
    inventoryManagement: Boolean(product.InventoryManagement),
    availableStock:
      product.InventoryManagement && product.AvailableStock != null
        ? Number(product.AvailableStock)
        : null,
    comingSoon: Boolean(product.ComingSoon),
    status: product.Status ?? 1,
    inStock,
  };
}

export async function fetchFeaturedProducts(): Promise<FeaturedProduct[]> {
  const res = await api.get<FeaturedProductResponse>(
    "/api/v1/Product/featured",
    {
      params: {
        IsNew: true,
        IsFeatured: true,
      },
    },
  );

  return (res.data?.Data ?? []).filter(
    (product) => product.IsProductInStock !== false,
  );
}
