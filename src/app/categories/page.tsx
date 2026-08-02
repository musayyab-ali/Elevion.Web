"use client";

import React from "react";
import Link from "next/link";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Footer from "@/components/Footer/Footer";
import CategoryDetailCard from "@/components/Home1/CategoryDetailCard";
import CategorySwiper from "@/components/Home1/CategorySwiper";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import ProductSkeleton from "@/components/Other/ProductSkeleton";

export default function CategoriesPage() {
  const { rootCategories, loading, error } = useCategoryTree();

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
      </div>

      <div className="md:py-20 py-10">
        <div className="container">
          <nav className="flex items-center gap-2 text-secondary mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <Link href="/" className="hover:text-black duration-300 shrink-0">
              Home
            </Link>
            <span className="shrink-0">/</span>
            <span className="text-black shrink-0">Categories</span>
          </nav>

          <div className="max-w-3xl">
            <h1 className="heading2">Shop by Category</h1>
            <p className="body1 text-secondary mt-3">
              Start from a parent category, then move step by step into
              subcategories and products.
            </p>
          </div>

          {loading && (
            <div className="mt-8 md:mt-12">
              <ProductSkeleton variant="grid" count={8} />
            </div>
          )}

          {error && <p className="text-center text-red py-16">{error}</p>}

          {!loading && !error && rootCategories.length === 0 && (
            <p className="text-center text-secondary py-16">
              No categories available.
            </p>
          )}

          {!loading && !error && rootCategories.length > 0 && (
            <>
              <div className="md:hidden mt-8">
                <CategorySwiper categories={rootCategories} />
              </div>

              <div className="hidden md:grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6 md:mt-12 mt-8">
                {rootCategories.map((category) => (
                  <CategoryDetailCard
                    key={category.CategoryId}
                    category={category}
                    variant="grid"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
