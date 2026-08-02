"use client";

import React from "react";
import Link from "next/link";
import {
  Category,
  getCategoryNavigationUrl,
  getVisibleChildren,
} from "@/lib/categories";

interface CategoryQuickLinksProps {
  categories: Category[];
  activeCategoryId?: number;
  title?: string;
}

const CategoryQuickLinks: React.FC<CategoryQuickLinksProps> = ({
  categories,
  activeCategoryId,
  title = "Browse",
}) => {
  if (!categories.length) return null;

  return (
    <div className="category-quick-links">
      <div className="text-button-uppercase pb-3">{title}</div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => {
          const isActive = category.CategoryId === activeCategoryId;

          return (
            <Link
              key={category.CategoryId}
              href={getCategoryNavigationUrl(category)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm duration-300 whitespace-nowrap ${
                isActive
                  ? "border-black bg-black text-white"
                  : "border-line text-secondary hover:border-black hover:text-black"
              }`}
            >
              {category.Name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export function CategorySiblingLinks({
  parent,
  activeCategoryId,
}: {
  parent: Category | null;
  activeCategoryId: number;
}) {
  if (!parent) return null;

  const siblings = getVisibleChildren(parent);
  if (siblings.length <= 1) return null;

  return (
    <CategoryQuickLinks
      categories={siblings}
      activeCategoryId={activeCategoryId}
      title={`More in ${parent.Name}`}
    />
  );
}

export default CategoryQuickLinks;
