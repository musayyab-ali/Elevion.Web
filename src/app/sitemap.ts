import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { fetchCategoryTree, type Category } from "@/lib/categories";
import { fetchAllLandingProducts } from "@/lib/category-products";
import { getProductDetailUrl } from "@/lib/featured-products";

// Rebuilt at most once an hour; the shop's catalogue changes slowly and the API is not hit on every crawl.
export const revalidate = 3600;

const STATIC_PAGES = ["/", "/shop", "/pages/about", "/pages/contact", "/pages/faqs", "/pages/store-list", "/pages/privacy-policy", "/pages/terms-and-conditions"];

function flatten(categories: Category[], out: Category[] = []): Category[] {
  for (const category of categories) {
    out.push(category);
    if (category.children?.length) flatten(category.children, out);
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/+$/, "");
  // Without a public address a sitemap would contain useless relative links.
  if (!base) return [];

  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({ url: `${base}${path}`, lastModified: now }));

  try {
    for (const category of flatten(await fetchCategoryTree())) {
      if (category.Status === 1 || category.Status === undefined) {
        entries.push({ url: `${base}/category/${category.CategoryId}`, lastModified: now });
      }
    }
  } catch {
    // The API being down must not break the sitemap: serve the pages we do know.
  }

  try {
    const seen = new Set<string>();
    for (const product of await fetchAllLandingProducts()) {
      const url = `${base}${getProductDetailUrl(product.id)}`;
      if (!seen.has(url)) {
        seen.add(url);
        entries.push({ url, lastModified: now });
      }
    }
  } catch {
    // same as above
  }

  return entries;
}
