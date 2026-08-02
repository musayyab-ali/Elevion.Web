"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Footer from "@/components/Footer/Footer";
import ApiBlogItem from "@/components/Blog/ApiBlogItem";
import {
  fetchBlogDetail,
  fetchNewsEvents,
  formatBlogDate,
  getBlogImage,
  NewsEvent,
  splitBlogParagraphs,
} from "@/lib/blog";
import { getApiErrorMessage } from "@/lib/api";

const BlogDetailContent = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const newsEventsId = Number(params.id);
  const slug = searchParams.get("slug")?.trim() ?? "";

  const [blog, setBlog] = useState<NewsEvent | null>(null);
  const [recentBlogs, setRecentBlogs] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadBlog = async () => {
      if (!Number.isFinite(newsEventsId) || newsEventsId <= 0) {
        setError("Invalid blog ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const detail = await fetchBlogDetail(newsEventsId, slug);
        if (cancelled) return;

        if (!detail) {
          setError("Blog post not found.");
          setBlog(null);
          return;
        }

        setBlog(detail);

        const recent = await fetchNewsEvents(1, 4);
        if (!cancelled) {
          setRecentBlogs(
            recent.items.filter(
              (item) => item.NewsEventsId !== detail.NewsEventsId,
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load blog details."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadBlog();

    return () => {
      cancelled = true;
    };
  }, [newsEventsId, slug]);

  if (loading) {
    return (
      <div className="container md:py-20 py-10 text-center text-secondary">
        Loading blog...
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="container md:py-20 py-10 text-center">
        <p className="text-red">{error || "Blog not found."}</p>
        <Link href="/blog/list" className="button-main inline-block mt-6">
          Back to Blog
        </Link>
      </div>
    );
  }

  const paragraphs = splitBlogParagraphs(blog.Description);
  const heroImage = getBlogImage(blog, true);
  const date = formatBlogDate(blog.NewsEventsDate);

  return (
    <div className="blog detail1">
      <div className="bg-img md:mt-[74px] mt-14">
        <Image
          src={heroImage}
          width={5000}
          height={4000}
          alt={blog.Title}
          unoptimized
          className="w-full min-[1600px]:h-[800px] xl:h-[640px] lg:h-[520px] sm:h-[380px] h-[260px] object-cover"
        />
      </div>

      <div className="container md:pt-20 pt-10">
        <div className="blog-content flex items-center justify-center">
          <div className="main md:w-5/6 w-full">
            <div className="blog-tag bg-green py-1 px-2.5 rounded-full text-button-uppercase inline-block">
              Blog
            </div>
            <h1 className="heading3 mt-3">{blog.Title}</h1>
            <div className="caption1 text-secondary mt-4">{date}</div>

            <div className="content md:mt-8 mt-5 space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="body1 text-secondary whitespace-pre-line"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {blog.Picture && blog.Picture !== heroImage && (
              <div className="mt-8">
                <Image
                  src={blog.Picture}
                  width={3000}
                  height={2000}
                  alt={blog.Title}
                  unoptimized
                  className="w-full rounded-3xl object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {recentBlogs.length > 0 && (
        <div className="container md:py-16 py-10">
          <div className="heading4 mb-6">Recent Posts</div>
          <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-8">
            {recentBlogs.slice(0, 3).map((item) => (
              <ApiBlogItem
                key={item.NewsEventsId}
                data={item}
                type="style-one"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function BlogDetailPage() {
  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-white" />
      </div>

      <Suspense
        fallback={
          <div className="container py-20 text-center text-secondary">
            Loading blog...
          </div>
        }
      >
        <BlogDetailContent />
      </Suspense>

      <Footer />
    </>
  );
}
