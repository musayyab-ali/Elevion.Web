"use client";

import React from "react";
import { useParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Footer from "@/components/Footer/Footer";
import CategoryExplore from "@/components/Category/CategoryExplore";

export default function CategoryPage() {
  const params = useParams();
  const categoryId = Number(params.categoryId);

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
      </div>
      {Number.isFinite(categoryId) ? (
        <CategoryExplore categoryId={categoryId} />
      ) : (
        <div className="container md:py-20 py-10 text-center">
          <div className="heading3">Invalid category</div>
        </div>
      )}
      <Footer />
    </>
  );
}
