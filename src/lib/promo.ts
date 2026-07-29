import api, { getApiErrorMessage } from "@/lib/api";

const PENDING_PROMO_KEY = "pending_promo_code";
const ORDER_CAMPAIGN_KEY = "order_promo_campaign_id";

export type PromoApplyResult = {
  success: boolean;
  message: string;
  totalDiscount: number | null;
  campaignId: number | null;
  code: string;
  rawData: unknown;
};

export type PromoCancelResult = {
  success: boolean;
  message: string;
};

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function parsePositiveId(value: unknown): number | null {
  const parsed = parseNonNegativeNumber(value);
  if (parsed == null || parsed <= 0) return null;
  return parsed;
}

/** Parse discount amount from PromoCode API Data when backend returns it. */
export function extractPromoDiscount(data: unknown): number | null {
  if (data == null) return null;
  if (typeof data === "number") return parseNonNegativeNumber(data);
  if (typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  for (const key of [
    "TotalDiscount",
    "totalDiscount",
    "Discount",
    "discount",
    "NetDiscount",
    "netDiscount",
    "Amount",
    "amount",
  ]) {
    const value = parseNonNegativeNumber(record[key]);
    if (value != null) return value;
  }

  return null;
}

export function extractCampaignId(data: unknown): number | null {
  if (data == null) return null;
  if (typeof data === "number") return parsePositiveId(data);
  if (typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  for (const key of [
    "CampaignId",
    "campaignId",
    "AppliedCampaignId",
    "PromoCampaignId",
    "Id",
    "id",
  ]) {
    const value = parsePositiveId(record[key]);
    if (value) return value;
  }

  for (const nestedKey of ["Data", "data", "Campaign", "campaign"]) {
    if (record[nestedKey] != null) {
      const nested = extractCampaignId(record[nestedKey]);
      if (nested) return nested;
    }
  }

  return null;
}

/** Resolve campaign id from order / payment payload shapes. */
export function extractCampaignIdFromOrder(source: unknown): number | null {
  if (!source || typeof source !== "object") return null;

  const root = source as Record<string, unknown>;
  const direct = extractCampaignId(root);
  if (direct) return direct;

  const orderDto =
    root.OrderDto && typeof root.OrderDto === "object"
      ? (root.OrderDto as Record<string, unknown>)
      : null;
  if (orderDto) {
    const fromDto = extractCampaignId(orderDto);
    if (fromDto) return fromDto;
  }

  const lists = [
    root.PaymentMethodCampaignList,
    orderDto?.PaymentMethodCampaignList,
    root.OrderCampaignList,
    orderDto?.OrderCampaignList,
    root.CampaignList,
  ];

  for (const list of lists) {
    if (!Array.isArray(list) || list.length === 0) continue;
    for (const item of list) {
      const id = extractCampaignId(item);
      if (id) return id;
    }
  }

  const items =
    (orderDto?.OrderDetails as Record<string, unknown> | undefined)
      ?.OrderItemList ??
    (root.OrderDetails as Record<string, unknown> | undefined)?.OrderItemList;

  if (Array.isArray(items)) {
    for (const item of items) {
      const id = extractCampaignId(item);
      if (id) return id;
    }
  }

  return null;
}

export function savePendingPromoCode(code: string): void {
  if (typeof window === "undefined") return;
  const trimmed = code.trim();
  if (!trimmed) {
    localStorage.removeItem(PENDING_PROMO_KEY);
    return;
  }
  localStorage.setItem(PENDING_PROMO_KEY, trimmed);
}

export function getPendingPromoCode(): string | null {
  if (typeof window === "undefined") return null;
  const code = localStorage.getItem(PENDING_PROMO_KEY)?.trim();
  return code || null;
}

export function clearPendingPromoCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_PROMO_KEY);
}

export function saveOrderCampaignId(orderId: number, campaignId: number): void {
  if (typeof window === "undefined" || !orderId || !campaignId) return;
  sessionStorage.setItem(`${ORDER_CAMPAIGN_KEY}_${orderId}`, String(campaignId));
}

export function getOrderCampaignId(orderId: number): number | null {
  if (typeof window === "undefined" || !orderId) return null;
  return parsePositiveId(
    sessionStorage.getItem(`${ORDER_CAMPAIGN_KEY}_${orderId}`),
  );
}

export function clearOrderCampaignId(orderId: number): void {
  if (typeof window === "undefined" || !orderId) return;
  sessionStorage.removeItem(`${ORDER_CAMPAIGN_KEY}_${orderId}`);
}

type ApiEnvelope = {
  Data?: unknown;
  Message?: string;
  message?: string;
  Type?: string;
  HttpStatusCode?: number;
  StatusCode?: number;
  ExceptionType?: string;
};

function readEnvelope(payload: unknown): ApiEnvelope {
  if (!payload || typeof payload !== "object") return {};
  return payload as ApiEnvelope;
}

function getEnvelopeMessage(body: ApiEnvelope): string {
  return String(body.Message ?? body.message ?? "").trim();
}

/** Detect invalid/failed promo messages even when HTTP status is 200. */
function isPromoFailureMessage(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower) return false;

  return (
    lower.includes("doesn't match") ||
    lower.includes("does not match") ||
    lower.includes("don't match") ||
    lower.includes("do not match") ||
    lower.includes("oops") ||
    lower.includes("invalid") ||
    lower.includes("not found") ||
    lower.includes("incorrect") ||
    lower.includes("expired") ||
    lower.includes("not valid") ||
    lower.includes("cannot be applied") ||
    lower.includes("can't be applied") ||
    lower.includes("unable to apply") ||
    lower.includes("failed") ||
    lower.includes("unavailable") ||
    lower.includes("not eligible") ||
    lower.includes("not applicable") ||
    lower.includes("already used") ||
    lower.includes("no longer")
  );
}

/**
 * Promo APIs sometimes return HTTP 200 with only { Message: "Oops! ..." }.
 * Treat as success only with an explicit success Type / applied message.
 */
function isPromoSuccessEnvelope(body: ApiEnvelope): boolean {
  const type = String(body.Type || "").toLowerCase();
  const status = Number(body.HttpStatusCode ?? body.StatusCode ?? 0);
  const message = getEnvelopeMessage(body);
  const lowerMsg = message.toLowerCase();

  if (isPromoFailureMessage(message)) return false;
  if (type === "error" || type === "exception" || body.ExceptionType) {
    return false;
  }
  if (status >= 400) return false;

  if (type === "success" || type === "ok") return true;

  if (
    status === 200 &&
    (lowerMsg.includes("applied") ||
      lowerMsg.includes("removed") ||
      lowerMsg.includes("cancelled") ||
      lowerMsg.includes("canceled"))
  ) {
    return true;
  }

  return false;
}

/** Professional user-facing message for promo apply/cancel failures. */
export function getPromoErrorMessage(
  error: unknown,
  fallback = "We couldn't process this promo code. Please try again.",
): string {
  let apiMessage = "";

  if (error instanceof Error && error.message.trim()) {
    apiMessage = error.message.trim();
  } else {
    apiMessage = getApiErrorMessage(error, "").trim();
  }

  const lower = apiMessage.toLowerCase();

  if (
    !apiMessage ||
    lower === "validation failed" ||
    lower === "failed to apply promo code." ||
    lower === "failed to cancel promo code."
  ) {
    return fallback;
  }

  // Prefer the API's own wording for mismatch / invalid codes.
  if (isPromoFailureMessage(apiMessage)) {
    return apiMessage.endsWith(".") ? apiMessage : `${apiMessage}.`;
  }

  if (
    lower.includes("minimum") ||
    lower.includes("order value") ||
    lower.includes("mov")
  ) {
    return apiMessage.endsWith(".") ? apiMessage : `${apiMessage}.`;
  }

  if (lower.includes("already") && lower.includes("applied")) {
    return "A promo code is already applied to this order. Remove it before applying another.";
  }

  return apiMessage.endsWith(".") ? apiMessage : `${apiMessage}.`;
}

/**
 * Apply promo after order exists.
 * API: POST /api/v1/Payment/PromoCode?Code=&OrderId=
 */
export async function applyPromoCodeToOrder(
  code: string,
  orderId: number,
): Promise<PromoApplyResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Please enter a valid promo code.");
  }
  if (!orderId || Number.isNaN(orderId)) {
    throw new Error("Order ID is required to apply a promo code.");
  }

  try {
    const response = await api.post("/api/v1/Payment/PromoCode", null, {
      params: {
        Code: trimmed,
        OrderId: orderId,
      },
    });

    // Runtime axios returns AxiosResponse; typed ApiResponse may already be unwrapped.
    const raw = response as { data?: unknown };
    const body = readEnvelope(
      raw?.data !== undefined ? raw.data : response,
    );
    const apiMessage =
      getEnvelopeMessage(body) ||
      "This promo code is invalid or cannot be applied to your order.";

    if (!isPromoSuccessEnvelope(body)) {
      throw new Error(apiMessage);
    }

    const campaignId = extractCampaignId(body.Data);
    if (campaignId) {
      saveOrderCampaignId(orderId, campaignId);
    }

    const discount = extractPromoDiscount(body.Data);
    const baseMessage = getEnvelopeMessage(body) || "Promo code applied.";
    const message =
      discount != null && discount > 0
        ? `${baseMessage} You saved ${discount.toLocaleString("en-PK")} PKR.`
        : baseMessage;

    return {
      success: true,
      message,
      totalDiscount: discount,
      campaignId,
      code: trimmed,
      rawData: body.Data ?? null,
    };
  } catch (error) {
    throw new Error(
      getPromoErrorMessage(
        error,
        "This promo code is invalid or cannot be applied to your order.",
      ),
    );
  }
}

/**
 * Cancel applied promo.
 * API: POST /api/v1/Payment/CancelPromo?OrderId=&CampaignId=
 */
export async function cancelPromoCodeFromOrder(
  orderId: number,
  campaignId: number,
): Promise<PromoCancelResult> {
  if (!orderId || Number.isNaN(orderId)) {
    throw new Error("Order ID is required to cancel a promo code.");
  }
  if (!campaignId || Number.isNaN(campaignId)) {
    throw new Error(
      "Campaign details are missing. Please refresh the page and try again.",
    );
  }

  try {
    const response = await api.post("/api/v1/Payment/CancelPromo", null, {
      params: {
        OrderId: orderId,
        CampaignId: campaignId,
      },
    });

    const raw = response as { data?: unknown };
    const body = readEnvelope(
      raw?.data !== undefined ? raw.data : response,
    );
    const apiMessage =
      getEnvelopeMessage(body) ||
      "We couldn't remove this promo code. Please try again.";

    if (!isPromoSuccessEnvelope(body)) {
      throw new Error(apiMessage);
    }

    clearOrderCampaignId(orderId);
    clearPendingPromoCode();

    return {
      success: true,
      message:
        getEnvelopeMessage(body) ||
        "Promo code removed. Your order total has been updated.",
    };
  } catch (error) {
    throw new Error(
      getPromoErrorMessage(
        error,
        "We couldn't remove this promo code. Please try again.",
      ),
    );
  }
}
