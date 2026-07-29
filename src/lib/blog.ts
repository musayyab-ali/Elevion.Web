import api from "@/lib/api";

export interface BlogSeo {
  MetaTitle: string | null;
  MetaDescription: string | null;
  UrlSlug: string | null;
  MetaKeywords: string | null;
}

export interface NewsEvent {
  NewsEventsId: number;
  Title: string;
  Description: string;
  URL: string;
  Picture: string;
  Status: number;
  TenantId: number;
  UserId: number;
  NewsEventsDate: string;
  BannerImage: string;
  Seo: BlogSeo;
}

export interface NewsEventsResult {
  items: NewsEvent[];
  totalRecords: number;
}

interface NewsEventsResponse {
  Data?: {
    NewsEventsList: NewsEvent[];
    TotalRecords: number;
  };
  Message?: string;
}

interface BlogDetailResponse {
  Data?:
    | NewsEvent
    | {
        NewsEventsList: NewsEvent[];
        TotalRecords?: number;
      };
  Message?: string;
}

function extractNewsEvent(data: BlogDetailResponse["Data"]): NewsEvent | null {
  if (!data) return null;

  if ("NewsEventsList" in data && Array.isArray(data.NewsEventsList)) {
    return data.NewsEventsList[0] ?? null;
  }

  if ("NewsEventsId" in data) {
    return data;
  }

  return null;
}

export function resolveBlogSlug(slug?: string | null): string {
  const trimmed = slug?.trim();
  return trimmed || "0";
}

const DEFAULT_BLOG_IMAGE = "/images/blog/1.png";

export function isBlogActive(item: NewsEvent): boolean {
  return Number(item.Status) === 1;
}

export function getBlogSlug(item: NewsEvent): string {
  const seoSlug = item.Seo?.UrlSlug?.trim();
  if (seoSlug) return seoSlug;

  const url = item.URL?.trim();
  if (url) {
    return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }

  return "0";
}

export function getBlogDetailUrl(item: NewsEvent): string {
  const slug = encodeURIComponent(getBlogSlug(item));
  return `/blog/${item.NewsEventsId}?slug=${slug}`;
}

export function getBlogImage(item: NewsEvent, preferBanner = false): string {
  const banner = item.BannerImage?.trim();
  const picture = item.Picture?.trim();

  if (preferBanner && banner) return banner;
  if (picture) return picture;
  if (banner) return banner;

  return DEFAULT_BLOG_IMAGE;
}

export function formatBlogDate(value: string): string {
  if (!value?.trim()) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getBlogExcerpt(description: string, maxLength = 180): string {
  const text = description.replace(/\r\n/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function splitBlogParagraphs(description: string): string[] {
  return description
    .split(/\r?\n\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function fetchNewsEvents(
  pageNumber = 1,
  pageSize = 10,
): Promise<NewsEventsResult> {
  const response = await api.get<NewsEventsResponse>(
    "/api/v1/TenantLanding/news-events",
    {
      params: { pageNumber, pageSize },
    },
  );

  const list = response.data?.Data?.NewsEventsList ?? [];

  return {
    items: list.filter(isBlogActive),
    totalRecords: response.data?.Data?.TotalRecords ?? list.length,
  };
}

export async function fetchBlogDetail(
  newsEventsId: number,
  slug?: string | null,
): Promise<NewsEvent | null> {
  const response = await api.get<BlogDetailResponse>(
    "/api/v1/TenantLanding/blogdetail",
    {
      params: {
        NewsEventsId: newsEventsId,
        Slug: resolveBlogSlug(slug),
      },
    },
  );

  const item = extractNewsEvent(response.data?.Data);
  return item && isBlogActive(item) ? item : null;
}
