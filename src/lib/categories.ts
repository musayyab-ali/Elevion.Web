import api from "@/lib/api";

export interface CategorySeo {
  MetaTitle: string | null;
  MetaDescription: string | null;
  UrlSlug: string | null;
  MetaKeywords: string | null;
}

export interface Category {
  CategoryId: number;
  ParentCategoryId: number;
  RootCategoryId: number;
  IsLeafNode: boolean;
  Name: string;
  Description: string | null;
  Status: number;
  SortOrder: number;
  IsMainMenu: boolean;
  IsLandingPage: boolean;
  IsFeatured: boolean;
  children: Category[];
  ImageName: string | null;
  IconName: string | null;
  Seo: CategorySeo;
  ImagePath: string | null;
  IconPath: string | null;
  CategoryURL: string | null;
}

interface CategoryTreeResponse {
  Data: Category[];
  Message: string;
  Type: string;
  HttpStatusCode: number;
}

const DEFAULT_IMAGE = "/images/collection/top.png";

export function isCategoryDeleted(category: Category): boolean {
  return category.Status === 2;
}

export function isCategoryVisible(category: Category): boolean {
  return !isCategoryDeleted(category);
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.SortOrder - b.SortOrder);
}

export function getVisibleChildren(category: Category): Category[] {
  return sortCategories((category.children ?? []).filter(isCategoryVisible));
}

export function getRootCategories(categories: Category[]): Category[] {
  return sortCategories(categories.filter(isCategoryVisible));
}

function isValidImage(path: string | null | undefined): boolean {
  return Boolean(path?.trim() && !path.includes("noImage"));
}

export function getCategoryImage(category: Category): string {
  if (isValidImage(category.ImagePath)) return category.ImagePath!;
  return DEFAULT_IMAGE;
}

export function getCategoryIcon(category: Category): string | null {
  if (isValidImage(category.IconPath)) return category.IconPath!;
  return null;
}

export function hasVisibleChildren(category: Category): boolean {
  return getVisibleChildren(category).length > 0;
}

export function getCategoryNavigationUrl(category: Category): string {
  return `/category/${category.CategoryId}`;
}

export function findCategoryById(
  categories: Category[],
  categoryId: number,
): Category | null {
  for (const category of categories) {
    if (category.CategoryId === categoryId) return category;
    const match = findCategoryById(category.children ?? [], categoryId);
    if (match) return match;
  }
  return null;
}

export function getCategoryBreadcrumb(
  categories: Category[],
  categoryId: number,
): Category[] {
  const path: Category[] = [];

  function walk(nodes: Category[], trail: Category[]): boolean {
    for (const node of nodes) {
      const nextTrail = [...trail, node];
      if (node.CategoryId === categoryId) {
        path.push(...nextTrail);
        return true;
      }
      if (walk(node.children ?? [], nextTrail)) return true;
    }
    return false;
  }

  walk(categories, []);
  return path;
}

export async function fetchCategoryTree(): Promise<Category[]> {
  const res = await api.get<CategoryTreeResponse>("/api/v1/Category/current", {
    params: { Status: -1 },
  });
  return res.data?.Data ?? [];
}
