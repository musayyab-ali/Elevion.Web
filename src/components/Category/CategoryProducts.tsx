"use client";

import React, { useEffect, useState } from "react";
import Product from "@/components/Product/Product";
import ProductSkeleton from "@/components/Other/ProductSkeleton";
import { ProductType } from "@/type/ProductType";
import { fetchProductsByCategoryId } from "@/lib/category-products";
import { getApiErrorMessage } from "@/lib/api";

interface CategoryProductsProps {
  categoryId: number;
  categoryName: string;
}

const CategoryProducts: React.FC<CategoryProductsProps> = ({
  categoryId,
  categoryName,
}) => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchProductsByCategoryId(categoryId);
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load products."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  if (loading) {
    return <ProductSkeleton variant="grid" count={8} />;
  }

  if (error) {
    return (
      <div className="text-center py-10 rounded-2xl bg-surface">
        <p className="text-red">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl bg-surface">
        <div className="heading5">No products found</div>
        <p className="body1 text-secondary mt-2">
          There are no products available in {categoryName} right now.
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-5 md:gap-[30px]">
      {products.map((product) => (
        <Product
          key={`${product.id}-${product.productDetailId ?? "default"}`}
          data={product}
          type="grid"
          style="style-1"
        />
      ))}
    </div>
  );
};

export default CategoryProducts;
