"use client";

import { useEffect, useState } from "react";
import {
  Category,
  fetchCategoryTree,
  getRootCategories,
} from "@/lib/categories";
import { getApiErrorMessage } from "@/lib/api";

export function useCategoryTree() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchCategoryTree();
        if (!cancelled) {
          setCategories(data);
          setRootCategories(getRootCategories(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load categories."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, rootCategories, loading, error };
}
