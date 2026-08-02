"use client";

import React, { useEffect, useState } from "react";
import {
  Category,
  fetchCategoryTree,
  getRootCategories,
} from "@/lib/categories";
import { getApiErrorMessage } from "@/lib/api";
import CategorySwiper from "./CategorySwiper";

const Collection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchCategoryTree();
        if (!cancelled) {
          setCategories(getRootCategories(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load collections."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="collection-block md:pt-20 pt-10">
      <div className="container">
        <div className="heading3 text-center">Explore Collections</div>
        <p className="body1 text-secondary text-center mt-3 max-w-2xl mx-auto">
          Browse our parent categories with images, descriptions, and
          subcollections.
        </p>
      </div>

      <div className="list-collection section-swiper-navigation md:mt-10 mt-6 sm:px-5 px-4">
        {loading && (
          <div className="text-center text-secondary py-12">
            Loading collections...
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-red">{error}</p>
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className="text-center text-secondary py-12">
            No collections available.
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <CategorySwiper categories={categories} />
        )}
      </div>
    </div>
  );
};

export default Collection;
