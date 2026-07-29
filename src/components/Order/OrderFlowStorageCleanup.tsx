"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearPendingPaymentOrderId,
  getPendingPaymentOrderId,
  getPendingPaymentTransactionId,
} from "@/lib/order";

/**
 * Drops stale pending_payment_* keys when the user leaves the order/payment
 * flow (browser back, home, checkout, etc.). Keeps them on /order/* and
 * PaymentResponse so Stripe return can still resolve the order.
 */
export default function OrderFlowStorageCleanup() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const keepPending =
      pathname.startsWith("/order/") ||
      pathname.startsWith("/PaymentResponse");

    if (keepPending) return;

    if (getPendingPaymentOrderId() || getPendingPaymentTransactionId()) {
      clearPendingPaymentOrderId();
    }
  }, [pathname]);

  return null;
}
