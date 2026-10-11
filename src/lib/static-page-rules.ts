/**
 * Static pages (FAQs, Terms, Privacy, About us, Contact us ...) the shop writes in the admin. Pure rules: no network, so they are tested.
 */

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

export interface StaticPagesResponse {
  Data: StaticPageGroup[];
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

export interface StaticPageSection {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
}

/** The kinds of page the admin can create, and the number the API gives each kind (the admin's "Page" list: stable, unlike the editable title). */
export type StaticPageKey = "faqs" | "returns" | "terms" | "privacy" | "delivery" | "about" | "contact";

export const STATIC_PAGE_NUMBER: Record<StaticPageKey, number> = {
  faqs: 1,
  returns: 2,
  terms: 3,
  privacy: 4,
  delivery: 5,
  about: 6,
  contact: 7,
};

/** The page of that kind, or null when the shop has not written it. Matching is by the kind's number only: a title can be anything. */
export function getStaticPageGroup(pages: StaticPageGroup[], key: StaticPageKey): StaticPageGroup | null {
  const number = STATIC_PAGE_NUMBER[key];
  return pages.find((page) => page.staticPageModel?.Page === number) ?? null;
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
