"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css/bundle";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import type { Swiper as SwiperType } from "swiper";
import Rate from "@/components/Other/Rate";
import ProductSkeleton from "@/components/Other/ProductSkeleton";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useModalWishlistContext } from "@/context/ModalWishlistContext";
import { useCompare } from "@/context/CompareContext";
import { useModalCompareContext } from "@/context/ModalCompareContext";
import {
  fetchProductDetails,
  getDisplayImages,
  getVariantDisplayImage,
  getVariantPrice,
  getComparePrice,
  getDetailSalePrice,
  formatRsPrice,
  formatDiscountBadge,
  getActiveDiscount,
  getAvailableStockCount,
  canAddProductToCart,
  parseVariantGroupOptions,
  findVariantByGroupSelection,
  saveProductRating,
  ProductDetailData,
  ProductVariantCombination,
  RelatedProduct,
} from "@/lib/product-details";
import {
  getProductDetailUrl,
  mapProductDetailToProductType,
} from "@/lib/featured-products";
import { getApiErrorMessage } from "@/lib/api";
import { ProductType } from "@/type/ProductType";
import ProductBadges, {
  buildProductBadges,
} from "@/components/Product/ProductBadges";
import { toast } from "react-hot-toast";

interface Props {
  productId: string;
  productDetailId?: string;
}

const ProductDetailApi: React.FC<Props> = ({ productId, productDetailId }) => {
  const router = useRouter();
  const [productDetail, setProductDetail] = useState<ProductDetailData | null>(
    null,
  );
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariantCombination | null>(null);
  const [groupSelections, setGroupSelections] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"description" | "rating">(
    "description",
  );
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);

  const { addToCart } = useCart();
  const { openModalCart } = useModalCartContext();
  const { addToWishlist, removeFromWishlist, wishlistState } = useWishlist();
  const { openModalWishlist } = useModalWishlistContext();
  const { addToCompare, removeFromCompare, compareState } = useCompare();
  const { openModalCompare } = useModalCompareContext();

  const syncGroupSelections = (
    detail: ProductDetailData,
    variant: ProductVariantCombination | null,
  ) => {
    if (!variant || !detail.ProductVariantGroups?.length) {
      setGroupSelections({});
      return;
    }

    const parts = variant.VariantName.split(",").map((part) => part.trim());
    const nextSelections: Record<string, string> = {};
    detail.ProductVariantGroups.forEach((group, index) => {
      const value = parts[index] ?? parts[parts.length - 1];
      if (value) {
        nextSelections[group.VariantGroupName] = value;
      }
    });
    setGroupSelections(nextSelections);
  };

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError("");

      try {
        const detail = await fetchProductDetails(
          Number(productId),
          productDetailId ? Number(productDetailId) : undefined,
        );

        setProductDetail(detail);
        // Do not auto-select size/color/variant — user must choose
        setSelectedVariant(null);
        setGroupSelections({});
        setQuantity(1);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load product details."));
        setProductDetail(null);
        setSelectedVariant(null);
        setGroupSelections({});
      } finally {
        setLoading(false);
      }
    };

    void loadProduct();
  }, [productId, productDetailId]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedVariant?.ProductDetailId, productDetail?.ProductId]);

  useEffect(() => {
    setRatingValue(0);
    setHoverRating(0);
    setReviewText("");
    setRatingSuccess(null);
    setRatingError(null);
    setActiveTab("description");
  }, [productId, productDetailId]);

  if (loading) {
    return <ProductSkeleton variant="detail" />;
  }

  if (error || !productDetail) {
    return (
      <div className="product-detail default md:py-20 py-10">
        <div className="container text-center text-red-600">
          {error || "Product not found."}
        </div>
      </div>
    );
  }

  const images = getDisplayImages(productDetail, selectedVariant);
  const variants =
    productDetail.ProductVariantDetail?.productVariantCombinationList ?? [];
  const variantGroups = parseVariantGroupOptions(productDetail);
  const relatedProducts = productDetail.relatedProductList ?? [];
  const unitPrice = selectedVariant
    ? getVariantPrice(selectedVariant)
    : getDetailSalePrice(productDetail);
  const compareUnitPrice = getComparePrice(productDetail, selectedVariant);
  const totalPrice = unitPrice * quantity;
  const totalComparePrice =
    compareUnitPrice > unitPrice ? compareUnitPrice * quantity : 0;
  const percentSale =
    compareUnitPrice > unitPrice
      ? Math.floor(100 - (unitPrice / compareUnitPrice) * 100)
      : 0;
  const showPriceRange =
    !selectedVariant && productDetail.MinPrice !== productDetail.MaxPrice;
  const inStock = selectedVariant?.InStock ?? productDetail.InStock ?? false;
  const productIdStr = String(productDetail.ProductId);
  const activeDiscount = getActiveDiscount(productDetail, selectedVariant);
  const discountLabel = formatDiscountBadge(
    activeDiscount.discount,
    activeDiscount.discountType,
  );
  const availableStock = getAvailableStockCount(productDetail, selectedVariant);
  const cartGate = canAddProductToCart(productDetail, {
    selectedVariant,
    inStock,
  });
  const maxQuantity =
    availableStock !== null ? Math.max(1, availableStock) : 999;
  const detailBadges = buildProductBadges({
    isPromotional:
      productDetail.IsPromotional || Boolean(selectedVariant?.IsPromotional),
    discountLabel,
    inventoryManagement:
      selectedVariant?.InventoryManagement ?? productDetail.InventoryManagement,
    availableStock,
    comingSoon: productDetail.ComingSoon,
    status: productDetail.Status,
    inStock,
  });

  const handleGroupSelection = (groupName: string, option: string) => {
    const nextSelections = { ...groupSelections, [groupName]: option };
    setGroupSelections(nextSelections);

    const matchedVariant = findVariantByGroupSelection(
      productDetail,
      nextSelections,
    );
    setSelectedVariant(matchedVariant);
    if (matchedVariant) {
      setActiveImageIndex(0);
      if (mainSwiper && !mainSwiper.destroyed) {
        mainSwiper.slideTo(0, 0);
      }
    }
  };

  const handleVariantSelect = (variant: ProductVariantCombination) => {
    setSelectedVariant(variant);
    syncGroupSelections(productDetail, variant);
    setActiveImageIndex(0);
  };

  const handleThumbnailClick = (index: number) => {
    setActiveImageIndex(index);
    if (mainSwiper && !mainSwiper.destroyed) {
      mainSwiper.slideTo(index);
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.min(maxQuantity, Math.max(1, prev + delta)));
  };

  const handleAddToCart = async () => {
    if (!cartGate.allowed) {
      toast.error(cartGate.reason || "Unable to add this product to cart.");
      return;
    }

    const variantsList =
      productDetail.ProductVariantDetail?.productVariantCombinationList ?? [];
    if (variantsList.length > 0 && !selectedVariant) {
      toast.error("Please select size, color and variant first.");
      return;
    }

    const cartProduct = mapProductDetailToProductType(
      productDetail,
      selectedVariant ?? undefined,
    );
    cartProduct.quantityPurchase = Math.min(quantity, maxQuantity);

    try {
      await addToCart(cartProduct);
      openModalCart();
    } catch {
      // handled in context
    }
  };

  const handleWishlist = () => {
    const wishlistProduct = mapProductDetailToProductType(
      productDetail,
      selectedVariant ?? undefined,
    );

    if (
      wishlistState.wishlistArray.some(
        (item: ProductType) => item.id === wishlistProduct.id,
      )
    ) {
      removeFromWishlist(wishlistProduct.id);
    } else {
      addToWishlist(wishlistProduct);
    }
    openModalWishlist();
  };

  const handleCompare = () => {
    const compareProduct = mapProductDetailToProductType(
      productDetail,
      selectedVariant ?? undefined,
    );

    if (compareState.compareArray.length < 3) {
      if (
        compareState.compareArray.some((item) => item.id === compareProduct.id)
      ) {
        removeFromCompare(compareProduct.id);
      } else {
        addToCompare(compareProduct);
      }
    } else {
      alert("Compare up to 3 products");
    }
    openModalCompare();
  };

  const handleRelatedProductClick = (related: RelatedProduct) => {
    router.push(getProductDetailUrl(related.ProductId));
  };

  const reloadProductDetails = async () => {
    const detail = await fetchProductDetails(
      Number(productId),
      productDetailId ? Number(productDetailId) : undefined,
    );
    setProductDetail(detail);
  };

  const handleSubmitRating = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!productDetail) return;

    if (!productDetail.EnableSubmitRatingReviews) {
      const message = "Reviews are not available for this product right now.";
      setRatingError(message);
      toast.error(message);
      return;
    }

    if (ratingValue < 1) {
      setRatingError("Please select a star rating.");
      return;
    }

    const trimmedReview = reviewText.trim();
    if (!trimmedReview) {
      setRatingError("Please write your review.");
      return;
    }

    setSubmittingRating(true);
    setRatingError(null);
    setRatingSuccess(null);

    try {
      const result = await saveProductRating({
        Rating: ratingValue,
        Review: trimmedReview,
        ProductId: productDetail.ProductId,
      });

      setRatingSuccess(result.message);
      setRatingValue(0);
      setHoverRating(0);
      setReviewText("");
      toast.success(result.message);

      try {
        await reloadProductDetails();
      } catch {
        // Rating saved; refresh is best-effort only.
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to submit rating.");
      setRatingError(message);
      toast.error(message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const displayRating = hoverRating || ratingValue;
  const canSubmitRating = Boolean(productDetail?.EnableSubmitRatingReviews);

  return (
    <div className="product-detail default">
      <div className="md:py-16 py-8">
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Gallery */}
            <div className="w-full lg:w-1/2 relative">
              <ProductBadges badges={detailBadges} className="z-[3]" />
              <Swiper
                onSwiper={setMainSwiper}
                onSlideChange={(swiper) =>
                  setActiveImageIndex(swiper.activeIndex)
                }
                slidesPerView={1}
                spaceBetween={0}
                modules={[Navigation]}
                navigation
                className="rounded-2xl overflow-hidden bg-surface product-detail-gallery"
              >
                {images.map((item, index) => (
                  <SwiperSlide key={`${item}-${index}`}>
                    <Image
                      src={item}
                      width={1000}
                      height={1333}
                      alt={productDetail.Name}
                      priority={index === 0}
                      className="w-full aspect-[3/4] object-cover"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>

              {images.length > 1 && (
                <div className="flex gap-2 sm:gap-3 mt-4 overflow-x-auto pb-1">
                  {images.map((item, index) => (
                    <button
                      type="button"
                      key={`thumb-${item}-${index}`}
                      aria-label={`Show image ${index + 1}`}
                      className={`flex-shrink-0 w-16 h-20 sm:w-[72px] sm:h-[96px] rounded-xl overflow-hidden border-2 transition-colors ${activeImageIndex === index ? "border-black" : "border-line hover:border-black"}`}
                      onClick={() => handleThumbnailClick(index)}
                    >
                      <Image
                        src={item}
                        width={72}
                        height={96}
                        alt={`${productDetail.Name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="w-full lg:w-1/2">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="caption2 text-secondary font-semibold uppercase tracking-wide">
                    {productDetail.Category}
                  </div>
                  <h1 className="heading3 mt-2 break-words">
                    {productDetail.Name}
                  </h1>
                </div>
                <button
                  type="button"
                  className={`add-wishlist-btn w-12 h-12 flex-shrink-0 flex items-center justify-center border border-line rounded-xl duration-300 hover:bg-black hover:text-white ${wishlistState.wishlistArray.some((item: ProductType) => item.id === productIdStr) ? "bg-black text-white" : ""}`}
                  onClick={handleWishlist}
                  aria-label="Add to wishlist"
                >
                  <Icon.Heart
                    size={22}
                    weight={
                      wishlistState.wishlistArray.some(
                        (item: ProductType) => item.id === productIdStr,
                      )
                        ? "fill"
                        : "regular"
                    }
                  />
                </button>
              </div>

              {productDetail.AverageRating > 0 && (
                <div className="flex items-center mt-4">
                  <Rate currentRate={productDetail.AverageRating} size={16} />
                  <span className="caption1 text-secondary ml-2">
                    ({productDetail.AverageRating} rating)
                  </span>
                </div>
              )}

              {/* Pricing */}
              <div className="mt-6 p-5 rounded-2xl bg-surface border border-line">
                <div className="flex items-center gap-3 flex-wrap">
                  {showPriceRange ? (
                    <span className="heading4">
                      {formatRsPrice(productDetail.MinPrice)} –{" "}
                      {formatRsPrice(productDetail.MaxPrice)}
                    </span>
                  ) : (
                    <span className="heading4">{formatRsPrice(unitPrice)}</span>
                  )}
                  {compareUnitPrice > unitPrice && (
                    <>
                      <span className="text-secondary2 line-through">
                        {formatRsPrice(compareUnitPrice)}
                      </span>
                      <span className="caption2 font-semibold bg-green text-white px-3 py-0.5 rounded-full">
                        -{percentSale}%
                      </span>
                    </>
                  )}
                </div>

                {quantity > 1 && (
                  <div className="mt-4 pt-4 border-t border-line">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-secondary">
                        {formatRsPrice(unitPrice)} × {quantity}
                      </span>
                      <span className="heading5">
                        {formatRsPrice(totalPrice)}
                      </span>
                    </div>
                    {totalComparePrice > totalPrice && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="caption2 text-secondary">
                          You save
                        </span>
                        <span className="caption2 text-green font-semibold">
                          {formatRsPrice(totalComparePrice - totalPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {productDetail.Description && (
                <p className="desc text-secondary mt-5 leading-relaxed">
                  {productDetail.Description}
                </p>
              )}

              {/* Size & Color */}
              {variantGroups.map((group) => (
                <div className="mt-6" key={group.groupName}>
                  <div className="text-title mb-3">{group.groupName}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => (
                      <button
                        type="button"
                        key={`${group.groupName}-${option}`}
                        className={`px-4 py-2.5 text-button rounded-full border transition-all ${groupSelections[group.groupName] === option ? "bg-black text-white border-black" : "bg-white border-line hover:border-black"}`}
                        onClick={() =>
                          handleGroupSelection(group.groupName, option)
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Variants with images */}
              {variants.length > 0 && (
                <div className="mt-8">
                  <div className="text-title mb-4">Select Variant</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {variants.map((variant) => {
                      // Use exact ImageName from API response
                      const variantImage =
                        variant.ImageName?.trim() ||
                        getVariantDisplayImage(variant, productDetail);
                      const isSelected =
                        selectedVariant?.ProductDetailId ===
                        variant.ProductDetailId;

                      return (
                        <button
                          type="button"
                          key={variant.ProductDetailId}
                          disabled={!variant.InStock}
                          className={`text-left rounded-2xl border overflow-hidden transition-all ${isSelected ? "border-black ring-2 ring-black shadow-md" : "border-line hover:border-black"} ${!variant.InStock ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => handleVariantSelect(variant)}
                        >
                          <div className="aspect-square relative bg-surface">
                            <Image
                              src={variantImage}
                              fill
                              sizes="(max-width: 640px) 50vw, 160px"
                              alt={variant.VariantName}
                              className="object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <div className="text-button line-clamp-2 leading-snug">
                              {variant.VariantName}
                            </div>
                            <div className="caption1 font-semibold mt-1.5">
                              {formatRsPrice(getVariantPrice(variant))}
                            </div>
                            <div className="caption2 text-secondary mt-1">
                              SKU: {variant.SKU}
                            </div>
                            <div
                              className={`caption2 font-semibold mt-0.5 ${variant.InStock ? "text-yellow" : "text-red"}`}
                            >
                              {variant.InStock ? "In Stock" : "Out of Stock"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mt-8">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-title">Quantity</div>
                  {availableStock !== null && (
                    <span className="caption1 font-semibold text-black">
                      Available:{" "}
                      <span className="inline-flex min-w-[28px] items-center justify-center rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[#1d4ed8]">
                        {availableStock}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className="quantity-block p-3 flex items-center justify-between rounded-xl border border-line w-full sm:w-[160px] flex-shrink-0 bg-white">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className={`p-1 ${quantity <= 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:text-black"}`}
                    >
                      <Icon.Minus size={20} />
                    </button>
                    <span className="body1 font-semibold min-w-[32px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= maxQuantity}
                      className={`p-1 ${quantity >= maxQuantity ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:text-black"}`}
                    >
                      <Icon.Plus size={20} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => void handleAddToCart()}
                      disabled={!cartGate.allowed}
                      className={`button-main flex-1 bg-black text-center ${cartGate.allowed ? "hover:opacity-90" : "opacity-50 cursor-not-allowed"}`}
                    >
                      {productDetail.ComingSoon
                        ? "Coming Soon"
                        : productDetail.Status === 0
                          ? "Unavailable"
                          : cartGate.allowed
                            ? `Add To Cart — ${formatRsPrice(totalPrice)}`
                            : "Out of Stock"}
                    </button>
                    <button
                      type="button"
                      className="compare flex items-center justify-center gap-2 px-5 py-3 border border-line rounded-full hover:bg-black hover:text-white transition-colors"
                      onClick={handleCompare}
                    >
                      <Icon.ArrowsCounterClockwise size={20} />
                      <span>Compare</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Meta info */}
              <div className="more-infor mt-8 pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <span className="text-title">SKU:</span>
                  <span className="text-secondary">
                    {selectedVariant?.SKU || productDetail.DefaultSKU}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-title">Brand:</span>
                  <span className="text-secondary">
                    {productDetail.BrandName || "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-title">Category:</span>
                  <span className="text-secondary">
                    {productDetail.Category}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-title">Stock:</span>
                  <span
                    className={`${inStock ? "text-yellow" : "text-red"} font-semibold`}
                  >
                    {inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <span className="text-title">Price Range:</span>
                  <span className="text-secondary">
                    {formatRsPrice(productDetail.MinPrice)} –{" "}
                    {formatRsPrice(productDetail.MaxPrice)}
                  </span>
                </div>
                {productDetail.Tags && (
                  <div className="flex gap-2 sm:col-span-2">
                    <span className="text-title">Tags:</span>
                    <span className="text-secondary">{productDetail.Tags}</span>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="desc-tab mt-10">
                <div className="flex items-center gap-6 border-b border-line">
                  <button
                    type="button"
                    className={`caption1 pb-3 transition-colors ${activeTab === "description" ? "border-b-2 border-black font-semibold" : "text-secondary hover:text-black"}`}
                    onClick={() => setActiveTab("description")}
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    className={`caption1 pb-3 transition-colors ${activeTab === "rating" ? "border-b-2 border-black font-semibold" : "text-secondary hover:text-black"}`}
                    onClick={() => setActiveTab("rating")}
                  >
                    Rating & Review
                  </button>
                </div>
                <div className="desc-block mt-5 text-secondary leading-relaxed">
                  {activeTab === "description" ? (
                    <p className="whitespace-pre-line">
                      {productDetail.LongDescription ||
                        productDetail.Description}
                    </p>
                  ) : (
                    <div id="form-review" className="form-review">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                          <div className="heading6 text-black">
                            {canSubmitRating
                              ? "Rate this product"
                              : "Customer ratings"}
                          </div>
                          <p className="caption1 text-secondary mt-1">
                            {canSubmitRating
                              ? `Share your experience with ${productDetail.Name}`
                              : "Reviews cannot be submitted for this product at the moment."}
                          </p>
                        </div>
                        {productDetail.AverageRating > 0 && (
                          <div className="flex items-center gap-2">
                            <Rate
                              currentRate={productDetail.AverageRating}
                              size={16}
                            />
                            <span className="caption1 text-secondary">
                              ({productDetail.AverageRating} avg)
                            </span>
                          </div>
                        )}
                      </div>

                      {canSubmitRating ? (
                        <form
                          className="grid grid-cols-1 gap-5"
                          onSubmit={(event) => void handleSubmitRating(event)}
                        >
                          <div>
                            <div className="text-button mb-3">Your Rating</div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {Array.from({ length: 5 }, (_, index) => {
                                const starValue = index + 1;
                                const isActive = starValue <= displayRating;

                                return (
                                  <button
                                    key={starValue}
                                    type="button"
                                    aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
                                    className="p-1 transition-transform hover:scale-110"
                                    onClick={() => setRatingValue(starValue)}
                                    onMouseEnter={() =>
                                      setHoverRating(starValue)
                                    }
                                    onMouseLeave={() => setHoverRating(0)}
                                    disabled={submittingRating}
                                  >
                                    <Icon.Star
                                      size={28}
                                      weight="fill"
                                      color={isActive ? "#ECB018" : "#9FA09C"}
                                    />
                                  </button>
                                );
                              })}
                              <span className="caption1 text-secondary ml-2">
                                {ratingValue > 0
                                  ? `${ratingValue} / 5`
                                  : "Select stars"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="product-review"
                              className="text-button mb-3 block"
                            >
                              Your Review
                            </label>
                            <textarea
                              id="product-review"
                              className="border border-line px-4 py-3 w-full rounded-xl min-h-[140px] resize-y"
                              placeholder="Write your review here..."
                              value={reviewText}
                              onChange={(event) =>
                                setReviewText(event.target.value)
                              }
                              disabled={submittingRating}
                              required
                            />
                          </div>

                          {ratingError && (
                            <p className="caption1 text-red">{ratingError}</p>
                          )}

                          {ratingSuccess && (
                            <p className="caption1 text-green">
                              {ratingSuccess}
                            </p>
                          )}

                          <div>
                            <button
                              type="submit"
                              disabled={submittingRating}
                              className="button-main bg-white text-black border border-black disabled:opacity-60"
                            >
                              {submittingRating
                                ? "Submitting..."
                                : "Submit Review"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="border border-line rounded-xl px-5 py-4 bg-surface">
                          <p className="caption1 text-secondary">
                            Rating and review submission is disabled for this
                            product. You can still view the average rating if
                            available.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="related-product mt-16 md:mt-24 pt-10 border-t border-line">
              <div className="text-center mb-2">
                <h2 className="heading4">Related Products</h2>
                <p className="caption1 text-secondary mt-2">
                  You may also like these items
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mt-8">
                {relatedProducts.map((related) => {
                  const image =
                    related.ThumbnailImagePath &&
                    !related.ThumbnailImagePath.includes("noImage")
                      ? related.ThumbnailImagePath
                      : "/images/product/1000x1000.png";

                  return (
                    <div
                      key={related.ProductId}
                      className="related-card group border border-line rounded-2xl overflow-hidden hover:border-black hover:shadow-lg transition-all duration-300"
                    >
                      <button
                        type="button"
                        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                        onClick={() => handleRelatedProductClick(related)}
                      >
                        <div className="aspect-[4/5] relative bg-surface overflow-hidden">
                          <Image
                            src={image}
                            fill
                            sizes="(max-width: 640px) 100vw, 25vw"
                            alt={related.ProductName}
                            className="object-cover duration-500 group-hover:scale-105"
                          />
                          {related.IsNewProduct && (
                            <span className="absolute top-3 left-3 caption2 bg-green text-white px-2.5 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="p-4">
                        <div className="caption2 text-secondary uppercase tracking-wide">
                          {related.Category?.CategoryName}
                        </div>
                        <h3 className="text-button font-semibold mt-1 line-clamp-2">
                          {related.ProductName}
                        </h3>
                        {related.Category?.CategoryDescription && (
                          <p className="caption1 text-secondary mt-2 line-clamp-2">
                            {related.Category.CategoryDescription}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            type="button"
                            className="caption2 px-4 py-1.5 rounded-full border border-line hover:bg-black hover:text-white transition-colors"
                            onClick={() => handleRelatedProductClick(related)}
                          >
                            View Product
                          </button>
                          <Link
                            href={getProductDetailUrl(related.ProductId)}
                            className="caption2 px-4 py-1.5 rounded-full border border-line hover:bg-black hover:text-white transition-colors inline-block"
                          >
                            Shop Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailApi;
