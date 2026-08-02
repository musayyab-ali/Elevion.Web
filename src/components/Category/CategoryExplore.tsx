"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import {
  Category,
  fetchCategoryTree,
  findCategoryById,
  getCategoryBreadcrumb,
  getVisibleChildren,
} from "@/lib/categories";
import { getApiErrorMessage } from "@/lib/api";
import CategoryDetailCard from "@/components/Home1/CategoryDetailCard";
import CategorySwiper from "@/components/Home1/CategorySwiper";
import CategoryProducts from "@/components/Category/CategoryProducts";
import { CategorySiblingLinks } from "@/components/Category/CategoryQuickLinks";
import ProductSkeleton from "@/components/Other/ProductSkeleton";

interface CategoryExploreProps {
  categoryId: number;
}

const CategoryExplore: React.FC<CategoryExploreProps> = ({ categoryId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchCategoryTree();
        if (!cancelled) setCategories(data);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load categories."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentCategory = findCategoryById(categories, categoryId);
  const breadcrumb = getCategoryBreadcrumb(categories, categoryId);
  const parentCategory =
    breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;
  const childCategories = currentCategory
    ? getVisibleChildren(currentCategory)
    : [];
  const showProducts = Boolean(currentCategory && childCategories.length === 0);

  if (loading) {
    return (
      <div className="category-explore md:py-20 py-10">
        <div className="container">
          <div className="mb-6 h-4 w-48 animate-pulse rounded bg-[#ebebeb]" />
          <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-white md:rounded-3xl">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="space-y-4 p-5 sm:p-7 lg:col-span-5">
                <div className="h-6 w-24 animate-pulse rounded-full bg-[#ebebeb]" />
                <div className="h-8 w-3/4 animate-pulse rounded bg-[#ebebeb]" />
                <div className="h-4 w-full animate-pulse rounded bg-[#ebebeb]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#ebebeb]" />
                <div className="h-12 w-40 animate-pulse rounded-xl bg-[#ebebeb]" />
              </div>
              <div className="h-[220px] animate-pulse bg-[#ebebeb] lg:col-span-7 lg:h-[300px]" />
            </div>
          </div>
          <ProductSkeleton variant="grid" count={8} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-explore md:py-20 py-10">
        <div className="container text-center">
          <p className="text-red">{error}</p>
          <button
            type="button"
            className="button-main mt-6"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="category-explore md:py-20 py-10">
        <div className="container text-center">
          <div className="heading3">Category not found</div>
          <p className="body1 text-secondary mt-2">
            This category may have been removed or the link is invalid.
          </p>
          <Link href="/" className="button-main mt-6 inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="category-explore md:py-20 py-10">
      <div className="container">
        <nav className="flex items-center gap-2 text-secondary mb-6 overflow-x-auto pb-2 scrollbar-hide whitespace-nowrap">
          <Link href="/" className="hover:text-black duration-300 shrink-0">
            Home
          </Link>
          <Icon.CaretRight size={14} className="shrink-0" />
          <Link
            href="/categories"
            className="hover:text-black duration-300 shrink-0"
          >
            Categories
          </Link>
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <React.Fragment key={item.CategoryId}>
                <Icon.CaretRight size={14} className="shrink-0" />
                {isLast ? (
                  <span className="text-black shrink-0">{item.Name}</span>
                ) : (
                  <Link
                    href={`/category/${item.CategoryId}`}
                    className="hover:text-black duration-300 shrink-0"
                  >
                    {item.Name}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <CategorySiblingLinks
          parent={parentCategory}
          activeCategoryId={currentCategory.CategoryId}
        />

        <div className="mt-6">
          <CategoryDetailCard category={currentCategory} variant="hero" />
        </div>

        {childCategories.length > 0 && (
          <div id="category-subcategories" className="md:mt-14 mt-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="heading4">Subcategories</div>
                <p className="body1 text-secondary mt-2">
                  Choose a subcategory to continue in sequence.
                </p>
              </div>
              <span className="caption1 text-secondary">
                {childCategories.length} available
              </span>
            </div>

            <div className="md:hidden mt-6">
              <CategorySwiper categories={childCategories} />
            </div>

            <div className="hidden md:grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6 md:mt-8 mt-6">
              {childCategories.map((child) => (
                <CategoryDetailCard
                  key={child.CategoryId}
                  category={child}
                  variant="grid"
                />
              ))}
            </div>
          </div>
        )}

        {showProducts && (
          <div id="category-products" className="md:mt-14 mt-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 md:mb-8">
              <div>
                <div className="heading4">Products</div>
                <p className="body1 text-secondary mt-2">
                  Browse products in {currentCategory.Name}.
                </p>
              </div>
            </div>
            <CategoryProducts
              categoryId={currentCategory.CategoryId}
              categoryName={currentCategory.Name}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryExplore;
