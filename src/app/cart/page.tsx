"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/context/CartContext";
import { formatRsPrice, resolveCartDisplayTotals } from "@/lib/cart";
import ProductSkeleton from "@/components/Other/ProductSkeleton";
import { fetchProductDetails, RelatedProduct } from "@/lib/product-details";
import {
  getProductDetailUrl,
  mapProductDetailToProductType,
} from "@/lib/featured-products";

const Cart = () => {
  const [shipCart, setShipCart] = useState(0);
  const [addingRelatedId, setAddingRelatedId] = useState<number | null>(null);
  const router = useRouter();

  const {
    cartState,
    cartLoading,
    updatingCartId,
    updateCart,
    removeFromCart,
    fetchCart,
    addToCart,
  } = useCart();

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

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
    subTotal: cartState.subTotal || 0,
    totalDiscount: cartState.totalDiscount || 0,
    netTotal: cartState.netTotal || 0,
  });
  const subTotal = displayTotals.subTotal;
  const netTotal = displayTotals.netTotal;
  const totalDiscount = displayTotals.discount;
  const relatedProducts = cartState.relatedProducts ?? [];
  const freeShippingRemaining = Math.max(moneyForFreeship - subTotal, 0);
  const qualifiesForFreeShipping = subTotal >= moneyForFreeship;
  const orderTotal = netTotal + (qualifiesForFreeShipping ? 0 : shipCart);

  useEffect(() => {
    if (qualifiesForFreeShipping) {
      setShipCart(0);
    } else if (cartState.cartArray.length === 0) {
      setShipCart(0);
    } else if (shipCart === 0) {
      setShipCart(30);
    }
  }, [qualifiesForFreeShipping, cartState.cartArray.length, shipCart]);

  const handleQuantityChange = (cartId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = cartState.cartArray.find((i) => i.cartId === cartId);
    if (item) {
      void updateCart(
        cartId,
        newQuantity,
        item.selectedSize,
        item.selectedColor,
      );
    }
  };

  const handleAddRelatedToCart = async (related: RelatedProduct) => {
    setAddingRelatedId(related.ProductId);
    try {
      const detail = await fetchProductDetails(related.ProductId);
      const cartProduct = mapProductDetailToProductType(detail);
      cartProduct.quantityPurchase = 1;
      await addToCart(cartProduct);
    } catch {
      // toast in context
    } finally {
      setAddingRelatedId(null);
    }
  };

  const redirectToCheckout = () => {
    router.push(
      `/checkout?discount=${totalDiscount}&ship=${qualifiesForFreeShipping ? 0 : shipCart}`,
    );
  };

  const getVariantsLabel = (product: (typeof cartState.cartArray)[0]) => {
    if (!product.apiItem) return "";
    return (
      product.apiItem.ProductVariants?.replace(/,/g, ", ") ||
      product.apiItem.cartItemVariantList
        ?.map((v) => `${v.VariantGroup}: ${v.VariantName}`)
        .join(" · ") ||
      ""
    );
  };

  const shippingProgress = Math.min((subTotal / moneyForFreeship) * 100, 100);

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Shopping Cart" subHeading="Shopping Cart" />
      </div>

      <div className="cart-page cart-block md:py-20 py-10">
        <div className="container">
          <div className="cart-page-head">
            <span className="cart-page-badge">Your Cart</span>
            <h1 className="heading3 cart-page-title">Shopping Cart</h1>
            <p className="text-secondary cart-page-subtitle">
              {cartState.totalItems > 0
                ? `${cartState.totalItems} item${cartState.totalItems > 1 ? "s" : ""} ready for checkout.`
                : "Review items before proceeding to checkout."}
            </p>
          </div>

          {cartLoading ? (
            <div className="cart-layout">
              <div className="rounded-2xl border border-line bg-white p-4 sm:p-6">
                <ProductSkeleton variant="cart-list" count={3} />
              </div>
              <aside className="mt-6 space-y-4 lg:mt-0">
                <div className="rounded-2xl border border-line bg-white p-5">
                  <div className="mb-4 h-5 w-32 animate-pulse rounded bg-[#ebebeb]" />
                  <div className="space-y-3">
                    <div className="h-4 w-full animate-pulse rounded bg-[#ebebeb]" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#ebebeb]" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-[#ebebeb]" />
                    <div className="mt-4 h-12 w-full animate-pulse rounded-xl bg-[#ebebeb]" />
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="cart-layout">
              <div>
                {cartState.cartArray.length > 0 && (
                  <div className="cart-banners">
                    <div className="cart-alert">
                      <span className="cart-alert-icon">
                        <Icon.ShieldCheck size={18} weight="bold" />
                      </span>
                      <p>
                        Secure checkout — review your items below and complete your
                        order when you&apos;re ready.
                      </p>
                    </div>

                    <div className="cart-shipping-banner">
                      <p className="cart-shipping-text">
                        {qualifiesForFreeShipping ? (
                          <>
                            You&apos;ve unlocked{" "}
                            <strong className="text-black">free shipping</strong>!
                          </>
                        ) : (
                          <>
                            Add{" "}
                            <strong className="text-black">
                              {formatRsPrice(freeShippingRemaining)}
                            </strong>{" "}
                            more for <strong className="text-black">free shipping</strong>
                          </>
                        )}
                      </p>
                      <div className="cart-shipping-bar">
                        <div
                          className="cart-shipping-progress"
                          style={{ width: `${shippingProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="cart-items-card">
                  {cartState.cartArray.length === 0 ? (
                    <div className="cart-empty">
                      <div className="cart-empty-icon">
                        <Icon.ShoppingBag size={28} weight="duotone" />
                      </div>
                      <p className="text-button font-semibold">Your cart is empty</p>
                      <p className="caption1 text-secondary mt-2">
                        Browse products and add items to your cart.
                      </p>
                      <Link href="/" className="button-main bg-black inline-block mt-6">
                        Continue Shopping
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="cart-items-head">
                        <span>Product</span>
                        <span className="text-center">Price</span>
                        <span className="text-center">Quantity</span>
                        <span className="text-center">Total</span>
                        <span />
                      </div>

                      {cartState.cartArray.map((product, index) => {
                        const image =
                          product.thumbImage?.[0] ||
                          product.images?.[0] ||
                          "/images/product/1000x1000.png";
                        const variantsLabel = getVariantsLabel(product);
                        const productUrl = getProductDetailUrl(
                          product.id,
                          product.productDetailId,
                        );

                        return (
                          <article
                            key={product.cartId || `${product.id}-${index}`}
                            className="cart-item"
                          >
                            <div className="cart-item-product">
                              <Link href={productUrl} className="cart-item-image">
                                <Image
                                  src={image}
                                  fill
                                  sizes="88px"
                                  alt={product.name}
                                  className="object-cover"
                                />
                              </Link>
                              <div className="min-w-0">
                                {product.category && (
                                  <div className="cart-item-category">{product.category}</div>
                                )}
                                <Link href={productUrl} className="cart-item-name">
                                  {product.name}
                                </Link>
                                {variantsLabel && (
                                  <span className="cart-item-variant">{variantsLabel}</span>
                                )}
                              </div>
                            </div>

                            <div className="cart-item-price-col">
                              <div>{formatRsPrice(product.price)}</div>
                              {product.originPrice > product.price && (
                                <div className="caption2 text-secondary line-through">
                                  {formatRsPrice(product.originPrice)}
                                </div>
                              )}
                            </div>

                            <div className="cart-item-qty-col">
                              <div className="cart-qty">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  className="cart-qty-btn"
                                  disabled={
                                    product.quantity <= 1 ||
                                    updatingCartId === product.cartId
                                  }
                                  onClick={() =>
                                    handleQuantityChange(
                                      product.cartId,
                                      product.quantity - 1,
                                    )
                                  }
                                >
                                  <Icon.Minus size={14} weight="bold" />
                                </button>
                                <span className="cart-qty-value">{product.quantity}</span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  className="cart-qty-btn"
                                  disabled={updatingCartId === product.cartId}
                                  onClick={() =>
                                    handleQuantityChange(
                                      product.cartId,
                                      product.quantity + 1,
                                    )
                                  }
                                >
                                  <Icon.Plus size={14} weight="bold" />
                                </button>
                              </div>
                            </div>

                            <div className="cart-item-total-col">
                              <div>{formatRsPrice(product.lineTotal)}</div>
                              {product.originPrice > product.price && (
                                <div className="caption2 text-secondary line-through">
                                  {formatRsPrice(
                                    product.originPrice * product.quantity,
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="hidden md:flex items-center justify-center">
                              <button
                                type="button"
                                aria-label="Remove item"
                                className="cart-item-remove"
                                onClick={() => removeFromCart(product.cartId)}
                              >
                                <Icon.Trash size={16} weight="bold" />
                              </button>
                            </div>

                            <div className="cart-item-actions-row">
                              <div className="cart-qty">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  className="cart-qty-btn"
                                  disabled={
                                    product.quantity <= 1 ||
                                    updatingCartId === product.cartId
                                  }
                                  onClick={() =>
                                    handleQuantityChange(
                                      product.cartId,
                                      product.quantity - 1,
                                    )
                                  }
                                >
                                  <Icon.Minus size={14} weight="bold" />
                                </button>
                                <span className="cart-qty-value">{product.quantity}</span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  className="cart-qty-btn"
                                  disabled={updatingCartId === product.cartId}
                                  onClick={() =>
                                    handleQuantityChange(
                                      product.cartId,
                                      product.quantity + 1,
                                    )
                                  }
                                >
                                  <Icon.Plus size={14} weight="bold" />
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-button font-semibold">
                                  {formatRsPrice(product.lineTotal)}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Remove item"
                                  className="cart-item-remove"
                                  onClick={() => removeFromCart(product.cartId)}
                                >
                                  <Icon.Trash size={16} weight="bold" />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </>
                  )}
                </div>

                {relatedProducts.length > 0 && (
                  <section className="cart-related-card">
                    <div className="cart-related-head">
                      <Icon.Sparkle size={18} weight="duotone" />
                      <h2 className="heading6">You May Also Like</h2>
                    </div>
                    <div className="cart-related-grid">
                      {relatedProducts.map((related) => {
                        const image =
                          related.ThumbnailImagePath &&
                          !related.ThumbnailImagePath.includes("noImage")
                            ? related.ThumbnailImagePath
                            : "/images/product/1000x1000.png";

                        return (
                          <div key={related.ProductId} className="cart-related-item">
                            <Link
                              href={getProductDetailUrl(related.ProductId)}
                              className="cart-related-image"
                            >
                              <Image
                                src={image}
                                fill
                                sizes="72px"
                                alt={related.ProductName}
                                className="object-cover"
                              />
                            </Link>
                            <div className="min-w-0">
                              {related.Category?.CategoryName && (
                                <div className="caption2 text-secondary uppercase">
                                  {related.Category.CategoryName}
                                </div>
                              )}
                              <Link
                                href={getProductDetailUrl(related.ProductId)}
                                className="text-button font-semibold line-clamp-2 hover:underline"
                              >
                                {related.ProductName}
                              </Link>
                            </div>
                            <button
                              type="button"
                              className="cart-related-add"
                              disabled={addingRelatedId === related.ProductId}
                              aria-label={`Add ${related.ProductName} to cart`}
                              onClick={() => void handleAddRelatedToCart(related)}
                            >
                              <Icon.Plus size={16} weight="bold" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              <aside className="cart-summary-card">
                <div className="cart-summary-title">
                  <span className="cart-summary-icon">
                    <Icon.Receipt size={18} weight="bold" />
                  </span>
                  Order Summary
                </div>

                <div className="cart-totals">
                  <div className="cart-total-row">
                    <span className="text-secondary">Subtotal</span>
                    <span>{formatRsPrice(subTotal)}</span>
                  </div>

                  <div className="cart-total-row">
                    <span className="text-secondary">Discount</span>
                    <span className={totalDiscount > 0 ? "text-green" : undefined}>
                      {totalDiscount > 0
                        ? `-${formatRsPrice(totalDiscount)}`
                        : formatRsPrice(0)}
                    </span>
                  </div>

                  <div className="cart-total-row">
                    <span className="text-secondary">Delivery Charges</span>
                    <span>
                      {formatRsPrice(
                        qualifiesForFreeShipping || shipCart === 0 ? 0 : shipCart,
                      )}
                    </span>
                  </div>

                  <div className="cart-total-row is-grand">
                    <span>Total</span>
                    <span>{formatRsPrice(orderTotal)}</span>
                  </div>
                </div>

                {cartState.cartArray.length > 0 && (
                  <div className="cart-shipping-options">
                    <div className="cart-shipping-label">Delivery Method</div>
                    <label className="cart-shipping-option">
                      <input
                        type="radio"
                        name="ship"
                        checked={qualifiesForFreeShipping || shipCart === 0}
                        disabled={!qualifiesForFreeShipping}
                        onChange={() => setShipCart(0)}
                      />
                      <span>
                        Free Shipping{" "}
                        {!qualifiesForFreeShipping && "(spend more to unlock)"}
                      </span>
                    </label>
                    <label className="cart-shipping-option">
                      <input
                        type="radio"
                        name="ship"
                        checked={!qualifiesForFreeShipping && shipCart === 30}
                        onChange={() => setShipCart(30)}
                      />
                      <span>Local — {formatRsPrice(30)}</span>
                    </label>
                    <label className="cart-shipping-option">
                      <input
                        type="radio"
                        name="ship"
                        checked={!qualifiesForFreeShipping && shipCart === 40}
                        onChange={() => setShipCart(40)}
                      />
                      <span>Flat Rate — {formatRsPrice(40)}</span>
                    </label>
                  </div>
                )}

                {cartState.totalItems > 0 && (
                  <p className="caption2 text-secondary text-center mt-3">
                    {cartState.totalItems} item(s) · All prices in PKR (Rs.)
                  </p>
                )}

                <div className="cart-checkout-btn">
                  <button
                    type="button"
                    className="button-main bg-black"
                    disabled={cartState.cartArray.length === 0}
                    onClick={redirectToCheckout}
                  >
                    Proceed To Checkout
                  </button>
                </div>

                <Link href="/" className="cart-continue-link">
                  Continue shopping
                </Link>
              </aside>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Cart;
