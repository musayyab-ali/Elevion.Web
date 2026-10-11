"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatRsPrice } from "@/lib/cart";
import { getProductDetailUrl } from "@/lib/featured-products";
import {
  RECENTLY_VIEWED_EVENT,
  clearRecentlyViewed,
  getRecentlyViewed,
  type RecentProduct,
} from "@/lib/recently-viewed";
import { COOKIE_CONSENT_EVENT, preferencesAllowed } from "@/lib/cookie-consent";

type Props = {
  /** The product being looked at right now is not suggested to itself. */
  excludeId?: number;
  className?: string;
};

const RecentlyViewed = ({ excludeId, className = "" }: Props) => {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    const load = () => setItems(preferencesAllowed() ? getRecentlyViewed() : []);
    load();
    window.addEventListener(RECENTLY_VIEWED_EVENT, load);
    window.addEventListener(COOKIE_CONSENT_EVENT, load);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, load);
      window.removeEventListener(COOKIE_CONSENT_EVENT, load);
    };
  }, []);

  const visible = items.filter((item) => item.id !== excludeId).slice(0, 8);
  if (visible.length === 0) return null;

  return (
    <section className={`recently-viewed ${className}`} aria-label="Recently viewed products">
      <div>
        <div className="flex items-end justify-between gap-4">
          <h2 className="heading4">Recently viewed</h2>
          <button type="button" className="caption1 text-secondary underline" onClick={clearRecentlyViewed}>
            Clear
          </button>
        </div>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 snap-x">
          {visible.map((item) => (
            <Link
              key={item.id}
              href={getProductDetailUrl(item.id, item.detailId)}
              className="snap-start shrink-0 w-[160px] md:w-[200px] group"
            >
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-surface">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="200px"
                  className="object-cover duration-500 group-hover:scale-105"
                />
              </div>
              <div className="mt-2 text-button line-clamp-2">{item.name}</div>
              {item.price > 0 && <div className="caption1 text-secondary mt-0.5">{formatRsPrice(item.price)}</div>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
