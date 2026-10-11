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
  clearOrderSaleCampaignId,
  confirmOrder,
  extractSaleCampaignId,
  fetchCustomerOrderDetails,
  fetchSelectPayment,
  formatOrderDate,
  getDeliveryOptionLabel,
  getOrderSaleCampaignId,
  getPaymentPortalUrl,
  getStripePaymentReturnUrl,
  isCashOnDeliveryGateway,
  OrderDetailData,
  payInvoice,
  PaymentGateway,
  savePendingPaymentOrderId,
  savePendingPaymentTransactionId,
  saveOrderSaleCampaignId,
  SelectPaymentData,
  verifyOrderPayment,
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
import { reorderItems } from "@/lib/reorder";
import { applyRedeemPoints, fetchPointsBalance } from "@/lib/points-api";
import { checkPointsRequest, maxRedeemablePoints, pointsValue } from "@/lib/points";
import { applyGiftCard, fetchMyGiftCards, giftCardErrorMessage, removeGiftCard, type GiftCard } from "@/lib/gift-cards";
import { checkCardAmount, maxCardAmount } from "@/lib/gift-card-form";
import {
  CampaignType,
  getCampaignDiscountLabel,
  groupCampaignDiscounts,
} from "@/lib/discount";

const ORDER_CART_CLEAR_KEY = "clear_cart_after_order";

const OrderDetailsPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = Number(params.orderId);
  const promoAutoApplied = useRef(false);
  const { clearCart, fetchCart } = useCart();
  const [reordering, setReordering] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsInput, setPointsInput] = useState("");
  const [applyingPoints, setApplyingPoints] = useState(false);
  const [pointsError, setPointsError] = useState("");
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [giftInputs, setGiftInputs] = useState<Record<number, string>>({});
  const [giftBusyId, setGiftBusyId] = useState<number | null>(null);
  const [giftError, setGiftError] = useState("");

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
  const [saleCampaignId, setSaleCampaignId] = useState<number | null>(null);
  const [promoError, setPromoError] = useState("");
  const [alreadyPaidDetails, setAlreadyPaidDetails] = useState<{
    gatewayResponse: string;
    processedBy: string;
  } | null>(null);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState(false);
  // Kept so the discount stays visible even if the refreshed order omits it.
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
  } | null>(null);
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

  const loadOrder = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (!orderId || Number.isNaN(orderId)) {
      setError("Invalid order ID.");
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const orderDetails = await fetchCustomerOrderDetails(orderId);
      setOrder(orderDetails);

      let paymentOptions: SelectPaymentData | null = null;
      try {
        paymentOptions = await fetchSelectPayment(orderId);
        setPaymentData(paymentOptions);
        const availableGateways = paymentOptions?.PaymentGateways ?? [];
        setSelectedGateway((previous) =>
          previous &&
          availableGateways.some((gateway) => gateway.PGId === previous)
            ? previous
            : null,
        );
      } catch (paymentErr) {
        console.error("Failed to load payment options:", paymentErr);
        toast.error(
          getApiErrorMessage(
            paymentErr,
            "Payment methods could not be loaded.",
          ),
        );
      }

      // The points balance is only asked for when the shop lets customers pay with points.
      if (paymentOptions?.RewardPointsAllowed) {
        try {
          setPointsBalance(await fetchPointsBalance());
        } catch {
          setPointsBalance(0);
        }
      } else {
        setPointsBalance(0);
      }

      // Gift cards the customer can pay with (an empty list when the shop has none switched on).
      try {
        setGiftCards(await fetchMyGiftCards(orderId));
      } catch {
        setGiftCards([]);
      }

      const resolvedCampaign = resolveCampaignId(orderDetails, paymentOptions);
      if (resolvedCampaign) {
        setCampaignId(resolvedCampaign);
        saveOrderCampaignId(orderId, resolvedCampaign);
      }

      const activeOrder = paymentOptions?.OrderDto ?? orderDetails;
      const resolvedSaleCampaignId =
        extractSaleCampaignId(paymentOptions) ??
        extractSaleCampaignId(orderDetails) ??
        getOrderSaleCampaignId(orderId);
      setSaleCampaignId(resolvedSaleCampaignId);
      if (resolvedSaleCampaignId) {
        saveOrderSaleCampaignId(orderId, resolvedSaleCampaignId);
      }
      const savedCode = (activeOrder.PromoCode ?? "").trim();
      const savedNetDiscount = Math.max(
        0,
        Number(activeOrder.NetDiscount) || 0,
      );
      const itemDiscount = (
        activeOrder.OrderDetails?.OrderItemList ?? []
      ).reduce(
        (sum, item) => sum + Math.max(0, Number(item.DiscountAmount) || 0),
        0,
      );

      if (savedCode) {
        setPromoInput(savedCode);
      }
      if (savedCode || savedNetDiscount > 0) {
        setAppliedPromo((previous) => {
          const previousPromo = Math.max(0, Number(previous?.discount) || 0);
          // Prefer the promo API TotalDiscount; otherwise split net vs item discounts.
          const inferredPromo =
            previousPromo > 0
              ? previousPromo
              : savedCode
                ? Math.max(0, savedNetDiscount - itemDiscount)
                : 0;

          return {
            code: savedCode || previous?.code || "",
            discount: inferredPromo,
          };
        });
      } else {
        setAppliedPromo(null);
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load order details.");
      if (silent) {
        toast.error(message);
      } else {
        setError(message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
      setPromoError("");

      if (!code) {
        setPromoError("Please enter a promo code.");
        toast.error("Please enter a promo code.");
        return;
      }
      if (!orderId || Number.isNaN(orderId)) {
        toast.error("Invalid order ID.");
        return;
      }

      setApplyingPromo(true);
      try {
        const result = await applyPromoCodeToOrder(code, orderId);
        const invalidCodeMessage =
          "This promo code is invalid or cannot be applied to your order.";

        if (!result.success) {
          setPromoError(result.message || invalidCodeMessage);
          toast.error(result.message || invalidCodeMessage);
          return;
        }

        clearPendingPromoCode();
        const appliedCode = result.code || code;
        setPromoInput(appliedCode);
        setAppliedPromo({
          code: appliedCode,
          discount: result.totalDiscount ?? 0,
        });
        if (result.campaignId) {
          setCampaignId(result.campaignId);
        }
        toast.success(result.message);
        await loadOrder({ silent: true });
      } catch (err) {
        clearPendingPromoCode();
        const message = getPromoErrorMessage(
          err,
          "This promo code is invalid or cannot be applied to your order.",
        );
        setPromoError(message);
        toast.error(message);
      } finally {
        setApplyingPromo(false);
      }
    },
    [orderId, promoInput],
  );

  const handleCancelPromo = useCallback(async () => {
    setPromoError("");

    if (!orderId || Number.isNaN(orderId)) {
      toast.error("Invalid order ID.");
      return;
    }

    const resolved =
      campaignId ||
      resolveCampaignId(order, paymentData) ||
      getOrderCampaignId(orderId);

    if (!resolved) {
      const message =
        "Unable to remove promo. Campaign details were not found. Please refresh and try again.";
      setPromoError(message);
      toast.error(message);
      return;
    }

    setCancellingPromo(true);
    try {
      const result = await cancelPromoCodeFromOrder(orderId, resolved);
      setCampaignId(null);
      setPromoInput("");
      setAppliedPromo(null);
      toast.success(result.message);
      await loadOrder({ silent: true });
    } catch (err) {
      const message = getPromoErrorMessage(
        err,
        "We couldn't remove this promo code. Please try again.",
      );
      setPromoError(message);
      toast.error(message);
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

  const handleBuyAgain = async () => {
    const lines = (paymentData?.OrderDto ?? order)?.OrderDetails?.OrderItemList ?? [];
    if (lines.length === 0 || reordering) return;

    setReordering(true);
    try {
      const result = await reorderItems(lines);
      if (result.added > 0) await fetchCart({ silent: true });

      if (result.failed.length > 0) {
        const names = result.failed.map((line) => line.name).join(", ");
        toast.error(
          result.added > 0
            ? `Added ${result.added} item(s). Not available: ${names}`
            : `These items could not be added: ${names}`,
        );
      } else {
        toast.success("Items added to your cart.");
      }
      if (result.added > 0) router.push("/cart");
    } finally {
      setReordering(false);
    }
  };

  const displayOrder = paymentData?.OrderDto ?? order;
  const gateways = paymentData?.PaymentGateways ?? [];
  const items = displayOrder?.OrderDetails?.OrderItemList ?? [];

  const orderAmount = Math.max(0, Number(displayOrder?.OrderAmount) || 0);
  const deliveryCharges = Math.max(
    0,
    Number(displayOrder?.DeliveryCharges) || 0,
  );
  const posCharges = Math.max(0, Number(displayOrder?.POSCharges) || 0);
  // Points are shown on their own line, so they are taken out of the general discount here.
  const burnPoints = Math.max(0, Number(displayOrder?.BurnPoints) || 0);
  const pointRate = Math.max(0, Number(displayOrder?.BurnOnePointAmount) || 0);
  const pointsDiscount = pointsValue(burnPoints, pointRate);
  // Gift cards also get their own line, so they are taken out of the general discount too.
  const giftApplied = giftCards.reduce((sum, card) => sum + (Number(card.appliedToOrder) || 0), 0);
  const apiNetDiscount = Math.max(
    0,
    (Number(displayOrder?.NetDiscount) || 0) - pointsDiscount - giftApplied,
  );
  const apiNetAmount = Math.max(0, Number(displayOrder?.NetAmount) || 0);

  const promoCode =
    (displayOrder?.PromoCode ?? "").trim() || appliedPromo?.code || "";
  const appliedPromoAmount = Math.max(0, Number(appliedPromo?.discount) || 0);
  const isPromoApplied =
    Boolean(promoCode) || appliedPromoAmount > 0 || Boolean(campaignId);

  const itemCampaignDiscounts = groupCampaignDiscounts(
    items.map((item) => ({
      campaignType: Number(item.CampaignType) || CampaignType.Sale,
      campaignTypeDisplayName: item.CampaignTypeDisplayName ?? null,
      amount: Math.max(0, Number(item.DiscountAmount) || 0),
    })),
  );
  const itemCampaignTotal = itemCampaignDiscounts.reduce(
    (sum, campaign) => sum + campaign.amount,
    0,
  );

  // One source of truth for discounts — never double-count item + promo.
  // Item discounts do not change when a promo is applied or removed, so they
  // anchor the product row; otherwise it jumps while the refreshed order is
  // still in flight (API NetDiscount lags the local promo state by a moment).
  const canAnchorOnItems =
    itemCampaignTotal > 0 && apiNetDiscount + 0.02 >= itemCampaignTotal;

  let promoDiscount = 0;
  let productDiscount = 0;

  if (canAnchorOnItems) {
    productDiscount = itemCampaignTotal;
    promoDiscount = isPromoApplied
      ? Math.max(appliedPromoAmount, apiNetDiscount - itemCampaignTotal)
      : 0;
  } else if (isPromoApplied) {
    const fallbackTotal = Math.max(apiNetDiscount, appliedPromoAmount);
    promoDiscount = Math.min(
      appliedPromoAmount > 0 ? appliedPromoAmount : fallbackTotal,
      fallbackTotal,
    );
    productDiscount = Math.max(0, fallbackTotal - promoDiscount);
  } else {
    productDiscount = apiNetDiscount;
  }

  const totalDiscount = productDiscount + promoDiscount + pointsDiscount + giftApplied;
  const classifiedProductDiscounts =
    productDiscount > 0 && itemCampaignTotal > 0
      ? itemCampaignDiscounts.map((campaign) => ({
          ...campaign,
          amount:
            Math.round(
              (campaign.amount / itemCampaignTotal) * productDiscount * 100,
            ) / 100,
        }))
      : [];
  const classifiedProductTotal = classifiedProductDiscounts.reduce(
    (sum, campaign) => sum + campaign.amount,
    0,
  );
  const unclassifiedProductDiscount = Math.max(
    0,
    productDiscount - classifiedProductTotal,
  );
  const productCampaignDiscounts =
    unclassifiedProductDiscount > 0.009
      ? [
          ...classifiedProductDiscounts,
          {
            campaignType:
              Number(displayOrder?.CampaignType) || CampaignType.Sale,
            campaignTypeDisplayName:
              displayOrder?.CampaignTypeDisplayName ?? null,
            amount: unclassifiedProductDiscount,
          },
        ]
      : classifiedProductDiscounts;

  const discountRowCount =
    productCampaignDiscounts.length +
    (promoDiscount > 0 ? 1 : 0) +
    (pointsDiscount > 0 ? 1 : 0) +
    (giftApplied > 0 ? 1 : 0);

  // Visible rows must always reconcile: Order + Delivery + POS - discounts.
  const computedNetAmount = Math.max(
    0,
    orderAmount +
      deliveryCharges +
      posCharges -
      productDiscount -
      promoDiscount -
      pointsDiscount -
      giftApplied,
  );
  // Prefer API when it already matches; otherwise show the reconciled total.
  const displayNetAmount =
    Math.abs(apiNetAmount - computedNetAmount) < 0.02
      ? apiNetAmount
      : computedNetAmount;

  // The API stops reporting "allowed" once every point is spent; the box must stay so the points can be taken off again.
  const pointsAllowed =
    (Boolean(paymentData?.RewardPointsAllowed) || burnPoints > 0) &&
    pointRate > 0;
  const pointsMax = maxRedeemablePoints({
    balance: pointsBalance,
    applied: burnPoints,
    payable: displayNetAmount,
    rate: pointRate,
  });
  const pointsLocked = isCancelled || Boolean(alreadyPaidDetails) || applyingPoints;

  // Sending 0 takes the points discount off the order again.
  const handleApplyPoints = async (value?: number) => {
    if (!orderId || Number.isNaN(orderId)) return;
    let points = 0;
    if (value === undefined) {
      // Tell the customer when they ask for too much; never apply a different number quietly.
      const check = checkPointsRequest(pointsInput, {
        balance: pointsBalance,
        applied: burnPoints,
        payable: displayNetAmount,
        rate: pointRate,
      });
      if (!check.ok) {
        setPointsError(check.message);
        toast.error(check.message);
        return;
      }
      points = check.points;
    } else {
      points = value;
    }

    setApplyingPoints(true);
    setPointsError("");
    try {
      await applyRedeemPoints(orderId, points);
      toast.success(points > 0 ? "Reward points applied." : "Reward points removed.");
      setPointsInput("");
      await loadOrder({ silent: true });
    } catch (err) {
      const message = getApiErrorMessage(err, "Could not use your reward points.");
      setPointsError(message);
      toast.error(message);
    } finally {
      setApplyingPoints(false);
    }
  };

  const giftLocked = isCancelled || Boolean(alreadyPaidDetails) || giftBusyId !== null;

  const handleUseGiftCard = async (card: GiftCard) => {
    if (!orderId || Number.isNaN(orderId)) return;
    const check = checkCardAmount(giftInputs[card.giftCardId] ?? "", {
      balance: card.balance,
      applied: card.appliedToOrder,
      payable: displayNetAmount,
    });
    if (!check.ok) {
      setGiftError(check.message);
      toast.error(check.message);
      return;
    }

    setGiftBusyId(card.giftCardId);
    setGiftError("");
    try {
      await applyGiftCard(orderId, card.giftCardId, check.amount);
      toast.success("Gift card applied.");
      setGiftInputs((current) => ({ ...current, [card.giftCardId]: "" }));
      await loadOrder({ silent: true });
    } catch (err) {
      const message = giftCardErrorMessage(err, "Could not use this gift card.");
      setGiftError(message);
      toast.error(message);
    } finally {
      setGiftBusyId(null);
    }
  };

  const handleRemoveGiftCard = async (card: GiftCard) => {
    if (!orderId || Number.isNaN(orderId)) return;
    setGiftBusyId(card.giftCardId);
    setGiftError("");
    try {
      await removeGiftCard(orderId, card.giftCardId);
      toast.success("Gift card removed.");
      await loadOrder({ silent: true });
    } catch (err) {
      const message = giftCardErrorMessage(err, "Could not remove this gift card.");
      setGiftError(message);
      toast.error(message);
    } finally {
      setGiftBusyId(null);
    }
  };

  const usableGiftCards = giftCards.filter((card) => card.appliedToOrder > 0 || (card.isUsable && card.balance > 0));

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

    const activeGateway =
      (paymentData?.PaymentGateways ?? []).find(
        (gateway) => gateway.PGId === selectedGateway,
      ) ?? null;

    setPaying(true);

    // Block a second payment attempt on an order that is already paid.
    setCheckingPaymentStatus(true);
    try {
      const verification = await verifyOrderPayment(currentOrder.OrderId);

      if (verification.isPaymentVerified) {
        setAlreadyPaidDetails({
          gatewayResponse: verification.gatewayResponse,
          processedBy: verification.processedBy,
        });
        setPaying(false);
        return;
      }

      setAlreadyPaidDetails(null);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Failed to verify the order payment status."),
      );
      setPaying(false);
      return;
    } finally {
      setCheckingPaymentStatus(false);
    }

    // COD has no gateway redirect — confirm the order and go straight to success.
    if (isCashOnDeliveryGateway(activeGateway)) {
      try {
        await confirmOrder({
          OrderId: currentOrder.OrderId,
          RedeemPoints: 0,
          // ConfirmOrder expects the sale campaign from CreateOrder response,
          // not the promo campaign used by Apply/CancelPromo.
          CampaignId:
            saleCampaignId ??
            extractSaleCampaignId(currentOrder) ??
            getOrderSaleCampaignId(currentOrder.OrderId) ??
            0,
        });

        clearOrderFlowStorage();
        clearOrderSaleCampaignId(currentOrder.OrderId);
        savePendingPaymentOrderId(currentOrder.OrderId);
        clearCart();
        toast.success("Order confirmed. You will pay on delivery.");
        router.push(`/PaymentResponse/cod?orderId=${currentOrder.OrderId}`);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to confirm your order."));
        setPaying(false);
      }
      return;
    }

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
  }, [order, paymentData, selectedGateway, saleCampaignId, clearCart, router]);

  const handlePayNow = () => {
    void processPayment();
  };

  const isFromCheckout = searchParams.get("pay") === "1";
  const canPay =
    gateways.length > 0 && selectedGateway !== null && !isCancelled;
  const isCodSelected = isCashOnDeliveryGateway(
    gateways.find((gateway) => gateway.PGId === selectedGateway) ?? null,
  );

  return (
    <>
      <TopNavOne
        props="style-one bg-black"
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

                    {displayOrder.DeliveryCode && (
                      <div className="mt-4 p-4 rounded-xl" style={{ background: "#EEF6FF", textAlign: "center" }}>
                        <div className="caption1" style={{ fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase" }}>Delivery code</div>
                        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 10 }} aria-label={`Delivery code ${String(displayOrder.DeliveryCode).split("").join(" ")}`}>
                          {displayOrder.DeliveryCode}
                        </div>
                        <div className="caption1 text-secondary">Tell this code to the rider when your order arrives. Do not share it with anyone else.</div>
                      </div>
                    )}

                    {displayOrder.Status === 3 && (
                      <div className="mt-4">
                        <Link
                          href={`/my-account/returns/new?orderId=${displayOrder.OrderId}`}
                          className="button-main inline-block bg-white text-black border border-black"
                        >
                          Return items
                        </Link>
                      </div>
                    )}

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

                        // TotalAmount already has the item discount taken off,
                        // so the row total must be rebuilt from the unit price.
                        const itemDiscount = Math.max(
                          0,
                          Number(item.DiscountAmount) || 0,
                        );
                        const grossLineTotal =
                          (Number(item.Amount) || 0) *
                          (Number(item.Quantity) || 0);
                        const payableLineTotal = Math.max(
                          0,
                          grossLineTotal - itemDiscount,
                        );

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
                                  {item.Quantity} × {formatRsPrice(item.Amount)}
                                </span>
                                <span className="text-button font-semibold">
                                  {formatRsPrice(grossLineTotal)}
                                </span>
                              </div>
                              {itemDiscount > 0 && (
                                <>
                                  <div className="summary-item-line is-discount">
                                    <span>Item discount</span>
                                    <span>-{formatRsPrice(itemDiscount)}</span>
                                  </div>
                                  <div className="summary-item-line is-payable">
                                    <span>You pay</span>
                                    <span>
                                      {formatRsPrice(payableLineTotal)}
                                    </span>
                                  </div>
                                </>
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
                      <span className="text-secondary">
                        Items total
                        <small className="summary-hint">
                          {items.length} item(s), before discount
                        </small>
                      </span>
                      <span>{formatRsPrice(orderAmount)}</span>
                    </div>

                    {productCampaignDiscounts.length > 0 ? (
                      productCampaignDiscounts.map((campaign) => (
                        <div
                          key={`${campaign.campaignType}-${campaign.campaignTypeDisplayName}`}
                          className="order-total-row is-discount"
                        >
                          <span>
                            {getCampaignDiscountLabel(
                              campaign.campaignType,
                              campaign.campaignTypeDisplayName,
                            )}
                          </span>
                          <span>-{formatRsPrice(campaign.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="order-total-row">
                        <span className="text-secondary">Discount</span>
                        <span className="font-semibold">
                          {formatRsPrice(0)}
                        </span>
                      </div>
                    )}

                    {(isPromoApplied || promoDiscount > 0) && (
                      <div
                        className={`order-total-row ${promoDiscount > 0 ? "is-discount" : ""}`}
                      >
                        <span>
                          Promo Code Discount
                          {promoCode ? (
                            <span className="order-promo-chip ml-2">
                              {promoCode}
                            </span>
                          ) : null}
                        </span>
                        <span className="font-semibold">
                          {promoDiscount > 0
                            ? `-${formatRsPrice(promoDiscount)}`
                            : formatRsPrice(0)}
                        </span>
                      </div>
                    )}

                    {pointsDiscount > 0 && (
                      <div className="order-total-row is-discount">
                        <span>Reward points ({burnPoints} pts)</span>
                        <span>-{formatRsPrice(pointsDiscount)}</span>
                      </div>
                    )}

                    {giftApplied > 0 && (
                      <div className="order-total-row is-discount">
                        <span>Gift card</span>
                        <span>-{formatRsPrice(giftApplied)}</span>
                      </div>
                    )}

                    {totalDiscount > 0 && discountRowCount > 1 && (
                      <div className="order-total-row is-discount">
                        <span>Total discount</span>
                        <span>-{formatRsPrice(totalDiscount)}</span>
                      </div>
                    )}

                    <div className="order-total-row is-step">
                      <span>Amount after discount</span>
                      <span>
                        {formatRsPrice(
                          Math.max(
                            0,
                            orderAmount -
                              productDiscount -
                              promoDiscount -
                              pointsDiscount -
                              giftApplied,
                          ),
                        )}
                      </span>
                    </div>

                    <div className="order-total-row">
                      <span className="text-secondary">Delivery charges</span>
                      <span>
                        {deliveryCharges > 0
                          ? `+ ${formatRsPrice(deliveryCharges)}`
                          : "Free"}
                      </span>
                    </div>

                    <div className="order-total-row">
                      <span className="text-secondary">POS charges</span>
                      <span>
                        {posCharges > 0
                          ? `+ ${formatRsPrice(posCharges)}`
                          : formatRsPrice(0)}
                      </span>
                    </div>

                    <div className="order-total-row is-grand">
                      <span>Total payable</span>
                      <span>{formatRsPrice(displayNetAmount)}</span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="summary-savings">
                        You save {formatRsPrice(totalDiscount)} on this order
                      </div>
                    )}
                  </div>

                  <p className="summary-formula-note">
                    Items total − discount + delivery + POS = total payable
                  </p>

                  <div className="order-promo">
                    <label
                      htmlFor="order-promo-code"
                      className="caption1 text-secondary"
                    >
                      Promo Code
                    </label>

                    {isPromoApplied ? (
                      <>
                        <div className="order-promo-applied">
                          <div className="min-w-0">
                            <span className="order-promo-applied-code">
                              <Icon.CheckCircle size={16} weight="fill" />
                              {promoCode || "Promo code"}
                            </span>
                            <p className="caption2 text-secondary mt-1">
                              {promoDiscount > 0
                                ? `You saved ${formatRsPrice(promoDiscount)} on this order.`
                                : "Promo code applied to this order."}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="order-promo-btn is-remove"
                            onClick={() => void handleCancelPromo()}
                            disabled={applyingPromo || cancellingPromo}
                          >
                            {cancellingPromo ? "Removing..." : "Remove"}
                          </button>
                        </div>
                        {promoError ? (
                          <p className="order-promo-error">
                            <Icon.WarningCircle size={14} weight="fill" />
                            {promoError}
                          </p>
                        ) : (
                          <p className="caption2 text-secondary mt-2">
                            Remove this code to try a different one.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="order-promo-row">
                          <input
                            id="order-promo-code"
                            type="text"
                            className={`order-promo-input ${promoError ? "has-error" : ""}`}
                            placeholder="Enter promo code"
                            autoComplete="off"
                            value={promoInput}
                            onChange={(e) => {
                              setPromoInput(e.target.value);
                              if (promoError) setPromoError("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              void handleApplyPromo();
                            }}
                            disabled={applyingPromo || cancellingPromo}
                          />
                          <button
                            type="button"
                            className="button-main bg-black order-promo-btn"
                            onClick={() => void handleApplyPromo()}
                            disabled={
                              applyingPromo ||
                              cancellingPromo ||
                              !promoInput.trim()
                            }
                          >
                            {applyingPromo ? "Applying..." : "Apply"}
                          </button>
                        </div>
                        {promoError ? (
                          <p className="order-promo-error">
                            <Icon.WarningCircle size={14} weight="fill" />
                            {promoError}
                          </p>
                        ) : (
                          <p className="caption2 text-secondary mt-2">
                            Enter a valid promo code. Invalid codes will be
                            rejected.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {usableGiftCards.length > 0 && (
                    <div className="order-promo">
                      <div className="caption1 text-secondary">Gift cards</div>
                      <ul className="mt-2 space-y-3">
                        {usableGiftCards.map((card) => {
                          const max = maxCardAmount({ balance: card.balance, applied: card.appliedToOrder, payable: displayNetAmount });
                          return (
                            <li key={card.giftCardId} className="rounded-lg border border-line p-3">
                              <div className="flex justify-between gap-2 caption1">
                                <span>{card.maskedCode}</span>
                                <strong>{formatRsPrice(card.balance)} left</strong>
                              </div>
                              {card.appliedToOrder > 0 ? (
                                <div className="order-promo-applied mt-2">
                                  <div className="min-w-0">
                                    <span className="order-promo-applied-code">
                                      <Icon.CheckCircle size={16} weight="fill" />
                                      {formatRsPrice(card.appliedToOrder)} used
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="order-promo-btn is-remove"
                                    onClick={() => void handleRemoveGiftCard(card)}
                                    disabled={giftLocked}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ) : (
                                <div className="order-promo-row mt-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    inputMode="decimal"
                                    className={`order-promo-input ${giftError ? "has-error" : ""}`}
                                    aria-label={`Amount to use from gift card ${card.maskedCode}`}
                                    placeholder={max > 0 ? `Up to ${max}` : "Cannot be used"}
                                    value={giftInputs[card.giftCardId] ?? ""}
                                    disabled={giftLocked || max <= 0}
                                    onChange={(e) => {
                                      setGiftInputs((current) => ({ ...current, [card.giftCardId]: e.target.value }));
                                      if (giftError) setGiftError("");
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key !== "Enter") return;
                                      e.preventDefault();
                                      void handleUseGiftCard(card);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="button-main bg-black order-promo-btn"
                                    onClick={() => void handleUseGiftCard(card)}
                                    disabled={giftLocked || max <= 0 || !(giftInputs[card.giftCardId] ?? "").trim()}
                                  >
                                    {giftBusyId === card.giftCardId ? "Applying..." : "Use"}
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {giftError && (
                        <p className="order-promo-error">
                          <Icon.WarningCircle size={14} weight="fill" />
                          {giftError}
                        </p>
                      )}
                    </div>
                  )}

                  {pointsAllowed && (pointsBalance > 0 || burnPoints > 0) && (
                    <div className="order-promo">
                      <label htmlFor="order-points" className="caption1 text-secondary">
                        Reward points
                      </label>
                      <p className="caption2 text-secondary mt-1">
                        You have <strong>{pointsBalance}</strong> points
                        {pointsBalance > 0 ? ` (worth ${formatRsPrice(pointsValue(pointsBalance, pointRate))})` : ""}.
                        Each point is worth {formatRsPrice(pointRate)}.
                      </p>

                      {burnPoints > 0 ? (
                        <div className="order-promo-applied mt-2">
                          <div className="min-w-0">
                            <span className="order-promo-applied-code">
                              <Icon.CheckCircle size={16} weight="fill" />
                              {burnPoints} points used
                            </span>
                            <p className="caption2 text-secondary mt-1">
                              You saved {formatRsPrice(pointsDiscount)} with reward points.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="order-promo-btn is-remove"
                            onClick={() => void handleApplyPoints(0)}
                            disabled={pointsLocked}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="order-promo-row mt-2">
                          <input
                            id="order-points"
                            type="number"
                            min={0}
                            inputMode="numeric"
                            className={`order-promo-input ${pointsError ? "has-error" : ""}`}
                            placeholder={pointsMax > 0 ? `Up to ${pointsMax} points` : "No points can be used"}
                            value={pointsInput}
                            disabled={pointsLocked || pointsMax <= 0}
                            onChange={(e) => {
                              setPointsInput(e.target.value);
                              if (pointsError) setPointsError("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              void handleApplyPoints();
                            }}
                          />
                          <button
                            type="button"
                            className="button-main bg-black order-promo-btn"
                            onClick={() => void handleApplyPoints()}
                            disabled={pointsLocked || pointsMax <= 0 || !pointsInput.trim()}
                          >
                            {applyingPoints ? "Applying..." : "Use"}
                          </button>
                        </div>
                      )}
                      {pointsError && (
                        <p className="order-promo-error">
                          <Icon.WarningCircle size={14} weight="fill" />
                          {pointsError}
                        </p>
                      )}
                    </div>
                  )}

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
                      disabled={paying || !canPay || Boolean(alreadyPaidDetails)}
                      className="button-main bg-black w-full"
                    >
                      {paying
                        ? checkingPaymentStatus
                          ? "Verifying payment..."
                          : isCodSelected
                            ? "Confirming Order..."
                            : "Processing Payment..."
                        : alreadyPaidDetails
                          ? "Payment Already Completed"
                          : isCodSelected
                            ? "Confirm Order (Cash on Delivery)"
                            : "Proceed to Payment"}
                    </button>
                  </div>

                  <div className="order-actions order-actions-full mt-4">
                    <button
                      type="button"
                      onClick={() => void handleBuyAgain()}
                      disabled={reordering || isCancelled || items.length === 0}
                      className="order-action-btn"
                    >
                      {reordering ? "Adding to cart..." : "Buy Again"}
                    </button>
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

      {alreadyPaidDetails && (
        <div
          className="order-cancel-modal open"
          onClick={() => setAlreadyPaidDetails(null)}
          role="presentation"
        >
          <div
            className="order-cancel-modal-main open"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-already-paid-title"
          >
            <button
              type="button"
              className="order-cancel-modal-close"
              onClick={() => setAlreadyPaidDetails(null)}
              aria-label="Close"
            >
              <Icon.X size={18} />
            </button>

            <div className="order-cancel-modal-icon is-success">
              <Icon.CheckCircle size={28} weight="fill" />
            </div>

            <h2 id="order-already-paid-title" className="heading5 text-center">
              Payment already completed
            </h2>
            <p className="caption1 text-secondary text-center mt-3">
              This order has already been paid, so you cannot pay for it again.
            </p>
            {displayOrder?.OrderNumber && (
              <p className="caption1 text-secondary text-center mt-2">
                Order <strong>{displayOrder.OrderNumber}</strong>
              </p>
            )}
            {alreadyPaidDetails.gatewayResponse && (
              <p className="caption2 text-secondary text-center mt-2">
                Gateway status: {alreadyPaidDetails.gatewayResponse}
              </p>
            )}

            <div className="order-cancel-modal-actions">
              <button
                type="button"
                className="order-action-btn is-ghost"
                onClick={() => setAlreadyPaidDetails(null)}
              >
                Close
              </button>
              <Link href="/my-account" className="order-action-btn">
                View My Orders
              </Link>
            </div>
          </div>
        </div>
      )}

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
