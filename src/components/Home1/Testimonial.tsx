"use client";

import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css/bundle";
import TestimonialItem from "../Testimonial/TestimonialItem";
import { TestimonialType } from "@/type/TestimonialType";
import { fetchRecentTestimonials } from "@/lib/reviews";
import { getApiErrorMessage } from "@/lib/api";

interface Props {
  limit?: number;
}

const Testimonial: React.FC<Props> = ({ limit = 6 }) => {
  const [testimonials, setTestimonials] = useState<TestimonialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTestimonials = async () => {
      setLoading(true);
      setError(null);

      try {
        const items = await fetchRecentTestimonials(limit);
        if (!cancelled) {
          setTestimonials(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load reviews."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTestimonials();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (!loading && !error && testimonials.length === 0) {
    return null;
  }

  return (
    <div className="testimonial-block md:py-20 py-10 bg-surface">
      <div className="container">
        <div className="heading3 text-center">What People Are Saying</div>

        {error && (
          <p className="text-red text-center mt-6">{error}</p>
        )}

        {loading ? (
          <p className="text-secondary text-center mt-10">Loading reviews...</p>
        ) : (
          <div className="list-testimonial pagination-mt40 md:mt-10 mt-6">
            <Swiper
              spaceBetween={12}
              slidesPerView={1}
              pagination={{ clickable: true }}
              loop={testimonials.length > 3}
              modules={[Pagination, Autoplay]}
              breakpoints={{
                680: {
                  slidesPerView: 2,
                  spaceBetween: 20,
                },
                1200: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                },
              }}
            >
              {testimonials.map((item) => (
                <SwiperSlide key={item.id}>
                  <TestimonialItem data={item} type="style-one" />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </div>
  );
};

export default Testimonial;
