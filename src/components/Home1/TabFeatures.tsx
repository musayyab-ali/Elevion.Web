"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css/bundle";
import Product from "../Product/Product";
import ProductSkeleton from "@/components/Other/ProductSkeleton";
import { motion } from "framer-motion";
import {
  fetchProductsByBrand,
  filterProductsForHomeTab,
  HomeProductTab,
  LandingPageProduct,
  mapLandingProductToProductType,
} from "@/lib/category-products";

const TABS: HomeProductTab[] = ["best sellers", "on sale", "new arrivals"];

const TabFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HomeProductTab>("on sale");
  const [products, setProducts] = useState<LandingPageProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const apiProducts = await fetchProductsByBrand(1, 50);
        if (cancelled) return;
        setProducts(apiProducts);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setError("Unable to load products. Please try again later.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(
    () =>
      filterProductsForHomeTab(products, activeTab).map((product) =>
        mapLandingProductToProductType(product),
      ),
    [products, activeTab],
  );

  return (
    <div className="tab-features-block md:pt-20 pt-10">
      <div className="container">
        <div className="heading flex flex-col items-center text-center">
          <div className="menu-tab flex items-center gap-2 p-1 bg-surface rounded-2xl">
            {TABS.map((item) => (
              <div
                key={item}
                className={`tab-item relative text-secondary heading5 py-2 px-5 cursor-pointer duration-500 hover:text-black ${activeTab === item ? "active" : ""}`}
                onClick={() => setActiveTab(item)}
              >
                {activeTab === item && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-2xl bg-white"
                  ></motion.div>
                )}
                <span className="relative heading5 z-[1]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="list-product hide-product-sold section-swiper-navigation style-outline style-border md:mt-10 mt-6">
          {loading ? (
            <ProductSkeleton variant="grid" count={4} />
          ) : error ? (
            <p className="text-center py-10 text-secondary">{error}</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center py-10 text-secondary">
              No products found for this tab.
            </p>
          ) : (
            <Swiper
              spaceBetween={12}
              slidesPerView={2}
              navigation
              loop={filteredProducts.length > 4}
              modules={[Navigation, Autoplay]}
              breakpoints={{
                576: {
                  slidesPerView: 2,
                  spaceBetween: 12,
                },
                768: {
                  slidesPerView: 3,
                  spaceBetween: 20,
                },
                1200: {
                  slidesPerView: 4,
                  spaceBetween: 30,
                },
              }}
            >
              {filteredProducts.map((product) => (
                <SwiperSlide key={product.id}>
                  <Product data={product} type="grid" style="style-1" />
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabFeatures;
