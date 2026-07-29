"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalCartContext } from "@/context/ModalCartContext";
import { useCart } from "@/context/CartContext";
import { countdownTime } from "@/store/countdownTime";
import CountdownTimeType from "@/type/CountdownType";
import api from "@/lib/api";
import toaster from "react-hot-toast";
import {
  formatRsPrice,
  getCartShippingPref,
  resolveCartDisplayTotals,
  saveCartShippingPref,
} from "@/lib/cart";
import { getPendingPromoCode, savePendingPromoCode } from "@/lib/promo";
import { fetchProductDetails, RelatedProduct } from "@/lib/product-details";
import {
  getProductDetailUrl,
  mapProductDetailToProductType,
} from "@/lib/featured-products";
import ProductSkeleton from "@/components/Other/ProductSkeleton";

type SelectOption = { Value: string; Text: string };

const ModalCart = ({
  serverTimeLeft,
}: {
  serverTimeLeft: CountdownTimeType;
}) => {
  const [timeLeft, setTimeLeft] = useState(serverTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(countdownTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<string | undefined>("");
  const [countries, setCountries] = useState<SelectOption[]>([]);
  const [states, setStates] = useState<SelectOption[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [savedPromoCode, setSavedPromoCode] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [addingRelatedId, setAddingRelatedId] = useState<number | null>(null);

  const { isModalOpen, closeModalCart } = useModalCartContext();
  const {
    cartState,
    cartLoading,
    updatingCartId,
    addToCart,
    removeFromCart,
    updateCart,
    fetchCart,
  } = useCart();

  useEffect(() => {
    if (isModalOpen) {
      void fetchCart();
      const pending = getPendingPromoCode();
      setSavedPromoCode(pending);
      if (pending) setPromoCode(pending);
    }
  }, [isModalOpen, fetchCart]);

  const handleApplyPromoCode = () => {
    const code = promoCode.trim();
    if (!code) {
      toaster.error("Please enter a coupon code!");
      return;
    }

    // Promo API needs OrderId — save now, apply after order is created.
    savePendingPromoCode(code);
    setSavedPromoCode(code);
    toaster.success(
      `Promo code "${code}" saved. Discount will apply on your order payment summary.`,
    );
    setActiveTab("");
  };

  const handleAddRelatedToCart = async (related: RelatedProduct) => {
    setAddingRelatedId(related.ProductId);
    try {
      const detail = await fetchProductDetails(related.ProductId);
      const cartProduct = mapProductDetailToProductType(detail);
      cartProduct.quantityPurchase = 1;
      await addToCart(cartProduct);
    } catch {
      // toast handled in context
    } finally {
      setAddingRelatedId(null);
    }
  };

  const getCountries = async () => {
    try {
      const res = await api.get<{ Data: SelectOption[] }>(
        "/api/v1/Common/countries",
      );
      setCountries(res.data?.Data ?? []);
    } catch (error) {
      console.error("Failed to fetch countries:", error);
    }
  };

  const getStates = async (countryId: string) => {
    try {
      const res = await api.get<{ Data: SelectOption[] }>(
        "/api/v1/Common/states",
        { params: { CountryId: countryId } },
      );
      setStates(res.data?.Data ?? []);
    } catch (error) {
      console.error("Failed to fetch states:", error);
    }
  };

  useEffect(() => {
    void getCountries();

    const pref = getCartShippingPref();
    if (!pref?.countryId) return;

    setSelectedCountry(pref.countryId);
    setSelectedState(pref.stateId || "");
    void getStates(pref.countryId);
  }, []);

  const handleSaveShipping = () => {
    if (!selectedCountry) {
      toaster.error("Please select a country.");
      return;
    }

    if (!selectedState) {
      toaster.error("Please select a state.");
      return;
    }

    saveCartShippingPref({
      countryId: selectedCountry,
      stateId: selectedState,
    });

    toaster.success("Shipping preference saved for checkout.");
    setActiveTab("");
  };
  const moneyForFreeship = 150;
  const linesNet = cartState.cartArray.reduce(
    (sum, item) => sum + (item.lineTotal || 0),
    0,
  );
  const linesGross = cartState.cartArray.reduce((sum, item) => {
    const originUnit = item.originPrice || item.price || 0;
    return sum + originUnit * (item.quantity || 1);
  }, 0);
  const displayTotals = resolveCartDisplayTotals({
    linesNet,
    linesGross,
    subTotal: cartState.subTotal,
    totalDiscount: cartState.totalDiscount,
    netTotal: cartState.netTotal,
  });
  const displayTotal = displayTotals.netTotal;
  const relatedProducts = cartState.relatedProducts ?? [];
  const hasItems = cartState.cartArray.length > 0;
  const shippingProgress = Math.min(
    (displayTotal / moneyForFreeship) * 100,
    100,
  );
  const amountToFreeShipping = Math.max(moneyForFreeship - displayTotal, 0);

  return (
    <div className="modal-cart-block" onClick={closeModalCart}>
      <div
        className={`modal-cart-main flex flex-col lg:flex-row h-full min-h-0 ${isModalOpen ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="left w-full lg:w-[42%] xl:w-1/2 border-r border-line py-6 max-lg:hidden flex flex-col min-h-0">
          <div className="modal-cart-related-head">
            <Icon.Sparkle size={18} weight="duotone" />
            <div className="heading6">You May Also Like</div>
          </div>

          <div className="list modal-cart-related-list flex-1 overflow-y-auto min-h-0">
            {relatedProducts.length > 0 ? (
              relatedProducts.map((related) => {
                const image =
                  related.ThumbnailImagePath &&
                  !related.ThumbnailImagePath.includes("noImage")
                    ? related.ThumbnailImagePath
                    : "/images/product/1000x1000.png";

                return (
                  <div
                    key={related.ProductId}
                    className="modal-cart-related-card"
                  >
                    <Link
                      href={getProductDetailUrl(related.ProductId)}
                      className="modal-cart-related-image"
                      onClick={closeModalCart}
                    >
                      <Image
                        src={image}
                        fill
                        sizes="72px"
                        alt={related.ProductName}
                        className="object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      {related.Category?.CategoryName && (
                        <div className="caption2 text-secondary uppercase">
                          {related.Category.CategoryName}
                        </div>
                      )}
                      <Link
                        href={getProductDetailUrl(related.ProductId)}
                        className="name text-button mt-1 line-clamp-2 hover:underline block"
                        onClick={closeModalCart}
                      >
                        {related.ProductName}
                      </Link>
                    </div>

                    <button
                      type="button"
                      aria-label={`Add ${related.ProductName} to cart`}
                      disabled={addingRelatedId === related.ProductId}
                      className="modal-cart-related-add"
                      onClick={() => void handleAddRelatedToCart(related)}
                    >
                      <Icon.Plus size={16} weight="bold" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="modal-cart-related-empty">
                <div className="modal-cart-empty-icon">
                  <Icon.Heart size={24} weight="duotone" />
                </div>
                <p className="caption1 text-secondary">
                  Add items to your cart to see related products here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="right cart-block w-full lg:w-[58%] xl:w-1/2 flex flex-col h-full min-h-0">
          <div className="modal-cart-header">
            <div className="modal-cart-header-title">
              <span className="modal-cart-header-icon">
                <Icon.ShoppingBag size={20} weight="duotone" />
              </span>
              <div>
                <div className="heading5">Shopping Cart</div>
                {cartState.cartArray.length > 0 && (
                  <p className="caption2 text-secondary mt-0.5">
                    {cartState.cartArray.length}{" "}
                    {cartState.cartArray.length === 1 ? "item" : "items"}
                  </p>
                )}
              </div>
              {cartState.cartArray.length > 0 && (
                <span className="modal-cart-count-badge">
                  {cartState.cartArray.length}
                </span>
              )}
            </div>

            <button
              type="button"
              aria-label="Close cart"
              className="modal-cart-close-btn"
              onClick={closeModalCart}
            >
              <Icon.X size={16} />
            </button>
          </div>

          <div className="modal-cart-body">
            {hasItems && (
              <div className="modal-cart-top-banners">
                <div className="modal-cart-shipping modal-cart-shipping-compact">
                  <p className="modal-cart-shipping-text">
                    {amountToFreeShipping > 0 ? (
                      <>
                        <span className="text-black font-semibold">
                          {formatRsPrice(amountToFreeShipping)}
                        </span>{" "}
                        away from free shipping
                      </>
                    ) : (
                      <span className="text-black font-semibold">
                        Free shipping unlocked
                      </span>
                    )}
                  </p>
                  <div className="modal-cart-shipping-bar">
                    <div
                      className="modal-cart-shipping-progress"
                      style={{ width: `${shippingProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="list-product">
              {cartLoading ? (
                <ProductSkeleton variant="cart-list" count={2} />
              ) : hasItems ? (
                cartState.cartArray.map((product, index) => {
                  const image =
                    product.thumbImage?.[0] ||
                    product.images?.[0] ||
                    "/images/product/1000x1000.png";
                  const variantsLabel = product.apiItem
                    ? product.apiItem.ProductVariants?.replace(/,/g, ", ") ||
                      product.apiItem.cartItemVariantList
                        ?.map((v) => `${v.VariantGroup}: ${v.VariantName}`)
                        .join(" · ")
                    : "";

                  return (
                    <div
                      key={product.cartId || `${product.id}-${index}`}
                      className="modal-cart-item"
                    >
                      <Link
                        href={getProductDetailUrl(
                          product.id,
                          product.productDetailId,
                        )}
                        className="modal-cart-item-image"
                        onClick={closeModalCart}
                      >
                        <Image
                          src={image}
                          fill
                          sizes="88px"
                          alt={product.name}
                          className="object-cover"
                        />
                      </Link>

                      <div className="modal-cart-item-content w-full min-w-0">
                        <div className="modal-cart-item-head">
                          <div className="min-w-0 flex-1">
                            {product.category && (
                              <div className="caption2 text-secondary uppercase">
                                {product.category}
                              </div>
                            )}
                            <Link
                              href={getProductDetailUrl(
                                product.id,
                                product.productDetailId,
                              )}
                              className="name text-button line-clamp-2 hover:underline block mt-0.5"
                              onClick={closeModalCart}
                            >
                              {product.name}
                            </Link>
                          </div>
                          <button
                            type="button"
                            className="modal-cart-item-remove"
                            onClick={() => removeFromCart(product.cartId)}
                            aria-label="Remove item"
                          >
                            <Icon.Trash size={16} />
                          </button>
                        </div>

                        {variantsLabel && (
                          <div className="modal-cart-variant">
                            {variantsLabel}
                          </div>
                        )}

                        <div className="modal-cart-item-foot">
                          <div className="modal-cart-qty">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              className="modal-cart-qty-btn"
                              disabled={
                                product.quantity <= 1 ||
                                updatingCartId === product.cartId
                              }
                              onClick={() =>
                                void updateCart(
                                  product.cartId,
                                  product.quantity - 1,
                                  product.selectedSize,
                                  product.selectedColor,
                                )
                              }
                            >
                              <Icon.Minus size={14} weight="bold" />
                            </button>
                            <span className="modal-cart-qty-value">
                              {product.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              className="modal-cart-qty-btn"
                              disabled={updatingCartId === product.cartId}
                              onClick={() =>
                                void updateCart(
                                  product.cartId,
                                  product.quantity + 1,
                                  product.selectedSize,
                                  product.selectedColor,
                                )
                              }
                            >
                              <Icon.Plus size={14} weight="bold" />
                            </button>
                          </div>

                          <div className="modal-cart-item-price">
                            <div className="product-price text-title font-semibold">
                              {formatRsPrice(product.lineTotal)}
                            </div>
                            {product.originPrice > product.price && (
                              <div className="caption2 text-secondary line-through">
                                {formatRsPrice(
                                  product.originPrice * product.quantity,
                                )}
                              </div>
                            )}
                            {product.quantity > 1 && (
                              <div className="caption2 text-secondary">
                                {formatRsPrice(product.price)} each
                              </div>
                            )}
                          </div>
                        </div>

                        {product.apiItem?.IsProductAvailableInStock ===
                          false && (
                          <div className="caption2 text-red mt-2 flex items-center gap-1">
                            <Icon.WarningCircle size={14} />
                            Limited stock
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="modal-cart-empty">
                  <div className="modal-cart-empty-icon">
                    <Icon.ShoppingBagOpen size={26} weight="duotone" />
                  </div>
                  <p className="heading6">Your cart is empty</p>
                  <p className="caption1 text-secondary mt-2">
                    Browse products and add your favorites here.
                  </p>
                  <button
                    type="button"
                    className="button-main bg-black text-white mt-5 px-6 py-2.5 rounded-full"
                    onClick={closeModalCart}
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </div>
          </div>

          {hasItems && (
            <div className="footer-modal bg-white">
              <div className="modal-cart-tools">
                <button
                  type="button"
                  className="modal-cart-tool-btn"
                  onClick={() => setActiveTab("shipping")}
                >
                  <Icon.Truck size={18} />
                  Shipping
                </button>
                <button
                  type="button"
                  className="modal-cart-tool-btn"
                  onClick={() => setActiveTab("coupon")}
                >
                  <Icon.Tag size={18} />
                  Coupon
                </button>
              </div>

              <div className="modal-cart-summary">
                <div className="modal-cart-summary-row">
                  <span className="text-secondary">Subtotal</span>
                  <span>{formatRsPrice(displayTotals.subTotal)}</span>
                </div>
                {(displayTotals.discount > 0 || savedPromoCode) && (
                  <div className="modal-cart-summary-row">
                    <span className="text-secondary">
                      Discount
                      {savedPromoCode ? ` (${savedPromoCode})` : ""}
                    </span>
                    <span
                      style={{
                        color:
                          displayTotals.discount > 0 ? "#16a34a" : undefined,
                      }}
                      className="font-semibold"
                    >
                      {displayTotals.discount > 0
                        ? `-${formatRsPrice(displayTotals.discount)}`
                        : "At checkout"}
                    </span>
                  </div>
                )}
                <div className="modal-cart-summary-row is-total">
                  <span>Total</span>
                  <span>{formatRsPrice(displayTotal)}</span>
                </div>
              </div>

              <div className="modal-cart-footer-cta">
                <div className="modal-cart-actions">
                  <Link
                    href="/cart"
                    className="button-main modal-cart-action-btn modal-cart-action-btn-outline"
                    onClick={closeModalCart}
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/checkout"
                    className="button-main modal-cart-action-btn"
                    onClick={closeModalCart}
                  >
                    Checkout
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={closeModalCart}
                  className="modal-cart-continue"
                >
                  Or continue shopping
                </button>
              </div>

              <div
                className={`tab-item note-block ${activeTab === "shipping" ? "active" : ""}`}
              >
                <div className="px-6 py-4 border-b border-line">
                  <div className="item flex items-center gap-3">
                    <Icon.Truck className="text-xl" />
                    <div className="caption1">Estimate shipping rates</div>
                  </div>
                </div>
                <div className="form pt-4 px-6">
                  <div>
                    <label
                      htmlFor="select-country"
                      className="caption1 text-secondary"
                    >
                      Country/Region
                    </label>
                    <div className="select-block relative mt-2">
                      <select
                        id="select-country"
                        className="w-full py-3 pl-5 rounded-xl bg-white border border-line"
                        value={selectedCountry}
                        onChange={(e) => {
                          const countryId = e.target.value;
                          setSelectedCountry(countryId);
                          setSelectedState("");
                          setStates([]);
                          if (countryId) {
                            void getStates(countryId);
                          }
                        }}
                      >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                          <option key={country.Value} value={country.Value}>
                            {country.Text}
                          </option>
                        ))}
                      </select>
                      <Icon.CaretDown
                        size={12}
                        className="absolute top-1/2 -translate-y-1/2 md:right-5 right-2 pointer-events-none"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label
                      htmlFor="select-state"
                      className="caption1 text-secondary"
                    >
                      State
                    </label>
                    <div className="select-block relative mt-2">
                      <select
                        id="select-state"
                        className="w-full py-3 pl-5 rounded-xl bg-white border border-line"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                      >
                        <option value="">Select State</option>
                        {states.map((state) => (
                          <option key={state.Value} value={state.Value}>
                            {state.Text}
                          </option>
                        ))}
                      </select>
                      <Icon.CaretDown
                        size={12}
                        className="absolute top-1/2 -translate-y-1/2 md:right-5 right-2 pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="block-button text-center pt-4 px-6 pb-6">
                  <button
                    type="button"
                    className="button-main bg-black w-full text-center rounded-xl"
                    onClick={handleSaveShipping}
                  >
                    Done
                  </button>
                </div>
              </div>

              <div
                className={`tab-item note-block ${activeTab === "coupon" ? "active" : ""}`}
              >
                <div className="px-6 py-4 border-b border-line">
                  <div className="item flex items-center gap-3">
                    <Icon.Tag className="text-xl" />
                    <div className="caption1">Add A Coupon Code</div>
                  </div>
                </div>
                <div className="form pt-4 px-6">
                  <label
                    htmlFor="select-discount"
                    className="caption1 text-secondary"
                  >
                    Enter Code
                  </label>
                  <input
                    className="border-line px-5 py-3 w-full rounded-xl mt-3 border"
                    id="select-discount"
                    type="text"
                    placeholder="Discount code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  {savedPromoCode && (
                    <p className="caption1 text-secondary mt-3">
                      Saved for checkout:{" "}
                      <span className="text-black font-semibold">
                        {savedPromoCode}
                      </span>
                    </p>
                  )}
                  <p className="caption2 text-secondary mt-2">
                    Promo discount is applied after your order is created, on
                    the payment summary.
                  </p>
                </div>
                <div className="block-button text-center pt-4 px-6 pb-6">
                  <button
                    type="button"
                    className="button-main bg-black w-full text-center rounded-xl"
                    onClick={handleApplyPromoCode}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      savePendingPromoCode("");
                      setPromoCode("");
                      setSavedPromoCode(null);
                      setActiveTab("");
                      toaster.success("Promo code cleared.");
                    }}
                    className="modal-cart-continue"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCart;
