import api from "@/lib/api";

export type OrderTrackingStage = {
  WorkflowStatusId: number;
  StatusCode: string;
  StatusName: string;
  StageOrder: number;
  IsTerminal: boolean;
};

export type OrderTrackingHistoryItem = {
  ToStatusId: number;
  ToStatusName: string;
  ChangedByUserName: string;
  ChangedByRole: string;
  Remarks: string;
  ChangedOn: string;
};

export type OrderTrackingData = {
  OrderId: number;
  OrderNumber: string | null;
  CurrentStatusId: number;
  Pipeline: OrderTrackingStage[];
  History: OrderTrackingHistoryItem[];
  AllowedTransitions: unknown;
};

interface OrderTrackingResponse {
  Data?: OrderTrackingData | null;
  Message?: string;
  Type?: string;
  HttpStatusCode?: number;
  StatusCode?: number;
}

/**
 * GET /api/v1/OrderTracking/track-order?orderId=
 */
export async function fetchOrderTracking(
  orderId: number,
): Promise<OrderTrackingData> {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("A valid order is required to load tracking.");
  }

  const response = await api.get<OrderTrackingResponse>(
    "/api/v1/OrderTracking/track-order",
    { params: { orderId: id } },
  );

  const body = response.data;
  const type = String(body?.Type ?? "").toLowerCase();
  const status = Number(body?.HttpStatusCode ?? body?.StatusCode ?? 200);
  const message = String(body?.Message ?? "").trim();

  if (type === "error" || type === "exception" || status >= 400) {
    throw new Error(message || "Failed to load order tracking.");
  }

  if (!body?.Data) {
    throw new Error(message || "Order tracking data was not found.");
  }

  const pipeline = Array.isArray(body.Data.Pipeline)
    ? [...body.Data.Pipeline].sort(
        (a, b) => (Number(a.StageOrder) || 0) - (Number(b.StageOrder) || 0),
      )
    : [];

  const history = Array.isArray(body.Data.History)
    ? [...body.Data.History].sort(
        (a, b) =>
          new Date(a.ChangedOn).getTime() - new Date(b.ChangedOn).getTime(),
      )
    : [];

  return {
    ...body.Data,
    Pipeline: pipeline,
    History: history,
  };
}

export function formatTrackingDate(value?: string | null): string {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

export function formatTrackingDateTime(value?: string | null): string {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

export function getHistoryForStatus(
  history: OrderTrackingHistoryItem[],
  statusId: number,
): OrderTrackingHistoryItem | undefined {
  return [...history]
    .reverse()
    .find((item) => Number(item.ToStatusId) === Number(statusId));
}
