"use client";

import React, { useEffect, useState } from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import ApiBlogItem from "@/components/Blog/ApiBlogItem";
import { fetchNewsEvents, NewsEvent } from "@/lib/blog";
import { getApiErrorMessage } from "@/lib/api";

const BlogListPage = () => {
  const [blogs, setBlogs] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadBlogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchNewsEvents(1, 12);
        if (!cancelled) {
          setBlogs(result.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load blog posts."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBlogs();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Blog" subHeading="Blog List" />
      </div>

      <div className="blog md:py-20 py-10">
        <div className="container">
          {loading ? (
            <div className="text-center text-secondary py-10">Loading blogs...</div>
          ) : error ? (
            <div className="text-center text-red py-10">{error}</div>
          ) : blogs.length === 0 ? (
            <div className="text-center text-secondary py-10">
              No blog posts found.
            </div>
          ) : (
            <div className="list-blog grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-[30px]">
              {blogs.map((item) => (
                <ApiBlogItem
                  key={item.NewsEventsId}
                  data={item}
                  type="style-one"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default BlogListPage;
