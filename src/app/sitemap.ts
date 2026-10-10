import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { cachedRequest } from "@/lib/cache";
import { fetchCategoryTree, type Category } from "@/lib/categories";
import { fetchAllLandingProducts } from "@/lib/category-products";
import { getProductDetailUrl } from "@/lib/featured-products";

// Built per request (never at deploy time, when the API may be unreachable) and kept in memory for an hour;
// an answer made while the API was down is not kept, so the next crawl gets the full list.
export const dynamic = "force-dynamic";
const CACHE_MS = 60 * 60 * 1000;

const STATIC_PAGES = ["/", "/shop", "/pages/about", "/pages/contact", "/pages/faqs", "/pages/store-list", "/pages/privacy-policy", "/pages/terms-and-conditions"];

function flatten(categories: Category[], out: Category[] = []): Category[] {
  for (const category of categories) {
    out.push(category);
    if (category.children?.length) flatten(category.children, out);
  }
  return out;
}

function staticEntries(base: string): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_PAGES.map((path) => ({ url: `${base}${path}`, lastModified: now }));
}

async function buildSitemap(base: string): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries = staticEntries(base);
  let failures = 0;

  try {
    for (const category of flatten(await fetchCategoryTree())) {
      if (category.Status === 1 || category.Status === undefined) {
        entries.push({ url: `${base}/category/${category.CategoryId}`, lastModified: now });
      }
    }
  } catch {
    failures++;
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
    failures++;
  }

  // Both lookups failed: do not cache this thin answer, the caller serves the static pages for now.
  if (failures === 2) throw new Error("catalogue unavailable");
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/+$/, "");
  // Without a public address a sitemap would contain useless relative links.
  if (!base) return [];

  try {
    return await cachedRequest("sitemap", CACHE_MS, () => buildSitemap(base));
  } catch {
    return staticEntries(base);
  }
}
