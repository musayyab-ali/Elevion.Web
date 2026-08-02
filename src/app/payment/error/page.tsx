"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import {
  fetchCustomerOrderDetails,
  getPendingPaymentOrderId,
  getPendingPaymentTransactionId,
  OrderDetailData,
} from "@/lib/order";
import { formatRsPrice } from "@/lib/cart";

const PaymentErrorContent = () => {
  const searchParams = useSearchParams();

  const orderIdParam = Number(searchParams.get("orderId"));
  const orderNumberParam = searchParams.get("orderNumber")?.trim() || "";
  const messageParam = searchParams.get("message")?.trim() || "";
  const codeParam = searchParams.get("code")?.trim() || "";
  const transactionParam = searchParams.get("transactionId")?.trim() || "";

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackOrderId, setFallbackOrderId] = useState<number | null>(null);
  const [fallbackTransactionId, setFallbackTransactionId] = useState("");

  const resolvedOrderId =
    Number.isFinite(orderIdParam) && orderIdParam > 0 ? orderIdParam : null;

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      // The pending payment id stays in storage: this order still needs paying.
      const pendingOrderId = getPendingPaymentOrderId();
      const orderId = resolvedOrderId ?? pendingOrderId;

      if (!cancelled) {
        setFallbackOrderId(pendingOrderId);
        setFallbackTransactionId(getPendingPaymentTransactionId() ?? "");
      }

      if (!orderId) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const details = await fetchCustomerOrderDetails(orderId);
        if (!cancelled) setOrder(details);
      } catch {
        // Order lookup is optional on this screen.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [resolvedOrderId]);

  const orderId = order?.OrderId ?? resolvedOrderId ?? fallbackOrderId;
  const orderNumber = order?.OrderNumber || orderNumberParam;
  const transactionId = transactionParam || fallbackTransactionId;
  const errorMessage =
    messageParam ||
    "Your payment could not be completed. No amount has been charged for this attempt.";

  return (
    <div className="md:py-16 py-10 px-4 sm:px-6">
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-3xl border border-line bg-white overflow-hidden">
          <div className="px-6 md:px-8 py-10 text-center bg-red-50">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 bg-red text-white">
              <Icon.XCircle size={42} weight="fill" />
            </div>
            <h1 className="heading3">Payment Failed</h1>
            <p className="body1 text-secondary mt-3 max-w-xl mx-auto">
              {errorMessage}
            </p>
            <p className="caption1 text-secondary mt-2">
              Your order is still saved. You can go back and try paying again.
            </p>
          </div>

          <div className="px-6 md:px-8 py-8 space-y-4">
            {orderNumber && (
              <div className="flex justify-between items-center py-3 border-b border-line">
                <span className="caption1 text-secondary">Order Number</span>
                <span className="text-button font-semibold">{orderNumber}</span>
              </div>
            )}

            {orderId && (
              <div className="flex justify-between items-center py-3 border-b border-line">
                <span className="caption1 text-secondary">Order ID</span>
                <span className="text-button font-semibold">{orderId}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-3 border-b border-line">
              <span className="caption1 text-secondary">Payment Status</span>
              <span className="caption2 bg-red-50 text-red px-3 py-1 rounded-full">
                {order?.PaymentStatusDisplayName || "Unpaid"}
              </span>
            </div>

            {codeParam && (
              <div className="flex justify-between items-center py-3 border-b border-line">
                <span className="caption1 text-secondary">Error Code</span>
                <span className="text-button font-semibold">{codeParam}</span>
              </div>
            )}

            {order?.NetAmount != null && (
              <div className="flex justify-between items-center py-3 border-b border-line">
                <span className="caption1 text-secondary">Amount Due</span>
                <span className="heading6">
                  {formatRsPrice(order.NetAmount)}
                </span>
              </div>
            )}

            {transactionId && (
              <div className="py-3">
                <span className="caption1 text-secondary block mb-1">
                  Transaction Reference
                </span>
                <span className="caption2 break-all text-secondary">
                  {transactionId}
                </span>
              </div>
            )}

            {loading && !order && (
              <p className="caption2 text-secondary text-center">
                Loading your order details...
              </p>
            )}
          </div>

          <div className="px-6 md:px-8 pb-8 flex flex-col sm:flex-row gap-3">
            {orderId ? (
              <Link
                href={`/order/${orderId}?pay=1`}
                className="button-main text-center flex-1"
              >
                Back to Order & Pay Again
              </Link>
            ) : (
              <Link href="/my-account" className="button-main text-center flex-1">
                Go to My Orders
              </Link>
            )}
            <Link
              href="/"
              className="px-6 py-3 rounded-full border border-line text-center hover:border-black transition-colors flex-1"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentErrorPage = () => {
  return (
    <>
      <TopNavOne />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
      </div>

      <Suspense
        fallback={
          <div className="container text-center py-20 text-secondary">
            Loading payment status...
          </div>
        }
      >
        <PaymentErrorContent />
      </Suspense>

      <Footer />
    </>
  );
};

export default PaymentErrorPage;
