"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css/bundle";
import { Category } from "@/lib/categories";
import CategoryDetailCard from "./CategoryDetailCard";

interface CategorySwiperProps {
  categories: Category[];
}

const CategorySwiper: React.FC<CategorySwiperProps> = ({ categories }) => {
  const enableLoop = categories.length > 4;

  return (
    <Swiper
      spaceBetween={20}
      slidesPerView={1}
      navigation
      loop={enableLoop}
      modules={[Navigation]}
      breakpoints={{
        576: { slidesPerView: 1, spaceBetween: 16 },
        768: { slidesPerView: 2, spaceBetween: 20 },
        1200: { slidesPerView: 3, spaceBetween: 24 },
      }}
      className="h-full"
    >
      {categories.map((category) => (
        <SwiperSlide key={category.CategoryId} className="!h-auto">
          <CategoryDetailCard category={category} variant="swiper" />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default CategorySwiper;
