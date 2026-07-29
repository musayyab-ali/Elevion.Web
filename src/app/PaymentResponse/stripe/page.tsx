"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import {
  clearPendingPaymentOrderId,
  confirmStripePayment,
  fetchCustomerOrderDetails,
  getPendingPaymentOrderId,
  getPendingPaymentTransactionId,
  OrderDetailData,
  StripePaymentConfirmResult,
} from "@/lib/order";
import { formatRsPrice } from "@/lib/cart";
import { getApiErrorMessage } from "@/lib/api";

function buildSuccessResult(
  sessionId: string,
  orderId: number | null,
  orderDetails: OrderDetailData | null,
  confirmResult: StripePaymentConfirmResult | null,
): StripePaymentConfirmResult {
  const savedTransactionId = getPendingPaymentTransactionId();

  return {
    message:
      confirmResult?.message ??
      "Your payment was successful and your order is confirmed.",
    orderId: orderId ?? orderDetails?.OrderId ?? null,
    orderNumber:
      confirmResult?.orderNumber ?? orderDetails?.OrderNumber ?? null,
    paymentStatus:
      confirmResult?.paymentStatus ??
      orderDetails?.PaymentStatusDisplayName ??
      "Paid",
    transactionId:
      confirmResult?.transactionId ||
      savedTransactionId ||
      sessionId,
    isSuccess: true,
  };
}

const StripePaymentResponseContent = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StripePaymentConfirmResult | null>(null);
  const [order, setOrder] = useState<OrderDetailData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const confirmPayment = async () => {
      if (!sessionId) {
        setError("Payment session ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const pendingOrderId = getPendingPaymentOrderId();
        const confirmResult = await confirmStripePayment(sessionId);
        const orderId =
          confirmResult?.orderId ?? pendingOrderId ?? null;

        let orderDetails: OrderDetailData | null = null;
        if (orderId) {
          try {
            orderDetails = await fetchCustomerOrderDetails(orderId);
          } catch {
            // Order fetch can fail briefly after payment — still show success.
          }
        }

        if (cancelled) return;

        setOrder(orderDetails);
        setResult(
          buildSuccessResult(sessionId, orderId, orderDetails, confirmResult),
        );
        clearPendingPaymentOrderId();
      } catch (err) {
        if (!cancelled) {
          const pendingOrderId = getPendingPaymentOrderId();
          if (pendingOrderId || sessionId.startsWith("cs_")) {
            let orderDetails: OrderDetailData | null = null;
            if (pendingOrderId) {
              try {
                orderDetails = await fetchCustomerOrderDetails(pendingOrderId);
              } catch {
                // ignore
              }
            }

            setOrder(orderDetails);
            setResult(
              buildSuccessResult(
                sessionId,
                pendingOrderId,
                orderDetails,
                null,
              ),
            );
            clearPendingPaymentOrderId();
            return;
          }

          setError(
            getApiErrorMessage(err, "Failed to confirm your payment."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void confirmPayment();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const resolvedOrderId = result?.orderId ?? order?.OrderId ?? null;
  const isSuccess = Boolean(result?.isSuccess);

  return (
    <div className="md:py-16 py-10">
      <div className="container max-w-3xl">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface mb-4 animate-pulse">
              <Icon.CircleNotch size={28} className="animate-spin" />
            </div>
            <div className="heading5">Confirming your payment...</div>
            <p className="body2 text-secondary mt-2">
              Please wait while we load your order confirmation.
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16 px-6 rounded-3xl border border-line bg-surface">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red mb-4">
              <Icon.WarningCircle size={32} />
            </div>
            <div className="heading4">Payment Confirmation Failed</div>
            <p className="body1 text-secondary mt-3">{error}</p>
            {resolvedOrderId && (
              <Link
                href={`/order/${resolvedOrderId}`}
                className="button-main inline-block mt-6"
              >
                View Order
              </Link>
            )}
            <Link
              href="/"
              className="block mt-4 text-button hover:underline"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-white overflow-hidden">
            <div
              className={`px-6 md:px-8 py-10 text-center ${isSuccess ? "bg-green-50" : "bg-surface"}`}
            >
              <div
                className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 ${isSuccess ? "bg-green text-white" : "bg-black text-white"}`}
              >
                {isSuccess ? (
                  <Icon.CheckCircle size={42} weight="fill" />
                ) : (
                  <Icon.CreditCard size={36} />
                )}
              </div>
              <h1 className="heading3">
                {isSuccess ? "Payment Successful!" : "Payment Received"}
              </h1>
              <p className="body1 text-secondary mt-3 max-w-xl mx-auto">
                {result?.message ||
                  "Your payment has been processed and your order is being confirmed."}
              </p>
            </div>

            <div className="px-6 md:px-8 py-8 space-y-4">
              {(result?.orderNumber || order?.OrderNumber) && (
                <div className="flex justify-between items-center py-3 border-b border-line">
                  <span className="caption1 text-secondary">Order Number</span>
                  <span className="text-button font-semibold">
                    {result?.orderNumber || order?.OrderNumber}
                  </span>
                </div>
              )}

              {resolvedOrderId && (
                <div className="flex justify-between items-center py-3 border-b border-line">
                  <span className="caption1 text-secondary">Order ID</span>
                  <span className="text-button font-semibold">
                    {resolvedOrderId}
                  </span>
                </div>
              )}

              {(result?.paymentStatus || order?.PaymentStatusDisplayName) && (
                <div className="flex justify-between items-center py-3 border-b border-line">
                  <span className="caption1 text-secondary">Payment Status</span>
                  <span className="caption2 bg-green-50 text-green-700 px-3 py-1 rounded-full">
                    {result?.paymentStatus || order?.PaymentStatusDisplayName}
                  </span>
                </div>
              )}

              {order?.NetAmount != null && (
                <div className="flex justify-between items-center py-3 border-b border-line">
                  <span className="caption1 text-secondary">Amount Paid</span>
                  <span className="heading6">
                    {formatRsPrice(order.NetAmount)}
                  </span>
                </div>
              )}

              {sessionId && (
                <div className="py-3">
                  <span className="caption1 text-secondary block mb-1">
                    Transaction Reference
                  </span>
                  <span className="caption2 break-all text-secondary">
                    {result?.transactionId || sessionId}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 md:px-8 pb-8 flex flex-col sm:flex-row gap-3">
              {resolvedOrderId && (
                <Link
                  href={`/order/${resolvedOrderId}`}
                  className="button-main text-center flex-1"
                >
                  View Order Details
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
        )}
      </div>
    </div>
  );
};

const StripePaymentResponsePage = () => {
  return (
    <>
      <TopNavOne
        props="style-one bg-black"
        slogan="New customers save 10% with the code GET10"
      />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
      </div>

      <Suspense
        fallback={
          <div className="container text-center py-20 text-secondary">
            Loading payment confirmation...
          </div>
        }
      >
        <StripePaymentResponseContent />
      </Suspense>

      <Footer />
    </>
  );
};

export default StripePaymentResponsePage;
