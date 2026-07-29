"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  formatBlogDate,
  getBlogDetailUrl,
  getBlogExcerpt,
  getBlogImage,
  NewsEvent,
} from "@/lib/blog";

interface ApiBlogItemProps {
  data: NewsEvent;
  type: "style-one" | "style-list" | "style-default";
}

const ApiBlogItem: React.FC<ApiBlogItemProps> = ({ data, type }) => {
  const router = useRouter();
  const image = getBlogImage(data);
  const date = formatBlogDate(data.NewsEventsDate);
  const excerpt = getBlogExcerpt(data.Description);

  const handleClick = () => {
    router.push(getBlogDetailUrl(data));
  };

  if (type === "style-one") {
    return (
      <div
        className="blog-item style-one h-full cursor-pointer"
        onClick={handleClick}
      >
        <div className="blog-main h-full block">
          <div className="blog-thumb rounded-[20px] overflow-hidden">
            <Image
              src={image}
              width={2000}
              height={1500}
              alt={data.Title}
              unoptimized
              className="w-full aspect-[4/3] object-cover duration-500"
            />
          </div>
          <div className="blog-infor mt-7">
            <div className="blog-tag bg-green py-1 px-2.5 rounded-full text-button-uppercase inline-block">
              Blog
            </div>
            <div className="heading6 blog-title mt-3 duration-300 line-clamp-2">
              {data.Title}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="blog-date caption1 text-secondary">{date}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "style-list") {
    return (
      <div
        className="blog-item style-list h-full cursor-pointer"
        onClick={handleClick}
      >
        <div className="blog-main h-full flex max-md:flex-col md:items-center md:gap-9 gap-6">
          <div className="blog-thumb md:w-1/2 w-full rounded-[20px] overflow-hidden flex-shrink-0">
            <Image
              src={image}
              width={2000}
              height={1500}
              alt={data.Title}
              unoptimized
              className="w-full aspect-[4/3] object-cover duration-500"
            />
          </div>
          <div className="blog-infor">
            <div className="blog-tag bg-green py-1 px-2.5 rounded-full text-button-uppercase inline-block">
              Blog
            </div>
            <div className="heading6 blog-title mt-3 duration-300">
              {data.Title}
            </div>
            <div className="blog-date caption1 text-secondary mt-2">{date}</div>
            <div className="body1 text-secondary mt-4 line-clamp-3">
              {excerpt}
            </div>
            <div className="text-button underline mt-4">Read More</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="blog-item style-default h-full cursor-pointer"
      onClick={handleClick}
    >
      <div className="blog-main h-full block pb-8 border-b border-line">
        <div className="blog-thumb rounded-[20px] overflow-hidden">
          <Image
            src={image}
            width={2000}
            height={1500}
            alt={data.Title}
            unoptimized
            className="w-full aspect-[16/9] object-cover duration-500"
          />
        </div>
        <div className="blog-infor mt-7">
          <div className="blog-tag bg-green py-1 px-2.5 rounded-full text-button-uppercase inline-block">
            Blog
          </div>
          <div className="heading6 blog-title mt-3 duration-300">
            {data.Title}
          </div>
          <div className="blog-date caption1 text-secondary mt-2">{date}</div>
          <div className="body1 text-secondary mt-4 line-clamp-3">{excerpt}</div>
          <div className="text-button underline mt-4">Read More</div>
        </div>
      </div>
    </div>
  );
};

export default ApiBlogItem;
