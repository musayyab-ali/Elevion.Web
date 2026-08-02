"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import api from "@/lib/api";

interface BrandItem {
  Text: string;
  Value: string;
}

interface BrandsResponse {
  Data?: BrandItem[];
}

function hasLogo(value: string): boolean {
  if (!value?.trim()) return false;
  return (
    value.startsWith("http") ||
    value.startsWith("/") ||
    /\.(png|jpe?g|webp|svg|gif)$/i.test(value)
  );
}

const Brand = () => {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getBrands = async () => {
      try {
        const response = await api.get<BrandsResponse>("/api/v1/Common/brands");
        const data = (response.data?.Data ?? []).filter(
          (item) => item.Text?.trim() && item.Value?.trim() !== "",
        );
        setBrands(data);
      } catch (error) {
        console.error("Error fetching brands:", error);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    };

    void getBrands();
  }, []);

  if (!loading && brands.length === 0) {
    return null;
  }

  return (
    <section className="brand-block bg-white md:py-20 py-12">
      <div className="container px-4 sm:px-6">
        <div className="text-center">
          <h2 className="heading3">Our Top Brands</h2>
          <p className="caption1 text-secondary mt-3">
            Explore the wide range of brands we feature
          </p>
        </div>

        <div className="brand-grid md:mt-10 mt-8">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="brand-card brand-card-skeleton" />
              ))
            : brands.map((brand) => (
                <div key={`${brand.Value}-${brand.Text}`} className="brand-card">
                  {hasLogo(brand.Value) ? (
                    <Image
                      src={brand.Value}
                      alt={brand.Text}
                      width={120}
                      height={48}
                      unoptimized
                      className="brand-card-logo"
                    />
                  ) : (
                    <span className="brand-card-name">{brand.Text}</span>
                  )}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};

export default Brand;
