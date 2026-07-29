"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Category,
  getCategoryIcon,
  getCategoryImage,
  getCategoryNavigationUrl,
  getVisibleChildren,
  hasVisibleChildren,
} from "@/lib/categories";

interface CategoryDetailCardProps {
  category: Category;
  variant?: "swiper" | "grid" | "hero";
}

const CategoryDetailCard: React.FC<CategoryDetailCardProps> = ({
  category,
  variant = "grid",
}) => {
  const router = useRouter();
  const icon = getCategoryIcon(category);
  const childCount = getVisibleChildren(category).length;
  const hasChildren = hasVisibleChildren(category);

  const handleClick = () => {
    router.push(getCategoryNavigationUrl(category));
  };

  if (variant === "hero") {
    return (
      <div className="category-hero rounded-3xl overflow-hidden border border-line bg-white">
        <div className="relative aspect-[16/9] sm:aspect-[16/8] md:aspect-[16/7] w-full">
          <Image
            src={getCategoryImage(category)}
            alt={category.Name}
            fill
            className="object-cover"
            priority
          />
          {icon && (
            <div className="absolute top-5 left-5 w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-white shadow-md">
              <Image
                src={icon}
                alt={`${category.Name} icon`}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {category.IsFeatured && (
              <span className="caption1 font-semibold uppercase bg-black text-white px-3 py-1 rounded-full">
                Featured
              </span>
            )}
            {category.IsMainMenu && (
              <span className="caption1 font-semibold uppercase bg-surface px-3 py-1 rounded-full">
                Main Menu
              </span>
            )}
            {category.IsLandingPage && (
              <span className="caption1 font-semibold uppercase bg-surface px-3 py-1 rounded-full">
                Landing Page
              </span>
            )}
            {hasChildren && (
              <span className="caption1 text-secondary">
                {childCount} subcategor{childCount === 1 ? "y" : "ies"}
              </span>
            )}
          </div>

          <h1 className="heading3">{category.Name}</h1>

          {category.Description && (
            <p className="body1 text-secondary mt-4 leading-relaxed">
              {category.Description}
            </p>
          )}

          {category.Seo?.MetaDescription && (
            <p className="caption1 text-secondary mt-3">
              {category.Seo.MetaDescription}
            </p>
          )}

          <button
            type="button"
            className="button-main mt-6"
            onClick={() => {
              if (hasChildren) {
                document
                  .getElementById("category-subcategories")
                  ?.scrollIntoView({ behavior: "smooth" });
                return;
              }
              document
                .getElementById("category-products")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {hasChildren
              ? `Explore ${category.Name}`
              : `View Products`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`category-detail-card group cursor-pointer rounded-2xl overflow-hidden border border-line bg-white duration-500 hover:shadow-lg ${
        variant === "swiper" ? "h-full flex flex-col" : ""
      }`}
      onClick={handleClick}
    >
      <div
        className={`relative overflow-hidden ${
          variant === "swiper" ? "aspect-[4/3]" : "aspect-[5/3]"
        }`}
      >
        <Image
          src={getCategoryImage(category)}
          alt={category.Name}
          fill
          className="object-cover duration-500 group-hover:scale-105"
        />
        {icon && (
          <div className="absolute top-3 left-3 w-10 h-10 rounded-full overflow-hidden border border-white bg-white shadow-sm">
            <Image
              src={icon}
              alt={`${category.Name} icon`}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {category.IsFeatured && (
          <span className="absolute top-3 right-3 caption2 font-semibold uppercase bg-black text-white px-2.5 py-1 rounded-full">
            Featured
          </span>
        )}
      </div>

      <div
        className={`p-4 md:p-5 flex flex-col flex-1 ${
          variant === "swiper" ? "min-h-[180px]" : ""
        }`}
      >
        <h3 className="heading5 line-clamp-2">{category.Name}</h3>

        {category.Description ? (
          <p
            className={`body2 text-secondary mt-2 flex-1 ${
              variant === "swiper" ? "line-clamp-3" : "line-clamp-4"
            }`}
          >
            {category.Description}
          </p>
        ) : (
          <p className="body2 text-secondary mt-2 flex-1">
            {hasChildren
              ? `Browse ${childCount} subcategor${childCount === 1 ? "y" : "ies"}`
              : "View products in this category"}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-line">
          <span className="caption1 text-secondary">
            {hasChildren
              ? `${childCount} subcategor${childCount === 1 ? "y" : "ies"}`
              : category.IsLeafNode
                ? "Products"
                : "Collection"}
          </span>
          <span className="caption1 font-semibold uppercase text-black group-hover:underline">
            {hasChildren ? "Explore" : "View Products"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailCard;
