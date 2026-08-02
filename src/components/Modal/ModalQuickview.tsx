"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalQuickviewContext } from "@/context/ModalQuickviewContext";
import { useCart } from "@/context/CartContext";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useModalWishlistContext } from "@/context/ModalWishlistContext";
import { useCompare } from "@/context/CompareContext";
import { useModalCompareContext } from "@/context/ModalCompareContext";
import Rate from "../Other/Rate";
import ProductSkeleton from "@/components/Other/ProductSkeleton";
import ModalSizeguide from "./ModalSizeguide";
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
  ProductDetailData,
  ProductVariantCombination,
  RelatedProduct,
} from "@/lib/product-details";
import {
  getProductDetailUrl,
  mapProductDetailToProductType,
  mapRelatedProductToProductType,
} from "@/lib/featured-products";
import { applyDiscount } from "@/lib/discount";
import { getApiErrorMessage } from "@/lib/api";
import { ProductType } from "@/type/ProductType";
import ProductBadges, {
  buildProductBadges,
} from "@/components/Product/ProductBadges";
import toast from "react-hot-toast";

const ModalQuickview = () => {
  const [productQty, setProductQty] = useState(1);
  const [openSizeGuide, setOpenSizeGuide] = useState(false);
  const [productDetail, setProductDetail] = useState<ProductDetailData | null>(
    null,
  );
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariantCombination | null>(null);
  const [groupSelections, setGroupSelections] = useState<
    Record<string, string>
  >({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { selectedProduct, openQuickview, closeQuickview } =
    useModalQuickviewContext();
  const { addToCart } = useCart();
  const { openModalCart } = useModalCartContext();
  const { addToWishlist, removeFromWishlist, wishlistState } = useWishlist();
  const { openModalWishlist } = useModalWishlistContext();
  const { addToCompare, removeFromCompare, compareState } = useCompare();
  const { openModalCompare } = useModalCompareContext();

  const variants =
    productDetail?.ProductVariantDetail?.productVariantCombinationList ?? [];
  const variantGroups = productDetail
    ? parseVariantGroupOptions(productDetail)
    : [];
  const images = productDetail
    ? getDisplayImages(productDetail, selectedVariant)
    : [];
  const activePrice =
    selectedVariant != null
      ? getVariantPrice(selectedVariant)
      : productDetail
        ? getDetailSalePrice(productDetail)
        : 0;
  const comparePrice = productDetail
    ? getComparePrice(productDetail, selectedVariant)
    : 0;
  const percentSale =
    comparePrice > activePrice
      ? Math.floor(100 - (activePrice / comparePrice) * 100)
      : 0;
  const productId = selectedProduct?.id ?? productDetail?.ProductId?.toString();
  const relatedProducts = productDetail?.relatedProductList ?? [];
  const showPriceRange =
    !selectedVariant &&
    productDetail &&
    productDetail.MinPrice !== productDetail.MaxPrice;
  const inStock = selectedVariant?.InStock ?? productDetail?.InStock ?? false;
  const totalPrice = activePrice * productQty;
  const activeImage = images[activeImageIndex] ?? images[0];
  const activeDiscount = productDetail
    ? getActiveDiscount(productDetail, selectedVariant)
    : { discount: 0, discountType: 0, campaignType: 0 };
  const discountLabel = formatDiscountBadge(
    activeDiscount.discount,
    activeDiscount.discountType,
    activeDiscount.campaignType,
    activeDiscount.campaignTypeDisplayName,
  );
  const rangeMinPrice = productDetail ? getDetailSalePrice(productDetail) : 0;
  const rangeMaxPrice = productDetail
    ? applyDiscount(
        productDetail.MaxPrice,
        activeDiscount.discount,
        activeDiscount.discountType,
      )
    : 0;
  const hasRangeDiscount = Boolean(
    showPriceRange && productDetail && rangeMinPrice < productDetail.MinPrice,
  );
  const savedAmount = showPriceRange
    ? hasRangeDiscount && productDetail
      ? Math.max(0, productDetail.MinPrice - rangeMinPrice)
      : 0
    : Math.max(0, comparePrice - activePrice);
  const availableStock = productDetail
    ? getAvailableStockCount(productDetail, selectedVariant)
    : null;
  const cartGate = productDetail
    ? canAddProductToCart(productDetail, { selectedVariant, inStock })
    : { allowed: false, reason: "Product details unavailable." };
  const maxQuantity =
    availableStock !== null ? Math.max(1, availableStock) : 999;
  const quickviewBadges = productDetail
    ? buildProductBadges({
        isPromotional:
          productDetail.IsPromotional ||
          Boolean(selectedVariant?.IsPromotional),
        discountLabel,
        inventoryManagement:
          selectedVariant?.InventoryManagement ??
          productDetail.InventoryManagement,
        availableStock,
        comingSoon: productDetail.ComingSoon,
        status: productDetail.Status,
        inStock,
      })
    : [];

  const syncGroupSelections = (
    detail: ProductDetailData,
    variant: ProductVariantCombination | null,
  ) => {
    if (!variant || !detail.ProductVariantGroups?.length) {
      setGroupSelections({});
      return;
    }
    const parts = (variant.VariantName || "")
      .split(",")
      .map((part) => part.trim());
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
    setActiveImageIndex(0);
  }, [selectedVariant, productDetail?.ProductId]);

  useEffect(() => {
    if (!selectedProduct) {
      setProductDetail(null);
      setSelectedVariant(null);
      setGroupSelections({});
      setError("");
      return;
    }

    const loadProductDetails = async () => {
      setLoading(true);
      setError("");
      setProductQty(1);
      setActiveImageIndex(0);

      try {
        const detail = await fetchProductDetails(
          Number(selectedProduct.id),
          selectedProduct.productDetailId
            ? Number(selectedProduct.productDetailId)
            : undefined,
        );

        setProductDetail(detail);
        // Do not auto-select size/color/variant — user must choose
        setSelectedVariant(null);
        setGroupSelections({});
      } catch (err) {
        setProductDetail(null);
        setSelectedVariant(null);
        setGroupSelections({});
        setError(getApiErrorMessage(err, "Failed to load product details."));
      } finally {
        setLoading(false);
      }
    };

    void loadProductDetails();
  }, [selectedProduct]);

  const handleGroupSelection = (groupName: string, option: string) => {
    if (!productDetail) return;

    const nextSelections = { ...groupSelections, [groupName]: option };

    // Falling back to the new choice alone stops a stale group (e.g. colour)
    // from blocking the match; the matched variant then refills every group.
    const matchedVariant =
      findVariantByGroupSelection(productDetail, nextSelections) ??
      findVariantByGroupSelection(productDetail, { [groupName]: option });

    if (!matchedVariant) {
      setGroupSelections(nextSelections);
      setSelectedVariant(null);
      return;
    }

    setSelectedVariant(matchedVariant);
    syncGroupSelections(productDetail, matchedVariant);
    setActiveImageIndex(0);
  };

  const handleVariantSelect = (variant: ProductVariantCombination) => {
    if (!productDetail) return;
    setSelectedVariant(variant);
    syncGroupSelections(productDetail, variant);
    setActiveImageIndex(0);
  };

  const handleAddToCart = async () => {
    if (!selectedProduct || !productDetail) return;

    if (!cartGate.allowed) {
      toast.error(cartGate.reason || "Unable to add this product to cart.");
      return;
    }

    if (variants.length > 0 && !selectedVariant) {
      toast.error("Please select size, color and variant first.");
      return;
    }

    const cartProduct = mapProductDetailToProductType(
      productDetail,
      selectedVariant ?? undefined,
    );
    cartProduct.quantityPurchase = Math.min(productQty, maxQuantity);

    try {
      await addToCart(cartProduct);
      openModalCart();
      closeQuickview();
    } catch {
      // handled in CartContext
    }
  };

  const handleAddToWishlist = () => {
    if (!selectedProduct || !productDetail) return;

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

  const handleAddToCompare = () => {
    if (!selectedProduct || !productDetail) return;

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
    openQuickview(mapRelatedProductToProductType(related));
  };

  return (
    <>
      <div className="modal-quickview-block" onClick={closeQuickview}>
        <div
          className={`modal-quickview-main ${selectedProduct !== null ? "open" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="modal-quickview-scroll">
              <div className="px-6 pb-4 flex items-center justify-between border-b border-line sticky top-0 bg-white z-10">
                <div className="heading5">Quick View</div>
                <button
                  type="button"
                  className="close-btn w-8 h-8 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                  onClick={closeQuickview}
                  aria-label="Close"
                >
                  <Icon.X size={16} />
                </button>
              </div>
              <ProductSkeleton variant="quickview" />
            </div>
          ) : error ? (
            <div className="modal-quickview-scroll flex flex-col items-center justify-center min-h-[420px] px-6 py-10 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                type="button"
                className="button-main"
                onClick={closeQuickview}
              >
                Close
              </button>
            </div>
          ) : productDetail ? (
            <div className="modal-quickview-scroll py-6">
              {/* Header */}
              <div className="px-6 pb-4 flex items-center justify-between border-b border-line sticky top-0 bg-white z-10">
                <div className="heading5">Quick View</div>
                <button
                  type="button"
                  className="close-btn w-8 h-8 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                  onClick={closeQuickview}
                  aria-label="Close"
                >
                  <Icon.X size={16} />
                </button>
              </div>

              {/* Main content */}
              <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6 pt-6">
                {/* Images */}
                <div className="w-full lg:w-[42%] flex-shrink-0">
                  <div className="main-img bg-img w-full aspect-[3/4] rounded-2xl overflow-hidden bg-surface relative">
                    <ProductBadges badges={quickviewBadges} />
                    {activeImage && (
                      <Image
                        src={activeImage}
                        width={800}
                        height={1066}
                        alt={productDetail.Name}
                        priority
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="flex gap-2 sm:gap-3 mt-3 overflow-x-auto pb-1">
                      {images.map((item, index) => (
                        <button
                          type="button"
                          key={`${item}-${index}`}
                          className={`flex-shrink-0 w-16 h-20 sm:w-[72px] sm:h-[96px] rounded-xl overflow-hidden border-2 transition-colors ${activeImageIndex === index ? "border-black" : "border-line"}`}
                          onClick={() => setActiveImageIndex(index)}
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

                <div className="w-full lg:w-[58%] min-w-0">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="caption2 text-secondary font-semibold uppercase">
                        {productDetail.Category}
                      </div>
                      <h2 className="heading4 mt-1 break-words">
                        {productDetail.Name}
                      </h2>
                    </div>
                    <span
                      className={`quickview-status-tag ${
                        productDetail.Status === 0
                          ? "is-unavailable"
                          : "is-available"
                      }`}
                    >
                      {productDetail.Status === 0 ? (
                        <Icon.XCircle size={14} weight="fill" />
                      ) : (
                        <Icon.CheckCircle size={14} weight="fill" />
                      )}
                      {productDetail.Status === 0 ? "Unavailable" : "Available"}
                    </span>
                  </div>

                  {productDetail.AverageRating > 0 && (
                    <div className="flex items-center mt-3">
                      <Rate
                        currentRate={productDetail.AverageRating}
                        size={14}
                      />
                      <span className="caption1 text-secondary ml-2">
                        ({productDetail.AverageRating} rating)
                      </span>
                    </div>
                  )}

                  <div className="quickview-price-block mt-4 pb-5 border-b border-line">
                    <div className="flex items-center gap-3 flex-wrap">
                      {showPriceRange ? (
                        <div className="product-price heading5">
                          {formatRsPrice(rangeMinPrice)} –{" "}
                          {formatRsPrice(rangeMaxPrice)}
                        </div>
                      ) : (
                        <div className="product-price heading5">
                          {formatRsPrice(activePrice)}
                        </div>
                      )}

                      {showPriceRange
                        ? hasRangeDiscount && (
                            <div className="product-origin-price text-secondary2">
                              <del>
                                {formatRsPrice(productDetail.MinPrice)} –{" "}
                                {formatRsPrice(productDetail.MaxPrice)}
                              </del>
                            </div>
                          )
                        : comparePrice > activePrice && (
                            <div className="product-origin-price text-secondary2">
                              <del>{formatRsPrice(comparePrice)}</del>
                            </div>
                          )}

                     
                    </div>

                    {savedAmount > 0 && (
                      <div className="quickview-savings mt-2">
                        You save {formatRsPrice(savedAmount)}
                      </div>
                    )}

                    {!showPriceRange && productQty > 1 && (
                      <div className="caption1 text-secondary mt-1">
                        Total ({productQty} items): {formatRsPrice(totalPrice)}
                      </div>
                    )}
                  </div>

                  {productDetail.Description && (
                    <p className="desc text-secondary mt-4">
                      {productDetail.Description}
                    </p>
                  )}

                  {productDetail.LongDescription && (
                    <p className="desc text-secondary mt-3 whitespace-pre-line line-clamp-4 sm:line-clamp-none">
                      {productDetail.LongDescription}
                    </p>
                  )}

                  {/* Size & Color groups */}
                  {variantGroups.length > 0 &&
                    variantGroups.map((group) => (
                      <div className="mt-5" key={group.groupName}>
                        <div className="text-title mb-3">{group.groupName}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((option) => (
                            <button
                              type="button"
                              key={`${group.groupName}-${option}`}
                              className={`px-4 py-2 text-button rounded-full border transition-colors ${groupSelections[group.groupName] === option ? "bg-black text-white border-black" : "bg-white border-line hover:border-black"}`}
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
                    <div className="mt-6">
                      <div className="text-title mb-3">Variants</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {variants.map((variant) => {
                          // Use exact ImageName from API response
                          const variantImage =
                            variant.ImageName?.trim() ||
                            (productDetail
                              ? getVariantDisplayImage(variant, productDetail)
                              : "/images/product/1000x1000.png");
                          const isSelected =
                            selectedVariant?.ProductDetailId ===
                            variant.ProductDetailId;

                          return (
                            <button
                              type="button"
                              key={variant.ProductDetailId}
                              disabled={!variant.InStock}
                              className={`text-left rounded-xl border overflow-hidden transition-all ${isSelected ? "border-black ring-1 ring-black" : "border-line hover:border-black"} ${!variant.InStock ? "opacity-50 cursor-not-allowed" : ""}`}
                              onClick={() => handleVariantSelect(variant)}
                            >
                              <div className="aspect-square relative bg-surface">
                                <Image
                                  src={variantImage}
                                  fill
                                  sizes="(max-width: 640px) 50vw, 120px"
                                  alt={variant.VariantName}
                                  className="object-cover"
                                />
                              </div>
                              <div className="p-2 sm:p-3">
                                <div className="text-button line-clamp-2 leading-tight">
                                  {variant.VariantName}
                                </div>
                                <div className="caption1 font-semibold mt-1.5">
                                  {formatRsPrice(getVariantPrice(variant))}
                                </div>
                                <div className="caption2 text-secondary mt-0.5">
                                  {variant.InStock
                                    ? "In Stock"
                                    : "Out of Stock"}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity & Add to cart */}
                  <div className="mt-6 mb-3 flex items-center justify-between gap-3">
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
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="quantity-block p-3 flex items-center justify-between rounded-lg border border-line w-full sm:w-[140px] flex-shrink-0">
                      <Icon.Minus
                        size={18}
                        onClick={() => setProductQty((q) => Math.max(1, q - 1))}
                        className={`${productQty === 1 ? "opacity-30" : ""} cursor-pointer`}
                      />
                      <span className="body1 font-semibold">{productQty}</span>
                      <Icon.Plus
                        size={18}
                        onClick={() =>
                          setProductQty((q) => Math.min(maxQuantity, q + 1))
                        }
                        className={`${productQty >= maxQuantity ? "opacity-30" : ""} cursor-pointer`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddToCart()}
                      disabled={!cartGate.allowed}
                      className={`button-main flex-1 text-center bg-white text-black border border-black ${cartGate.allowed ? "cursor-pointer hover:bg-black hover:text-white" : "opacity-50 cursor-not-allowed"}`}
                    >
                      {productDetail.ComingSoon
                        ? "Coming Soon"
                        : productDetail.Status === 0
                          ? "Unavailable"
                          : cartGate.allowed
                            ? "Add To Cart"
                            : "Out of Stock"}
                    </button>
                  </div>

                  <Link
                    href={getProductDetailUrl(
                      productDetail.ProductId,
                      selectedVariant?.ProductDetailId ??
                        productDetail.ProductDetailId,
                    )}
                    className="button-main w-full text-center inline-block mt-3"
                    onClick={closeQuickview}
                  >
                    View Full Details
                  </Link>

                  {/* <button
                    type="button"
                    className="compare flex items-center gap-3 mt-4 bg-transparent border-0 cursor-pointer"
                    onClick={handleAddToCompare}
                  >
                    <div className="w-10 h-10 flex items-center justify-center border border-line rounded-xl hover:bg-black hover:text-white duration-300">
                      <Icon.ArrowsCounterClockwise size={20} />
                    </div>
                    <span>Compare</span>
                  </button> */}

                  {/* Meta info */}
                  <div className="more-infor mt-6 pt-5 border-t border-line space-y-2">
                    <div className="flex flex-wrap gap-x-2">
                      <span className="text-title">SKU:</span>
                      <span className="text-secondary">
                        {selectedVariant?.SKU || productDetail.DefaultSKU}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <span className="text-title">Category:</span>
                      <span className="text-secondary">
                        {productDetail.Category}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <span className="text-title">Brand:</span>
                      <span className="text-secondary">
                        {productDetail.BrandName || "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <span className="text-title">Stock:</span>
                      <span className="text-secondary">
                        {inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                    {productDetail.Tags && (
                      <div className="flex flex-wrap gap-x-2">
                        <span className="text-title">Tags:</span>
                        <span className="text-secondary">
                          {productDetail.Tags}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Related Products */}
              {relatedProducts.length > 0 && (
                <div className="px-4 sm:px-6 pt-8 mt-6 border-t border-line">
                  <div className="heading6 mb-1">Related Products</div>
                  <p className="caption1 text-secondary mb-4">
                    You may also like these items
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedProducts.map((related) => {
                      const image =
                        related.ThumbnailImagePath &&
                        !related.ThumbnailImagePath.includes("noImage")
                          ? related.ThumbnailImagePath
                          : "/images/product/1000x1000.png";

                      return (
                        <div
                          key={related.ProductId}
                          className="related-card border border-line rounded-2xl overflow-hidden hover:border-black transition-colors"
                        >
                          <button
                            type="button"
                            className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                            onClick={() => handleRelatedProductClick(related)}
                          >
                            <div className="aspect-[4/5] relative bg-surface">
                              <Image
                                src={image}
                                fill
                                sizes="(max-width: 640px) 100vw, 33vw"
                                alt={related.ProductName}
                                className="object-cover"
                              />
                              {related.IsNewProduct && (
                                <span className="absolute top-2 left-2 caption2 bg-green text-white px-2 py-0.5 rounded-full">
                                  New
                                </span>
                              )}
                            </div>
                          </button>
                          <div className="p-4">
                            <div className="caption2 text-secondary uppercase">
                              {related.Category?.CategoryName}
                            </div>
                            <div className="text-button mt-1 font-semibold line-clamp-2">
                              {related.ProductName}
                            </div>
                            {related.Category?.CategoryDescription && (
                              <p className="caption1 text-secondary mt-2 line-clamp-2">
                                {related.Category.CategoryDescription}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              <button
                                type="button"
                                className="caption2 px-3 py-1 rounded-full border border-line hover:bg-black hover:text-white transition-colors"
                                onClick={() =>
                                  handleRelatedProductClick(related)
                                }
                              >
                                Quick View
                              </button>
                              <Link
                                href={getProductDetailUrl(related.ProductId)}
                                className="caption2 px-3 py-1 rounded-full border border-line hover:bg-black hover:text-white transition-colors inline-block"
                                onClick={closeQuickview}
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <ModalSizeguide
        data={selectedProduct}
        isOpen={openSizeGuide}
        onClose={() => setOpenSizeGuide(false)}
      />
    </>
  );
};

export default ModalQuickview;
