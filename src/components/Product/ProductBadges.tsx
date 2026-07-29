"use client";

import React from "react";

export type ProductBadgeItem = {
  key: string;
  label: string;
  tone: "new" | "featured" | "promo" | "discount" | "stock" | "coming" | "unavailable";
};

type ProductBadgesProps = {
  badges: ProductBadgeItem[];
  className?: string;
  position?: "absolute" | "static";
};

const TONE_CLASS: Record<ProductBadgeItem["tone"], string> = {
  new: "product-badge is-new",
  featured: "product-badge is-featured",
  promo: "product-badge is-promo",
  discount: "product-badge is-discount",
  stock: "product-badge is-stock",
  coming: "product-badge is-coming",
  unavailable: "product-badge is-unavailable",
};

export function buildProductBadges(input: {
  isNew?: boolean;
  isFeatured?: boolean;
  isPromotional?: boolean;
  discount?: number;
  discountType?: number;
  inventoryManagement?: boolean;
  availableStock?: number | null;
  comingSoon?: boolean;
  status?: number;
  inStock?: boolean;
  discountLabel?: string | null;
}): ProductBadgeItem[] {
  const badges: ProductBadgeItem[] = [];

  if (input.comingSoon) {
    badges.push({ key: "coming", label: "Coming Soon", tone: "coming" });
  }

  if (input.isNew) {
    badges.push({ key: "new", label: "New", tone: "new" });
  }

  if (input.isFeatured) {
    badges.push({ key: "featured", label: "Featured", tone: "featured" });
  }

  if (input.isPromotional) {
    badges.push({ key: "promo", label: "Promotional", tone: "promo" });
  }

  const discountLabel =
    input.discountLabel ??
    (input.discount && input.discount > 0
      ? input.discountType === 1
        ? `-Rs. ${input.discount}`
        : `-${input.discount}%`
      : null);

  if (discountLabel) {
    badges.push({ key: "discount", label: discountLabel, tone: "discount" });
  }

  // InventoryManagement true → show AvailableStock as a clear digit badge
  if (
    input.inventoryManagement &&
    input.availableStock !== null &&
    input.availableStock !== undefined &&
    !Number.isNaN(Number(input.availableStock))
  ) {
    const stock = Number(input.availableStock);
    badges.push({
      key: "stock",
      label: String(stock),
      tone: "stock",
    });
  }

  if (!input.comingSoon && (input.status === 0 || input.inStock === false)) {
    badges.push({
      key: "unavailable",
      label: input.status === 0 ? "Unavailable" : "Out of Stock",
      tone: "unavailable",
    });
  }

  return badges;
}

const ProductBadges: React.FC<ProductBadgesProps> = ({
  badges,
  className = "",
  position = "absolute",
}) => {
  if (!badges.length) return null;

  return (
    <div
      className={`product-badges ${position === "absolute" ? "is-absolute" : "is-static"} ${className}`}
    >
      {badges.map((badge) => (
        <span key={badge.key} className={TONE_CLASS[badge.tone]}>
          {badge.label}
        </span>
      ))}
    </div>
  );
};

export default ProductBadges;
