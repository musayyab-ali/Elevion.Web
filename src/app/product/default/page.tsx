import React, { Suspense } from "react";
import type { Metadata } from "next";
import ProductDefault from "./ProductDefault";
import ProductSkeleton from "@/components/Other/ProductSkeleton";
import { buildProductJsonLd, jsonLdString, loadProductForSeo, productMetadata } from "@/lib/product-seo";
import { fetchBranding } from "@/lib/branding";

type SearchParams = { id?: string; detailId?: string };

const toNumber = (value: string | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const detail = await loadProductForSeo(toNumber(searchParams.id), toNumber(searchParams.detailId));
  return detail ? productMetadata(detail, (await fetchBranding()).shopName) : { title: "Product" };
}

export default async function ProductDefaultPage({ searchParams }: { searchParams: SearchParams }) {
  const detail = await loadProductForSeo(toNumber(searchParams.id), toNumber(searchParams.detailId));

  return (
    <>
      {detail && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(buildProductJsonLd(detail)) }}
        />
      )}
      <Suspense fallback={<ProductSkeleton variant="detail" />}>
        <ProductDefault />
      </Suspense>
    </>
  );
}
