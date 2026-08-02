import api from "@/lib/api";

export interface StaticPageModel {
  StaticPageId: number;
  Page: number;
  Title: string;
  SubTitle: string;
  Status: number;
}

export interface StaticPagePanelItem {
  StaticPageContentId: number;
  Title: string;
  UniqueName: string;
  PageContent: string;
  ParentContentId: number;
  RootContentId: number;
  Level: number;
  SortOrder: number;
  IsLeafNode: boolean;
  items: StaticPagePanelItem[];
}

export interface StaticPageContentItem {
  Title: string;
  UniqueName: string;
  PageContent: string;
}

export interface StaticPageGroup {
  panelList: StaticPagePanelItem[];
  staticPageModel: StaticPageModel;
  contentList: StaticPageContentItem[];
}

interface StaticPagesResponse {
  Data: StaticPageGroup[];
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

export type StaticPageKey = "faqs" | "terms" | "privacy";

export interface StaticPageSection {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function fetchStaticPages(): Promise<StaticPageGroup[]> {
  const response = await api.get<StaticPagesResponse>(
    "/api/v1/TenantLanding/GetStaticPages/static-pages",
  );
  return response.data?.Data ?? [];
}

export function getStaticPageGroup(
  pages: StaticPageGroup[],
  key: StaticPageKey,
): StaticPageGroup | null {
  const match = pages.find((page) => {
    const title = normalizeTitle(page.staticPageModel?.Title ?? "");
    const pageNumber = page.staticPageModel?.Page;

    if (key === "faqs") {
      return title.includes("faq") || pageNumber === 1;
    }

    if (key === "terms") {
      return title.includes("term") || title.includes("condition") || pageNumber === 3;
    }

    if (key === "privacy") {
      return title.includes("privacy") || pageNumber === 2;
    }

    return false;
  });

  return match ?? null;
}

function flattenPanelItems(items: StaticPagePanelItem[]): StaticPageSection[] {
  const sections: StaticPageSection[] = [];

  const walk = (nodes: StaticPagePanelItem[]) => {
    for (const node of nodes) {
      sections.push({
        id: String(node.StaticPageContentId || node.UniqueName),
        title: node.Title,
        content: node.PageContent,
        sortOrder: Number(node.SortOrder) || 0,
      });

      if (node.items?.length) {
        walk(node.items);
      }
    }
  };

  walk(items);
  return sections;
}

export function getStaticPageSections(group: StaticPageGroup | null): StaticPageSection[] {
  if (!group) return [];

  const fromPanels = flattenPanelItems(group.panelList ?? []);
  if (fromPanels.length > 0) {
    return fromPanels.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return (group.contentList ?? []).map((item, index) => ({
    id: item.UniqueName || String(index),
    title: item.Title,
    content: item.PageContent,
    sortOrder: index,
  }));
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
