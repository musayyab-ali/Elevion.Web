import React, { Suspense } from "react";
import ProductDefault from "./ProductDefault";
import ProductSkeleton from "@/components/Other/ProductSkeleton";

export default function ProductDefaultPage() {
  return (
    <Suspense fallback={<ProductSkeleton variant="detail" />}>
      <ProductDefault />
    </Suspense>
  );
}
