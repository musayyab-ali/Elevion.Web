import api from "@/lib/api";
import { StaticPageGroup, StaticPageKey, StaticPageSection, StaticPagesResponse, getStaticPageGroup, getStaticPageSections } from "@/lib/static-page-rules";

export * from "@/lib/static-page-rules";

export async function fetchStaticPages(): Promise<StaticPageGroup[]> {
  const response = await api.get<StaticPagesResponse>(
    "/api/v1/TenantLanding/GetStaticPages/static-pages",
  );
  return response.data?.Data ?? [];
}

export async function fetchStaticPageByKey(
  key: StaticPageKey,
): Promise<{ group: StaticPageGroup | null; sections: StaticPageSection[] }> {
  const pages = await fetchStaticPages();
  const group = getStaticPageGroup(pages, key);
  return {
    group,
    sections: getStaticPageSections(group),
  };
}
