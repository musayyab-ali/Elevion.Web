"use client";

import React from "react";

type ProductSkeletonVariant =
  | "card"
  | "grid"
  | "detail"
  | "quickview"
  | "cart-item"
  | "cart-list"
  | "list-item";

interface ProductSkeletonProps {
  variant?: ProductSkeletonVariant;
  count?: number;
  className?: string;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[#ebebeb] ${className}`}
      aria-hidden
    />
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <SkeletonBlock className="aspect-[3/4] w-full rounded-none" />
      <div className="space-y-3 p-3 sm:p-4">
        <SkeletonBlock className="h-3 w-1/3" />
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-4 w-1/2" />
        <div className="flex items-center justify-between gap-2 pt-1">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="product-detail default md:py-16 py-8">
      <div className="container">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          <div className="w-full lg:w-1/2">
            <SkeletonBlock className="aspect-[3/4] w-full rounded-2xl" />
            <div className="mt-3 flex gap-2 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className="h-20 w-16 flex-shrink-0 rounded-xl sm:h-24 sm:w-[72px]"
                />
              ))}
            </div>
          </div>

          <div className="w-full space-y-4 lg:w-1/2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-4/5 sm:h-10" />
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-16 w-full" />
            <div className="space-y-3 pt-2">
              <SkeletonBlock className="h-4 w-28" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-10 w-20 rounded-full" />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <SkeletonBlock className="h-12 w-full sm:w-40" />
              <SkeletonBlock className="h-12 w-full flex-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductQuickviewSkeleton() {
  return (
    <div className="flex min-h-[420px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <div className="w-full flex-shrink-0 lg:w-[42%]">
        <SkeletonBlock className="aspect-[3/4] w-full rounded-2xl" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className="h-20 w-16 flex-shrink-0 rounded-xl"
            />
          ))}
        </div>
      </div>
      <div className="w-full space-y-4 lg:w-[58%]">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-7 w-3/4" />
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  );
}

function CartItemSkeleton() {
  return (
    <div className="flex gap-3 border-b border-line py-4 sm:gap-4">
      <SkeletonBlock className="h-24 w-20 flex-shrink-0 rounded-xl sm:h-28 sm:w-24" />
      <div className="min-w-0 flex-1 space-y-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

function ListItemSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-line p-3">
      <SkeletonBlock className="h-20 w-16 flex-shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-1/3" />
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-4 w-1/2" />
      </div>
    </div>
  );
}

const ProductSkeleton: React.FC<ProductSkeletonProps> = ({
  variant = "card",
  count = 4,
  className = "",
}) => {
  if (variant === "card") {
    return <ProductCardSkeleton />;
  }

  if (variant === "grid") {
    return (
      <div
        className={`grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 md:gap-[30px] lg:grid-cols-4 ${className}`}
        role="status"
        aria-label="Loading products"
      >
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
        <span className="sr-only">Loading products...</span>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div role="status" aria-label="Loading product details" className={className}>
        <ProductDetailSkeleton />
        <span className="sr-only">Loading product details...</span>
      </div>
    );
  }

  if (variant === "quickview") {
    return (
      <div role="status" aria-label="Loading product" className={className}>
        <ProductQuickviewSkeleton />
        <span className="sr-only">Loading product...</span>
      </div>
    );
  }

  if (variant === "cart-item" || variant === "cart-list") {
    return (
      <div
        className={`w-full ${className}`}
        role="status"
        aria-label="Loading cart items"
      >
        {Array.from({ length: count }).map((_, index) => (
          <CartItemSkeleton key={index} />
        ))}
        <span className="sr-only">Loading cart items...</span>
      </div>
    );
  }

  if (variant === "list-item") {
    return (
      <div
        className={`flex flex-col gap-3 ${className}`}
        role="status"
        aria-label="Loading products"
      >
        {Array.from({ length: count }).map((_, index) => (
          <ListItemSkeleton key={index} />
        ))}
        <span className="sr-only">Loading products...</span>
      </div>
    );
  }

  return <ProductCardSkeleton />;
};

export default ProductSkeleton;
