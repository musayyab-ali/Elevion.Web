"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import ProductDetailApi from "@/components/Product/Detail/ProductDetailApi";
import Footer from "@/components/Footer/Footer";

const ProductDefault = () => {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id") || "";
  const productDetailId = searchParams.get("detailId") || undefined;

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-white" />
        <div className="breadcrumb-product">
          <div className="main bg-surface md:pt-[88px] pt-[70px] pb-[14px]">
            <div className="container flex items-center justify-between flex-wrap gap-3">
              <div className="left flex items-center gap-1">
                <Link href="/" className="caption1 text-secondary2 hover:underline">
                  Homepage
                </Link>
                <Icon.CaretRight size={12} className="text-secondary2" />
                <div className="caption1 text-secondary2">Product</div>
                <Icon.CaretRight size={12} className="text-secondary2" />
                <div className="caption1 capitalize">Product Details</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {productId ? (
        <ProductDetailApi
          productId={productId}
          productDetailId={productDetailId}
        />
      ) : (
        <div className="container py-20 text-center text-secondary">
          Product not found.
        </div>
      )}

      <Footer />
    </>
  );
};

export default ProductDefault;
