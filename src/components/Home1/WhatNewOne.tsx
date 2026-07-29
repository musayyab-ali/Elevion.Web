"use client";

import React, { useState, useEffect } from "react";
import Product from "../Product/Product";
import ProductSkeleton from "@/components/Other/ProductSkeleton";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  LandingPageCategoryGroup,
  LandingPageProduct,
  isLandingProductVisible,
  mapLandingProductToProductType,
} from "@/lib/category-products";

const WhatNewOne = () => {
  const [activeTab, setActiveTab] = useState<string>("");
  const [categories, setCategories] = useState<LandingPageCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLandingData = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ Data: LandingPageCategoryGroup[] }>(
          "/api/v1/Product/landing-page",
        );
        if (res.data?.Data) {
          setCategories(res.data.Data);
          if (res.data.Data.length > 0) {
            setActiveTab(res.data.Data[0].Category?.CategoryName ?? "");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLandingData();
  }, []);

  const activeCategory = categories.find(
    (item) => item.Category?.CategoryName === activeTab,
  );
  const products = activeCategory?.ProductList ?? [];
  return (
    <div className="whate-new-block md:pt-20 pt-10">
      <div className="container">
        <div className="heading flex flex-col items-center text-center">
<div className="heading3">What&apos;s new</div>
          <div className="menu-tab flex flex-wrap justify-center items-center gap-2 p-1 bg-surface rounded-2xl mt-6">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-9 w-24 animate-pulse rounded-2xl bg-[#ebebeb]"
                  />
                ))
              : categories.map((item, index) => (
              <div
                key={index}
                className={`tab-item relative text-secondary text-button-uppercase py-2 px-5 cursor-pointer duration-500 hover:text-black ${activeTab === item.Category?.CategoryName ? "active" : ""}`}
                onClick={() => setActiveTab(item.Category?.CategoryName ?? "")}
              >
                {activeTab === item.Category?.CategoryName && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-2xl bg-white"
                  ></motion.div>
                )}
                <span className="relative text-button-uppercase z-[1]">
                  {item.Category?.CategoryName}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="list-product grid lg:grid-cols-4 grid-cols-2 sm:gap-[30px] gap-[20px] md:mt-10 mt-6">
          {loading ? (
            <div className="col-span-full">
              <ProductSkeleton variant="grid" count={8} />
            </div>
          ) : products.length > 0 ? (
            products
              .filter(isLandingProductVisible)
              .map((prd: LandingPageProduct) => (
              <Product
                key={prd.ProductId}
                type="grid"
                style="style-1"
                data={mapLandingProductToProductType(
                  prd,
                  activeCategory?.Category?.CategoryName ?? "",
                )}
              />
            ))
          ) : (
            <p className="col-span-full text-center py-10">
              No products found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatNewOne;
