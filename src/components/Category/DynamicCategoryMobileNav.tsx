"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import {
  Category,
  getCategoryNavigationUrl,
  getVisibleChildren,
  hasVisibleChildren,
} from "@/lib/categories";
import { useCategoryTree } from "@/hooks/useCategoryTree";

interface Props {
  onBack: () => void;
}

const DynamicCategoryMobileNav = ({ onBack }: Props) => {
  const { rootCategories, loading, error } = useCategoryTree();
  const [trail, setTrail] = useState<Category[]>([]);

  const currentParent = trail[trail.length - 1] ?? null;
  const currentItems = useMemo(
    () => (currentParent ? getVisibleChildren(currentParent) : rootCategories),
    [currentParent, rootCategories],
  );

  const handleItemClick = (category: Category) => {
    if (hasVisibleChildren(category)) {
      setTrail((prev) => [...prev, category]);
      return;
    }

    window.location.href = getCategoryNavigationUrl(category);
  };

  const handlePanelBack = () => {
    if (trail.length > 0) {
      setTrail((prev) => prev.slice(0, -1));
      return;
    }

    onBack();
  };

  const panelTitle = currentParent?.Name ?? "Categories";

  return (
    <div className="sub-nav-mobile">
      <div
        className="back-btn flex items-center gap-3"
        onClick={handlePanelBack}
      >
        <Icon.CaretLeft />
        Back
      </div>

      <div className="list-nav-item w-full pt-3 pb-12">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-button-uppercase text-black font-semibold">
            {panelTitle}
          </div>
          {currentParent && (
            <Link
              href={getCategoryNavigationUrl(currentParent)}
              className="caption1 text-secondary underline"
            >
              View All
            </Link>
          )}
        </div>

        {!currentParent && (
          <Link
            href="/categories"
            className="nav-item-mobile link text-secondary duration-300 block mb-4 font-medium"
          >
            Browse All Categories
          </Link>
        )}

        {trail.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 text-caption text-secondary">
            <button
              type="button"
              className="hover:text-black"
              onClick={() => setTrail([])}
            >
              All
            </button>
            {trail.map((item, index) => (
              <React.Fragment key={item.CategoryId}>
                <Icon.CaretRight size={12} />
                <button
                  type="button"
                  className={`hover:text-black ${index === trail.length - 1 ? "text-black font-medium" : ""}`}
                  onClick={() => setTrail(trail.slice(0, index + 1))}
                >
                  {item.Name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {loading && (
          <p className="text-secondary py-4">Loading categories...</p>
        )}

        {error && <p className="text-red py-4">{error}</p>}

        {!loading && !error && (
          <div className="nav-link grid grid-cols-1 sm:grid-cols-2 gap-5 gap-y-4">
            {currentItems.map((category) => {
              const childCount = getVisibleChildren(category).length;

              return (
                <div key={category.CategoryId} className="nav-item">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => handleItemClick(category)}
                  >
                    <div className="text-button-uppercase pb-1 flex items-center justify-between gap-2">
                      <span>{category.Name}</span>
                      {childCount > 0 && <Icon.CaretRight size={16} />}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicCategoryMobileNav;
