"use client";

import React from "react";
import Link from "next/link";
import { Category, getCategoryNavigationUrl } from "@/lib/categories";
import { useCategoryTree } from "@/hooks/useCategoryTree";

const CategoryNavColumn = ({ category }: { category: Category }) => {
  return (
    <div className="nav-item flex h-full min-h-[50px] flex-col">
      <Link
        href={getCategoryNavigationUrl(category)}
        className="text-button-uppercase pb-3 inline-block hover:text-black duration-300 font-bold"
      >
        {category.Name}
      </Link>

      <ul className="flex flex-1 flex-col">
        <li className="mt-auto pt-2">
          <Link
            href={getCategoryNavigationUrl(category)}
            className="link text-secondary duration-300 view-all-btn"
          >
            View All
          </Link>
        </li>
      </ul>
    </div>
  );
};

const DynamicCategoryMegaMenu = () => {
  const { rootCategories, loading, error } = useCategoryTree();

  if (loading) {
    return (
      <div className="mega-menu absolute top-[74px] left-0 w-screen bg-white shadow-lg z-50">
        <div className="container py-10 text-secondary">
          Loading categories...
        </div>
      </div>
    );
  }

  if (error || rootCategories.length === 0) {
    return (
      <div className="mega-menu absolute top-[74px] left-0 w-screen bg-white shadow-lg z-50">
        <div className="container py-10 text-secondary">
          {error || "No categories available."}
        </div>
      </div>
    );
  }

  return (
    <div className="mega-menu absolute top-[48.5px] left-0 w-screen bg-white shadow-lg z-50">
      <div className="container">
        <div className="py-8 md:py-10">
          <div className="nav-link grid w-full grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rootCategories.map((category) => (
              <CategoryNavColumn
                key={category.CategoryId}
                category={category}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicCategoryMegaMenu;
