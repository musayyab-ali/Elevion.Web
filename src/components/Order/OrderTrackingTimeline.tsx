"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import {
  fetchOrderTracking,
  formatTrackingDate,
  formatTrackingDateTime,
  getHistoryForStatus,
  OrderTrackingData,
  OrderTrackingStage,
} from "@/lib/order-tracking";
import { getApiErrorMessage } from "@/lib/api";

type OrderTrackingTimelineProps = {
  orderId: number;
  orderNumber?: string | null;
  className?: string;
};

type StageState = "done" | "current" | "upcoming";

function getStageIcon(stage: OrderTrackingStage) {
  const code = String(stage.StatusCode || "").toUpperCase();

  switch (code) {
    case "PENDING":
      return Icon.ShoppingCart;
    case "VERIFIED":
      return Icon.SealCheck;
    case "PICKING":
      return Icon.MagnifyingGlass;
    case "PICKED":
      return Icon.CheckSquare;
    case "BILLING":
      return Icon.Receipt;
    case "PACKED":
      return Icon.Package;
    case "DISPATCHED":
      return Icon.Truck;
    case "DELIVERED":
      return Icon.House;
    case "COMPLETED":
      return Icon.CheckCircle;
    default:
      return Icon.CircleDashed;
  }
}

function getStageState(
  stage: OrderTrackingStage,
  currentIndex: number,
  stageIndex: number,
): StageState {
  if (currentIndex < 0) return "upcoming";
  if (stageIndex < currentIndex) return "done";
  if (stageIndex === currentIndex) return "current";
  return "upcoming";
}

const OrderTrackingTimeline = ({
  orderId,
  orderNumber,
  className = "",
}: OrderTrackingTimelineProps) => {
  const [tracking, setTracking] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setTracking(null);

      try {
        const data = await fetchOrderTracking(orderId);
        if (!cancelled) setTracking(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(err, "Unable to load order tracking right now."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const currentIndex = useMemo(() => {
    if (!tracking?.Pipeline?.length) return -1;
    return tracking.Pipeline.findIndex(
      (stage) =>
        Number(stage.WorkflowStatusId) === Number(tracking.CurrentStatusId),
    );
  }, [tracking]);

  const currentStage =
    currentIndex >= 0 ? tracking?.Pipeline[currentIndex] : null;
  const latestHistory = tracking?.History?.[tracking.History.length - 1];
  const displayOrderNumber =
    orderNumber || tracking?.OrderNumber || `Order #${orderId}`;

  if (loading) {
    return (
      <div className={`order-tracking-panel ${className}`}>
        <div className="order-tracking-loading">
          <div className="order-tracking-spinner" />
          <p>Loading order tracking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`order-tracking-panel ${className}`}>
        <div className="order-tracking-error">
          <Icon.WarningCircle size={22} weight="fill" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!tracking || tracking.Pipeline.length === 0) {
    return null;
  }

  return (
    <div className={`order-tracking-panel ${className}`}>
      <div className="order-tracking-head">
        <div className="min-w-0">
          <div className="order-tracking-eyebrow">Order Tracking</div>
          <h3 className="order-tracking-title">Track your shipment</h3>
          <p className="order-tracking-subtitle">
            {displayOrderNumber}
            {currentStage ? ` · ${currentStage.StatusName}` : ""}
          </p>
        </div>
        {latestHistory?.ChangedOn && (
          <div className="order-tracking-meta">
            <span>Last update</span>
            <strong>{formatTrackingDateTime(latestHistory.ChangedOn)}</strong>
          </div>
        )}
      </div>

      <div className="order-tracking-timeline" aria-label="Order progress">
        <div className="order-tracking-steps">
          {tracking.Pipeline.map((stage, index) => {
            const state = getStageState(stage, currentIndex, index);
            const StageIcon = getStageIcon(stage);
            const historyItem = getHistoryForStatus(
              tracking.History,
              stage.WorkflowStatusId,
            );
            // Each half-segment lives inside its own step, so the rail stays
            // glued to the dots no matter how far the row is scrolled.
            const leftFilled = currentIndex >= 0 && index <= currentIndex;
            const rightFilled = currentIndex >= 0 && index < currentIndex;

            return (
              <div
                key={stage.WorkflowStatusId}
                className={`order-tracking-step is-${state}`}
              >
                <div className="order-tracking-icon" aria-hidden>
                  <StageIcon
                    size={18}
                    weight={state === "upcoming" ? "regular" : "fill"}
                  />
                </div>
                <div className="order-tracking-node" aria-hidden>
                  <span
                    className={`order-tracking-line${leftFilled ? " is-filled" : ""}${index === 0 ? " is-hidden" : ""}`}
                  />
                  <span className="order-tracking-dot" />
                  <span
                    className={`order-tracking-line${rightFilled ? " is-filled" : ""}${index === tracking.Pipeline.length - 1 ? " is-hidden" : ""}`}
                  />
                </div>
                <div className="order-tracking-step-label">
                  {stage.StatusName}
                </div>
                <div className="order-tracking-step-date">
                  {historyItem?.ChangedOn
                    ? formatTrackingDate(historyItem.ChangedOn)
                    : state === "current"
                      ? "In progress"
                      : state === "done"
                        ? "Completed"
                        : "Upcoming"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {latestHistory && (
        <div className="order-tracking-latest">
          <div className="order-tracking-latest-icon">
            <Icon.ClockCountdown size={18} weight="fill" />
          </div>
          <div className="min-w-0">
            <div className="order-tracking-latest-title">
              {latestHistory.ToStatusName}
              {latestHistory.ChangedByRole
                ? ` · ${latestHistory.ChangedByRole}`
                : ""}
            </div>
            <p className="order-tracking-latest-text">
              {latestHistory.Remarks ||
                `Status updated by ${latestHistory.ChangedByUserName || "system"}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingTimeline;
