"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalQuickviewContext } from "@/context/ModalQuickviewContext";
import Image from "next/image";
import TenantLogo from "@/components/Common/TenantLogo";
import {
  FeaturedProduct,
  fetchFeaturedProducts,
  getProductDetailUrl,
  getProductImage,
  mapFeaturedProductToProductType,
} from "@/lib/featured-products";
import ProductSkeleton from "@/components/Other/ProductSkeleton";

const ModalNewsletter = () => {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { openQuickview } = useModalQuickviewContext();

  const featuredProduct = products[0];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchFeaturedProducts();
        setProducts(data);
      } catch (error) {
        console.error("Failed to load featured products:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

 useEffect(() => {
    if (loading || !products.length) return;

    const hasShown = sessionStorage.getItem("newsletter_shown");

    if (!hasShown) {
      const timer = window.setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("newsletter_shown", "true");
      }, 3000);

      return () => window.clearTimeout(timer);
    }
  }, [loading, products.length]);
  const handleClose = () => setOpen(false);

  const handleDetailProduct = (product: FeaturedProduct) => {
    handleClose();
    router.push(getProductDetailUrl(product.ProductId, product.ProductDetailId));
  };

  if (!loading && !products.length) {
    return null;
  }

  return (
    <div className="modal-newsletter" onClick={handleClose} role="presentation">
      <div className="container h-full flex items-center justify-center w-full px-4 sm:px-6">
        <div
          className={`modal-newsletter-main ${open ? "open" : ""}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Featured products"
        >
          <div className="newsletter-modal-card">
            <aside className="newsletter-modal-promo max-sm:hidden">
              <div className="newsletter-modal-promo-inner">
                <span className="newsletter-modal-badge">Featured Collection</span>
                <TenantLogo
                  className="newsletter-modal-logo"
                  textClassName="heading4 text-2xl font-semibold"
                  imageClassName="h-11 w-11 object-contain"
                />
                <h2 className="newsletter-modal-headline">
                  Style meets simplicity in every order.
                </h2>
                <p className="newsletter-modal-description">
                  Explore hand-picked products, seasonal offers, and a checkout
                  experience built for modern shoppers.
                </p>
                {featuredProduct && (
                  <Link
                    href={getProductDetailUrl(
                      featuredProduct.ProductId,
                      featuredProduct.ProductDetailId,
                    )}
                    className="newsletter-modal-cta"
                    onClick={handleClose}
                  >
                    Shop Featured
                    <Icon.ArrowRight size={18} weight="bold" />
                  </Link>
                )}
              </div>
            </aside>

            <section className="newsletter-modal-content">
              <button
                type="button"
                className="newsletter-modal-close"
                onClick={handleClose}
                aria-label="Close"
              >
                <Icon.X size={18} weight="bold" />
              </button>

              <div className="newsletter-modal-mobile-hero sm:hidden">
                <span className="newsletter-modal-badge newsletter-modal-badge-light">
                  Featured For You
                </span>
                <p className="newsletter-modal-mobile-text">
                  Curated products selected just for you.
                </p>
              </div>

              <div className="newsletter-modal-header">
                <div>
                  <p className="newsletter-modal-eyebrow">Recommended</p>
                  <h3 className="newsletter-modal-title">You May Also Like</h3>
                </div>
                <span className="newsletter-modal-count">
                  {loading ? "..." : `${Math.min(products.length, 5)} items`}
                </span>
              </div>

              <div className="newsletter-modal-list">
                {loading ? (
                  <ProductSkeleton variant="list-item" count={3} />
                ) : (
                  products.slice(0, 5).map((product) => (
                    <article
                      key={product.ProductId}
                      className="newsletter-product-card"
                    >
                      <button
                        type="button"
                        className="newsletter-product-main"
                        onClick={() => handleDetailProduct(product)}
                      >
                        <div className="newsletter-product-image">
                          <Image
                            fill
                            src={getProductImage(product)}
                            alt={product.ProductName}
                            className="object-cover"
                            sizes="88px"
                          />
                        </div>
                        <div className="newsletter-product-info">
                          {product.Category?.CategoryName && (
                            <span className="newsletter-product-category">
                              {product.Category.CategoryName}
                            </span>
                          )}
                          <h4 className="newsletter-product-name">
                            {product.ProductName}
                          </h4>
                          <p className="newsletter-product-price">
                            Rs. {product.Price.toLocaleString()}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="newsletter-product-quickview"
                        onClick={() =>
                          openQuickview(mapFeaturedProductToProductType(product))
                        }
                      >
                        <Icon.Eye size={18} weight="duotone" />
                        <span className="max-sm:hidden">Quick View</span>
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNewsletter;
