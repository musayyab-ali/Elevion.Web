"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { formatRsPrice } from "@/lib/cart";
import { useRouter } from "next/navigation";
import {
  cancelCustomerOrder,
  clearOrderFlowStorage,
  fetchCustomerOrderDetails,
  fetchSelectPayment,
  formatOrderDate,
  getDeliveryOptionLabel,
  getPaymentPortalUrl,
  getStripePaymentReturnUrl,
  OrderDetailData,
  payInvoice,
  PaymentGateway,
  savePendingPaymentOrderId,
  savePendingPaymentTransactionId,
  SelectPaymentData,
} from "@/lib/order";
import { getProductDetailUrl } from "@/lib/featured-products";
import { getApiErrorMessage } from "@/lib/api";
import {
  applyPromoCodeToOrder,
  cancelPromoCodeFromOrder,
  clearPendingPromoCode,
  extractCampaignIdFromOrder,
  getOrderCampaignId,
  getPendingPromoCode,
  getPromoErrorMessage,
  saveOrderCampaignId,
} from "@/lib/promo";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";

const ORDER_CART_CLEAR_KEY = "clear_cart_after_order";

const OrderDetailsPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = Number(params.orderId);
  const promoAutoApplied = useRef(false);
  const { clearCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [paymentData, setPaymentData] = useState<SelectPaymentData | null>(
    null,
  );
  const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [cancellingPromo, setCancellingPromo] = useState(false);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const router = useRouter();

  const resolveCampaignId = (
    orderDetails: OrderDetailData | null,
    paymentOptions: SelectPaymentData | null,
  ): number | null => {
    return (
      extractCampaignIdFromOrder(paymentOptions) ||
      extractCampaignIdFromOrder(orderDetails) ||
      (orderDetails ? getOrderCampaignId(orderDetails.OrderId) : null) ||
      null
    );
  };

  const loadOrder = async () => {
    if (!orderId || Number.isNaN(orderId)) {
      setError("Invalid order ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const orderDetails = await fetchCustomerOrderDetails(orderId);
      setOrder(orderDetails);

      let paymentOptions: SelectPaymentData | null = null;
      try {
        paymentOptions = await fetchSelectPayment(orderId);
        setPaymentData(paymentOptions);
        setSelectedGateway(null);
      } catch (paymentErr) {
        console.error("Failed to load payment options:", paymentErr);
        toast.error(
          getApiErrorMessage(
            paymentErr,
            "Payment methods could not be loaded.",
          ),
        );
      }

      const resolvedCampaign = resolveCampaignId(orderDetails, paymentOptions);
      if (resolvedCampaign) {
        setCampaignId(resolvedCampaign);
        saveOrderCampaignId(orderId, resolvedCampaign);
      }

      if (orderDetails.PromoCode) {
        setPromoInput(orderDetails.PromoCode);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load order details."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ORDER_CART_CLEAR_KEY) !== "1") return;
    sessionStorage.removeItem(ORDER_CART_CLEAR_KEY);
    clearCart();
  }, [clearCart]);

  const handleApplyPromo = useCallback(
    async (codeOverride?: string) => {
      const code = (codeOverride ?? promoInput).trim();
      if (!code) {
        toast.error("Please enter a valid promo code.");
        return;
      }
      if (!orderId || Number.isNaN(orderId)) {
        toast.error("Invalid order ID.");
        return;
      }

      setApplyingPromo(true);
      try {
        const result = await applyPromoCodeToOrder(code, orderId);
        if (!result.success) {
          toast.error(
            result.message ||
              "This promo code is invalid or cannot be applied to your order.",
          );
          return;
        }

        clearPendingPromoCode();
        setPromoInput(code);
        if (result.campaignId) {
          setCampaignId(result.campaignId);
        }
        toast.success(result.message);
        await loadOrder();
      } catch (err) {
        clearPendingPromoCode();
        toast.error(
          getPromoErrorMessage(
            err,
            "This promo code is invalid or cannot be applied to your order.",
          ),
        );
      } finally {
        setApplyingPromo(false);
      }
    },
    [orderId, promoInput],
  );

  const handleCancelPromo = useCallback(async () => {
    if (!orderId || Number.isNaN(orderId)) {
      toast.error("Invalid order ID.");
      return;
    }

    const resolved =
      campaignId ||
      resolveCampaignId(order, paymentData) ||
      getOrderCampaignId(orderId);

    if (!resolved) {
      toast.error(
        "Unable to remove promo. Campaign details were not found. Please refresh and try again.",
      );
      return;
    }

    setCancellingPromo(true);
    try {
      const result = await cancelPromoCodeFromOrder(orderId, resolved);
      setCampaignId(null);
      setPromoInput("");
      toast.success(result.message);
      await loadOrder();
    } catch (err) {
      toast.error(
        getPromoErrorMessage(
          err,
          "We couldn't remove this promo code. Please try again.",
        ),
      );
    } finally {
      setCancellingPromo(false);
    }
  }, [orderId, campaignId, order, paymentData]);

  // Auto-apply promo saved from cart/checkout once order page loads.
  useEffect(() => {
    if (!orderId || Number.isNaN(orderId) || loading || !order) return;
    if (promoAutoApplied.current) return;
    if (order.PromoCode) {
      setPromoInput(order.PromoCode);
      promoAutoApplied.current = true;
      return;
    }

    const pending = getPendingPromoCode();
    if (!pending) {
      promoAutoApplied.current = true;
      return;
    }

    promoAutoApplied.current = true;
    setPromoInput(pending);
    void handleApplyPromo(pending);
  }, [orderId, loading, order, handleApplyPromo]);

  const openCancelModal = () => {
    if (!order || isCancelled || cancelling) return;
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (cancelling) return;
    setShowCancelModal(false);
  };

  const confirmCancelOrder = async () => {
    if (!order || isCancelled) return;

    setCancelling(true);
    try {
      const message = await cancelCustomerOrder(order.OrderId);
      toast.success(message);
      setIsCancelled(true);
      setShowCancelModal(false);
      clearOrderFlowStorage();
      await loadOrder();
      router.push("/");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to cancel order."));
    } finally {
      setCancelling(false);
    }
  };

  const displayOrder = paymentData?.OrderDto ?? order;
  const gateways = paymentData?.PaymentGateways ?? [];
  const items = displayOrder?.OrderDetails?.OrderItemList ?? [];

  const handleSelectPayment = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway.PGId);
  };

  const processPayment = useCallback(async () => {
    const currentOrder = paymentData?.OrderDto ?? order;

    if (!currentOrder) {
      toast.error("Order details are not available.");
      return;
    }

    if (!selectedGateway) {
      toast.error("Please select a payment method first.");
      return;
    }

    setPaying(true);
    try {
      const paymentResult = await payInvoice({
        OrderId: currentOrder.OrderId,
        OrderAmount: currentOrder.NetAmount,
        TenantPaymentGatewayId: selectedGateway,
        PaymentGateway: selectedGateway,
        ReturnUrl: getStripePaymentReturnUrl(),
      });

      const paymentUrl = getPaymentPortalUrl(paymentResult);
      if (!paymentUrl) {
        toast.error("Payment URL not received. Please try again.");
        setPaying(false);
        return;
      }

      savePendingPaymentOrderId(currentOrder.OrderId);
      const transactionId = paymentResult.Transaction?.TransactionID?.trim();
      if (transactionId) {
        savePendingPaymentTransactionId(transactionId);
      }

      toast.success("Redirecting to payment gateway...");

      if (paymentResult.IsOpenNewTab) {
        const popup = window.open(paymentUrl, "_blank", "noopener,noreferrer");
        if (!popup) {
          window.location.assign(paymentUrl);
        } else {
          setPaying(false);
        }
        return;
      }

      window.location.assign(paymentUrl);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to process payment."));
      setPaying(false);
    }
  }, [order, paymentData, selectedGateway]);

  const handlePayNow = () => {
    void processPayment();
  };

  const isFromCheckout = searchParams.get("pay") === "1";
  const canPay =
    gateways.length > 0 && selectedGateway !== null && !isCancelled;

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Order Details" subHeading="Order Details" />
      </div>

      <div className="order-page md:py-16 py-10">
        <div className="container">
          {loading ? (
            <div className="order-loading">
              <div className="order-loading-spinner" />
              <p className="text-secondary">Loading order details...</p>
            </div>
          ) : error ? (
            <div className="order-error">
              <Icon.WarningCircle
                size={40}
                className="text-red-600 mx-auto mb-4"
              />
              <p className="text-red-600 mb-6">{error}</p>
              <Link href="/" className="button-main inline-block bg-black">
                Back to Home
              </Link>
            </div>
          ) : displayOrder ? (
            <>
              {isFromCheckout && (
                <div className="order-success-banner">
                  <span className="order-success-icon">
                    <Icon.CheckCircle size={22} weight="fill" />
                  </span>
                  <div>
                    <p className="text-button font-semibold">
                      Order placed successfully!
                    </p>
                    <p className="caption1 text-secondary mt-1">
                      Complete payment below to confirm your order. A
                      confirmation will be sent to your email.
                    </p>
                  </div>
                </div>
              )}

              <div className="order-layout">
                <div className="order-main-stack">
                  <div className="order-card">
                    <div className="order-header-top">
                      <div>
                        <span className="order-badge">Order Confirmation</span>
                        <h1 className="heading3 mt-3">
                          {displayOrder.OrderNumber}
                        </h1>
                        <p className="caption1 text-secondary mt-2">
                          Review your order details and complete payment below.
                        </p>
                      </div>
                      <div className="order-status-badges">
                        <span className="order-status-badge is-order">
                          {displayOrder.OrderStatusDisplayName}
                        </span>
                        <span className="order-status-badge is-payment">
                          {displayOrder.PaymentStatusDisplayName}
                        </span>
                        {displayOrder.IsGiftOrder && (
                          <span className="order-status-badge is-gift">
                            Gift Order
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="order-meta-grid">
                      <div className="order-meta-item">
                        <span className="order-meta-icon">
                          <Icon.CalendarBlank size={18} weight="bold" />
                        </span>
                        <div>
                          <div className="caption2 text-secondary">
                            Delivery Date
                          </div>
                          <div className="text-button mt-0.5">
                            {formatOrderDate(displayOrder.DeliveryDate)}
                          </div>
                        </div>
                      </div>
                      <div className="order-meta-item">
                        <span className="order-meta-icon">
                          <Icon.Truck size={18} weight="bold" />
                        </span>
                        <div>
                          <div className="caption2 text-secondary">
                            Delivery Option
                          </div>
                          <div className="text-button mt-0.5">
                            {getDeliveryOptionLabel(
                              displayOrder.DeliveryOption,
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="order-meta-item">
                        <span className="order-meta-icon">
                          <Icon.User size={18} weight="bold" />
                        </span>
                        <div>
                          <div className="caption2 text-secondary">
                            Customer
                          </div>
                          <div className="text-button mt-0.5">
                            {displayOrder.CustomerFullName ||
                              displayOrder.OrderShippingDetails?.FullName}
                          </div>
                        </div>
                      </div>
                      <div className="order-meta-item">
                        <span className="order-meta-icon">
                          <Icon.Package size={18} weight="bold" />
                        </span>
                        <div>
                          <div className="caption2 text-secondary">
                            Total Items
                          </div>
                          <div className="text-button mt-0.5">
                            {displayOrder.TotalItems}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="order-card">
                    <h2 className="order-section-title">
                      <span className="order-section-icon">
                        <Icon.ShoppingBag size={18} weight="bold" />
                      </span>
                      Order Items
                    </h2>
                    <div>
                      {items.map((item) => {
                        const image =
                          item.ProductImageURL &&
                          !item.ProductImageURL.includes("noImage")
                            ? item.ProductImageURL
                            : "/images/product/1000x1000.png";

                        return (
                          <div key={item.OrderDetailId} className="order-item">
                            <Link
                              href={getProductDetailUrl(
                                item.ProductId,
                                item.ProductDetailId,
                              )}
                              className="order-item-image"
                            >
                              <Image
                                src={image}
                                fill
                                sizes="72px"
                                alt={item.ProductName}
                                className="object-cover"
                              />
                            </Link>
                            <div className="min-w-0">
                              <Link
                                href={getProductDetailUrl(
                                  item.ProductId,
                                  item.ProductDetailId,
                                )}
                                className="text-button font-semibold hover:underline line-clamp-2"
                              >
                                {item.ProductName}
                              </Link>
                              {item.VariantName && (
                                <span className="order-item-variant">
                                  {item.VariantName.replace(/,/g, ", ")}
                                </span>
                              )}
                              <div className="order-item-foot">
                                <span className="caption1 text-secondary">
                                  Qty: {item.Quantity}
                                </span>
                                <span className="text-button font-semibold">
                                  {formatRsPrice(item.TotalAmount)}
                                </span>
                              </div>
                              {item.Quantity > 1 && (
                                <div className="caption2 text-secondary mt-1">
                                  {formatRsPrice(item.Amount)} each
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="order-address-grid">
                    <div className="order-card">
                      <h3 className="order-section-title">
                        <span className="order-section-icon">
                          <Icon.MapPin size={18} weight="bold" />
                        </span>
                        Shipping Address
                      </h3>
                      <div className="order-address-card">
                        <p className="text-button font-semibold text-black">
                          {displayOrder.OrderShippingDetails?.FullName}
                        </p>
                        <div className="order-address-lines">
                          <p>
                            {(() => {
                              const details = displayOrder.OrderShippingDetails;
                              const phoneCode = String(
                                details?.PhoneCode ||
                                  details?.phoneCode ||
                                  "92",
                              ).replace(/\D/g, "");
                              let phone = String(
                                details?.Phone || details?.phone || "",
                              ).replace(/\D/g, "");

                              if (phone.startsWith(phoneCode)) {
                                phone = phone.slice(phoneCode.length);
                              }
                              if (phone.startsWith("0")) {
                                phone = phone.replace(/^0+/, "");
                              }

                              return `+${phoneCode} ${phone}`;
                            })()}
                          </p>
                          <p>{displayOrder.OrderShippingDetails?.Address}</p>
                          <p>
                            {displayOrder.OrderShippingDetails?.City},{" "}
                            {displayOrder.OrderShippingDetails?.Country}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="order-card">
                      <h3 className="order-section-title">
                        <span className="order-section-icon">
                          <Icon.Receipt size={18} weight="bold" />
                        </span>
                        Billing Details
                      </h3>
                      <div className="order-address-card">
                        <p className="text-button font-semibold text-black">
                          {displayOrder.OrderBillingDetails?.FullName ||
                            displayOrder.OrderShippingDetails?.FullName}
                        </p>
                        <div className="order-address-lines">
                          <p>
                            {displayOrder.OrderBillingDetails?.EmailAddress}
                          </p>
                          <p>
                            {(() => {
                              const details =
                                displayOrder.OrderBillingDetails ||
                                displayOrder.OrderShippingDetails;
                              const phoneCode = String(
                                details?.PhoneCode ||
                                  details?.phoneCode ||
                                  "92",
                              ).replace(/\D/g, "");
                              let phone = String(
                                details?.Phone || details?.phone || "",
                              ).replace(/\D/g, "");

                              if (phone.startsWith(phoneCode)) {
                                phone = phone.slice(phoneCode.length);
                              }
                              if (phone.startsWith("0")) {
                                phone = phone.replace(/^0+/, "");
                              }

                              return `+${phoneCode} ${phone}`;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(displayOrder.SpecialInstructions ||
                    displayOrder.DeliveryInstructions) && (
                    <div className="order-card">
                      <h3 className="order-section-title">
                        <span className="order-section-icon">
                          <Icon.NotePencil size={18} weight="bold" />
                        </span>
                        Instructions
                      </h3>
                      {displayOrder.SpecialInstructions && (
                        <div className="order-instructions">
                          <div className="caption2 text-secondary">
                            Special Instructions
                          </div>
                          <p className="caption1 mt-2">
                            {displayOrder.SpecialInstructions}
                          </p>
                        </div>
                      )}
                      {displayOrder.DeliveryInstructions && (
                        <div className="order-instructions">
                          <div className="caption2 text-secondary">
                            Delivery Instructions
                          </div>
                          <p className="caption1 mt-2">
                            {displayOrder.DeliveryInstructions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {gateways.length > 0 && (
                    <div className="order-card">
                      <h2 className="order-section-title">
                        <span className="order-section-icon">
                          <Icon.CreditCard size={18} weight="bold" />
                        </span>
                        Select Payment Method
                      </h2>
                      <p className="caption1 text-secondary mb-4 -mt-2">
                        Choose a payment gateway to complete your order
                      </p>
                      <div className="order-payment-grid">
                        {gateways.map((gateway) => (
                          <button
                            type="button"
                            key={gateway.PGId}
                            onClick={() => handleSelectPayment(gateway)}
                            className={`order-payment-option ${selectedGateway === gateway.PGId ? "is-selected" : ""}`}
                          >
                            {gateway.Name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="order-card order-summary-card">
                  <h2 className="order-section-title">
                    <span className="order-section-icon">
                      <Icon.CurrencyCircleDollar size={18} weight="bold" />
                    </span>
                    Order Summary
                  </h2>

                  <div className="order-totals">
                    <div className="order-total-row">
                      <span className="text-secondary">Order Amount</span>
                      <span>{formatRsPrice(displayOrder.OrderAmount)}</span>
                    </div>
                    <div className="order-total-row">
                      <span className="text-secondary">Delivery Charges</span>
                      <span>
                        {formatRsPrice(displayOrder.DeliveryCharges ?? 0)}
                      </span>
                    </div>
                    <div className="order-total-row">
                      <span className="text-secondary">POS Charges</span>
                      <span>{formatRsPrice(displayOrder.POSCharges ?? 0)}</span>
                    </div>
                    <div className="order-total-row">
                      <span className="text-secondary">Discount</span>
                      <span
                        style={{
                          color:
                            displayOrder.NetDiscount > 0
                              ? "#16a34a"
                              : undefined,
                        }}
                        className="font-semibold"
                      >
                        {displayOrder.NetDiscount > 0
                          ? `-${formatRsPrice(displayOrder.NetDiscount)}`
                          : formatRsPrice(0)}
                      </span>
                    </div>
                    {displayOrder.PromoCode && (
                      <div className="order-total-row">
                        <span className="text-secondary">Promo Code</span>
                        <span>{displayOrder.PromoCode}</span>
                      </div>
                    )}
                    <div className="order-total-row is-grand">
                      <span>Net Amount</span>
                      <span>{formatRsPrice(displayOrder.NetAmount)}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="order-promo-code"
                      className="caption1 text-secondary"
                    >
                      Promo Code
                    </label>
                    <div className="flex gap-2 mt-2">
                      <input
                        id="order-promo-code"
                        type="text"
                        className="border-line px-4 py-2 w-full rounded-lg border"
                        placeholder="Enter promo code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        disabled={
                          applyingPromo ||
                          cancellingPromo ||
                          Boolean(
                            displayOrder.PromoCode ||
                            displayOrder.NetDiscount > 0,
                          )
                        }
                      />
                      {displayOrder.PromoCode ||
                      displayOrder.NetDiscount > 0 ||
                      campaignId ? (
                        <button
                          type="button"
                          className="button-main bg-red px-4 whitespace-nowrap"
                          onClick={() => void handleCancelPromo()}
                          disabled={applyingPromo || cancellingPromo}
                        >
                          {cancellingPromo ? "Removing..." : "Remove"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button-main bg-black px-4 whitespace-nowrap"
                          onClick={() => void handleApplyPromo()}
                          disabled={applyingPromo || cancellingPromo}
                        >
                          {applyingPromo ? "Applying..." : "Apply"}
                        </button>
                      )}
                    </div>
                    <p className="caption2 text-secondary mt-2">
                      {displayOrder.PromoCode || displayOrder.NetDiscount > 0
                        ? "Promo applied. Remove it to try a different code."
                        : "Enter a valid promo code. Invalid codes will be rejected."}
                    </p>
                  </div>

                  <p className="caption2 text-secondary text-center mt-3">
                    All amounts in PKR (Rs.)
                  </p>

                  {selectedGateway && (
                    <div className="order-selected-gateway">
                      Selected:{" "}
                      <strong>
                        {gateways.find((g) => g.PGId === selectedGateway)?.Name}
                      </strong>
                    </div>
                  )}

                  <div className="order-summary-pay-btn">
                    <button
                      type="button"
                      onClick={handlePayNow}
                      disabled={paying || !canPay}
                      className="button-main bg-black w-full"
                    >
                      {paying ? "Processing Payment..." : "Proceed to Payment"}
                    </button>
                  </div>

                  <div className="order-actions mt-4">
                    <button
                      type="button"
                      onClick={openCancelModal}
                      disabled={cancelling || isCancelled}
                      className="order-action-btn is-danger"
                    >
                      {cancelling
                        ? "Cancelling..."
                        : isCancelled
                          ? "Order Cancelled"
                          : "Cancel Order"}
                    </button>
                  </div>
                </aside>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {showCancelModal && (
        <div
          className="order-cancel-modal open"
          onClick={closeCancelModal}
          role="presentation"
        >
          <div
            className="order-cancel-modal-main open"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-cancel-title"
          >
            <button
              type="button"
              className="order-cancel-modal-close"
              onClick={closeCancelModal}
              disabled={cancelling}
              aria-label="Close"
            >
              <Icon.X size={18} />
            </button>

            <div className="order-cancel-modal-icon">
              <Icon.WarningCircle size={28} weight="fill" />
            </div>

            <h2 id="order-cancel-title" className="heading5 text-center">
              Cancel this order?
            </h2>
            <p className="caption1 text-secondary text-center mt-3">
              Are you sure you want to cancel order{" "}
              <strong>{displayOrder?.OrderNumber}</strong>? This action cannot
              be undone.
            </p>

            <div className="order-cancel-modal-actions">
              <button
                type="button"
                className="order-action-btn"
                onClick={closeCancelModal}
                disabled={cancelling}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="order-action-btn is-danger"
                onClick={() => void confirmCancelOrder()}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default OrderDetailsPage;
