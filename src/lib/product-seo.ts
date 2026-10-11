import { cache } from "react";
import {
  fetchProductDetails,
  getDetailSalePrice,
  getProductImages,
  type ProductDetailData,
} from "@/lib/product-details";
import { BRAND_NAME, SITE_URL } from "@/lib/config";

/** Server-side product lookup for page titles and structured data. Never throws: SEO must not break the page. */
export const loadProductForSeo = cache(
  async (productId: number, detailId?: number): Promise<ProductDetailData | null> => {
    if (!Number.isFinite(productId) || productId <= 0) return null;
    try {
      return await fetchProductDetails(productId, detailId && detailId > 0 ? detailId : undefined);
    } catch {
      return null;
    }
  },
);

function plainText(html: string | null | undefined, max: number): string {
  const text = (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function absolute(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = SITE_URL.replace(/\/+$/, "");
  return base ? `${base}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

export function productMetadata(detail: ProductDetailData, siteName: string = BRAND_NAME) {
  const title = detail.Seo?.MetaTitle?.trim() || detail.Name;
  const description =
    detail.Seo?.MetaDescription?.trim() || plainText(detail.Description || detail.LongDescription, 160) || undefined;
  const image = getProductImages(detail)[0];
  return {
    title,
    description,
    keywords: detail.Seo?.MetaKeywords || undefined,
    openGraph: {
      title,
      description,
      type: "website" as const,
      siteName,
      images: image ? [{ url: absolute(image) }] : undefined,
    },
  };
}

/** schema.org/Product, which lets search engines show price, stock and star rating next to the result. */
export function buildProductJsonLd(detail: ProductDetailData, pageUrl?: string) {
  const price = getDetailSalePrice(detail);
  const images = getProductImages(detail).map(absolute);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: detail.Name,
    description: plainText(detail.Description || detail.LongDescription, 500) || undefined,
    image: images,
    sku: detail.DefaultSKU || undefined,
    category: detail.Category || undefined,
    brand: detail.BrandName ? { "@type": "Brand", name: detail.BrandName } : undefined,
    offers: {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "PKR",
      price: price > 0 ? price : undefined,
      availability: detail.InStock && !detail.ComingSoon ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

/** JSON for a <script type="application/ld+json">; "<" is escaped so product text can never close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
