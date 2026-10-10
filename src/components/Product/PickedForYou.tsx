"use client";

import { useEffect, useState } from "react";
import Product from "@/components/Product/Product";
import { fetchCategoryProducts } from "@/lib/product-search";
import { excludeSeen, topCategory } from "@/lib/picked-for-you";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import type { ProductType } from "@/type/ProductType";

/** "Picked for you": more products from the category this customer looks at most. Shown only when there is something to suggest. */
const PickedForYou = ({ className = "" }: { className?: string }) => {
  const [items, setItems] = useState<ProductType[]>([]);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    let cancelled = false;
    const recent = getRecentlyViewed();
    const category = topCategory(recent);
    if (!category) return;

    fetchCategoryProducts(category.id, 12)
      .then((page) => {
        if (cancelled) return;
        setItems(excludeSeen(page.products, recent).slice(0, 4));
        setCategoryName(category.name);
      })
      .catch(() => undefined); // a suggestion is optional: on failure the section simply stays hidden

    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className={className} aria-label="Picked for you">
      <div className="heading4">Picked for you</div>
      {categoryName && <p className="caption1 text-secondary mt-1">Because you looked at {categoryName}</p>}
      <div className="list-product hide-product-sold grid lg:grid-cols-4 sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-6">
        {items.map((item) => (
          <Product key={`${item.id}-${item.productDetailId ?? "default"}`} data={item} type="grid" style="style-1" />
        ))}
      </div>
    </section>
  );
};

export default PickedForYou;
