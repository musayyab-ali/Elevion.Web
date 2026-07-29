"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css/bundle";
import "swiper/css/effect-fade";
import {
  fetchTenantBanners,
  getBannerLink,
  isBannerClickable,
  TenantBanner,
} from "@/lib/tenant-landing";

const sliderHeightClass =
  "xl:h-[520px] lg:h-[480px] md:h-[400px] sm:h-[320px] h-[260px]";

const BannerSlide = ({ banner }: { banner: TenantBanner }) => {
  const clickable = isBannerClickable(banner);
  const href = getBannerLink(banner);
  const title = banner.BannerText?.trim() || banner.Name?.trim() || "";
  const subtitle = banner.BannerSubText?.trim() || "";
  const hasOverlay = Boolean(title || subtitle);

  const slide = (
    <div className="slider-item relative h-full w-full overflow-hidden">
      <Image
        src={banner.ImagePath}
        alt={title || banner.ImageName || "Banner"}
        fill
        unoptimized
        priority
        sizes="100vw"
        className="object-cover"
      />
      {hasOverlay && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 px-4 py-6 text-center sm:px-8">
          {title && (
            <h2 className="max-w-4xl text-xl font-semibold text-white sm:text-2xl md:text-3xl lg:text-4xl">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-2 max-w-3xl text-sm text-white/95 sm:text-base md:text-lg">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (clickable && href) {
    return (
      <Link href={href} className="block h-full w-full cursor-pointer">
        {slide}
      </Link>
    );
  }

  return (
    <div className="h-full w-full cursor-default select-none">{slide}</div>
  );
};

const SliderOne = () => {
  const [banners, setBanners] = useState<TenantBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        setLoading(true);
        const data = await fetchTenantBanners();
        setBanners(data);
      } catch (error) {
        console.error("Failed to fetch banners:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadBanners();
  }, []);

  if (loading) {
    return (
      <div
        className={`slider-block style-one bg-linear flex w-full items-center justify-center pt-[3.5rem] ${sliderHeightClass}`}
      >
        <p className="text-secondary">Loading banners...</p>
      </div>
    );
  }

  if (!banners.length) return null;

  return (
    <div
      className={`slider-block style-one bg-linear w-full pt-[4rem] md:pt-[3rem] ${sliderHeightClass}`}
    >
      <div className={`slider-main h-full w-full ${sliderHeightClass}`}>
        <Swiper
          spaceBetween={0}
          slidesPerView={1}
          loop={banners.length > 1}
          pagination={{ clickable: true }}
          modules={[Pagination, Autoplay]}
          className="relative h-full"
          autoplay={{ delay: 4000, disableOnInteraction: false }}
        >
          {banners.map((banner) => (
            <SwiperSlide
              key={`${banner.PlateForm}-${banner.BannerId}`}
              className="h-full"
            >
              <BannerSlide banner={banner} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default SliderOne;
