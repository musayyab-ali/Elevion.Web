import api from "@/lib/api";
import { clearCartShippingPref, getCartSessionId } from "@/lib/cart";
import { setAuthSessionFromResponse } from "@/lib/auth";
import { clearPendingPromoCode } from "@/lib/promo";

export interface ShippingDetailPayload {
  FullName: string;
  EmailAddress: string;
  Phone: string;
  CityId: number;
  CountryId: number;
  StateId: number;
  Address: string;
  ISOCode: string;
  City: string;
  AddressBookId: number;
  AreaId: number;
  Longitude: string;
  Latitude: string;
}

export interface BillingDetailPayload {
  EmailAddress: string;
  Phone: string;
  FullName: string;
}

export interface CreateOrderPayload {
  IsGiftOrder: boolean;
  ShippingDetail: ShippingDetailPayload;
  BillingDetail: BillingDetailPayload;
  SessionId: string;
  BranchId: number;
  DeliveryDate: string;
  ISOCode: string;
  PhoneCode: string;
  IsAddNewAddress: boolean;
  DeliveryOption: number;
  SpecialInstructions: string;
  DeliveryInstructions: string;
  OrderSource: number;
  CityId: number;
  CountryId: number;
}

export interface CreateOrderFormValues {
  fullName: string;
  email: string;
  phone: string;
  phoneCode: string;
  address: string;
  postalCode: string;
  countryId: string;
  stateId: string;
  cityId: string;
  cityName: string;
  areaId: string;
  branchId: string;
  specialInstructions: string;
  deliveryInstructions: string;
  isGiftOrder: boolean;
  deliveryOption: number;
  isoCode: string;
  deliveryDate: string;
  billingSameAsShipping: boolean;
  billingFullName: string;
  billingEmail: string;
  billingPhone: string;
  isAddNewAddress: boolean;
  addressBookId: number;
  longitude: string;
  latitude: string;
}

export interface OrderItem {
  OrderDetailId: number;
  ProductId: number;
  ProductName: string;
  ProductDetailId: number;
  Amount: number;
  DiscountAmount: number | null;
  TotalAmount: number;
  VariantName: string;
  Quantity: number;
  ProductImageURL: string | null;
}

export interface OrderShippingDetails {
  FullName: string;
  Phone: string;
  Country: string;
  City: string;
  Area: string | null;
  CityId: number;
  AreaId: number | null;
  Address: string;
  Longitude: string;
  Latitude: string;
}

export interface OrderBillingDetails {
  EmailAddress: string;
  Phone: string;
  FullName: string | null;
}

export interface OrderDetailData {
  OrderId: number;
  OrderNumber: string;
  UserId: number;
  BranchId: number;
  BranchName: string;
  OrderAmount: number;
  DeliveryCharges: number;
  /** POS / service fee from backend (e.g. Rs. 1). Included in NetAmount. */
  POSCharges?: number;
  TotalItems: number;
  ProductDetailIds: number[];
  NetAmount: number;
  Status: number;
  OrderStatusDisplayName: string;
  DeliveryDate: string;
  OrderShippingDetails: OrderShippingDetails;
  OrderBillingDetails: OrderBillingDetails;
  OrderDetails: {
    OrderItemList: OrderItem[];
  };
  IsGiftOrder: boolean;
  SpecialInstructions: string;
  DeliveryInstructions: string;
  DeliveryOption: number;
  PaymentStatusDisplayName: string;
  PaymentStatus: number;
  PaymentMethodName: string;
  CustomerFullName: string;
  PromoCode: string | null;
  NetDiscount: number;
  CampaignId?: number | null;
  AppliedCampaignId?: number | null;
}

export interface PaymentGateway {
  PGId: number;
  Name: string;
}

function normalizePaymentGateways(gateways: unknown): PaymentGateway[] {
  if (!Array.isArray(gateways)) return [];

  return gateways
    .map((gateway) => {
      const item = gateway as Record<string, unknown>;
      const pgId = Number(
        item.PGId ?? item.PgId ?? item.pgId ?? item.Value ?? 0,
      );
      const name = String(
        item.Name ?? item.DisplayName ?? item.name ?? "Payment",
      );

      return { PGId: pgId, Name: name };
    })
    .filter((gateway) => gateway.PGId > 0);
}

export interface SelectPaymentData {
  OrderDto: OrderDetailData;
  PaymentMethodCampaignList: unknown[];
  PaymentGateways: PaymentGateway[];
  RewardPointsAllowed: boolean;
}

interface ApiResponse<T> {
  Data?: T;
  Message?: string;
  Type?: string;
  HttpStatusCode?: number;
}

export type CreateOrderResponse = ApiResponse<unknown>;

function parsePositiveId(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  }
  return null;
}

export function extractOrderId(data: unknown): number | null {
  if (data == null) return null;

  const direct = parsePositiveId(data);
  if (direct) return direct;

  if (typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const fromFields = parsePositiveId(
    record.OrderId ?? record.orderId ?? record.Id ?? record.id,
  );
  if (fromFields) return fromFields;

  for (const key of ["Data", "data", "OrderDto", "orderDto", "Order", "order"]) {
    if (record[key] != null) {
      const nested = extractOrderId(record[key]);
      if (nested) return nested;
    }
  }

  return null;
}

/** API rejects null/empty for several string fields even when UI treats them as optional. */
function normalizeCreateOrderPayload(
  payload: CreateOrderPayload,
): CreateOrderPayload {
  const sessionId = payload.SessionId?.trim() || getCartSessionId();

  return {
    ...payload,
    SessionId: sessionId,
    ISOCode: payload.ISOCode?.trim() || "PK",
    PhoneCode: payload.PhoneCode?.trim() || "92",
    SpecialInstructions: payload.SpecialInstructions?.trim() || "N/A",
    DeliveryInstructions: payload.DeliveryInstructions?.trim() || "N/A",
    ShippingDetail: {
      ...payload.ShippingDetail,
      ISOCode: payload.ShippingDetail.ISOCode?.trim() || "PK",
      Longitude: payload.ShippingDetail.Longitude?.trim() || "0",
      Latitude: payload.ShippingDetail.Latitude?.trim() || "0",
      Address: payload.ShippingDetail.Address?.trim() || "N/A",
    },
  };
}

function extractLoginTokenModel(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;

  const root = data as Record<string, unknown>;
  const orderData = (root.Data ?? root) as Record<string, unknown>;
  const userInfo = orderData?.UserInfoDto;

  if (!userInfo || typeof userInfo !== "object") return null;

  const tokenModel = (userInfo as Record<string, unknown>)
    .LoginTokenResponseModel;

  if (!tokenModel || typeof tokenModel !== "object") return null;

  return tokenModel as Record<string, unknown>;
}

/** Log in a guest customer using tokens returned from order creation. */
export function applyGuestAuthFromOrderResponse(data: unknown): boolean {
  const tokenModel = extractLoginTokenModel(data);
  if (!tokenModel) return false;

  return setAuthSessionFromResponse({
    AccessToken: tokenModel.AccessToken,
    RefreshToken: tokenModel.RefreshToken,
    AccessTokenExpiresIn: tokenModel.AccessTokenExpiresIn,
    UserRole: tokenModel.UserRole,
  });
}

export function buildCreateOrderPayload(
  values: CreateOrderFormValues,
): CreateOrderPayload {
  const str = (value: unknown) => String(value ?? "").trim();
  const fullName = str(values.fullName);
  const billingFullName = values.billingSameAsShipping
    ? fullName
    : str(values.billingFullName);
  const phoneCode = str(values.phoneCode).replace(/\D/g, "") || "92";

  return {
    IsGiftOrder: values.isGiftOrder,
    ShippingDetail: {
      FullName: fullName,
      EmailAddress: str(values.email),
      Phone: str(values.phone),
      CityId: Number(values.cityId) || 0,
      CountryId: Number(values.countryId) || 0,
      StateId: Number(values.stateId) || 0,
      Address: [str(values.address), str(values.postalCode)]
        .filter(Boolean)
        .join(", "),
      ISOCode: str(values.isoCode) || "PK",
      City: str(values.cityName),
      AddressBookId: Number(values.addressBookId) || 0,
      AreaId: Number(values.areaId) || 0,
      Longitude: str(values.longitude) || "0",
      Latitude: str(values.latitude) || "0",
    },
    BillingDetail: {
      EmailAddress: values.billingSameAsShipping
        ? str(values.email)
        : str(values.billingEmail),
      Phone: values.billingSameAsShipping
        ? str(values.phone)
        : str(values.billingPhone),
      FullName: billingFullName,
    },
    SessionId: getCartSessionId(),
    BranchId: Number(values.branchId) || 0,
    DeliveryDate: values.deliveryDate
      ? new Date(values.deliveryDate).toISOString()
      : new Date().toISOString(),
    ISOCode: str(values.isoCode) || "PK",
    PhoneCode: phoneCode,
    IsAddNewAddress: values.isAddNewAddress,
    DeliveryOption: values.deliveryOption || 1,
    SpecialInstructions: str(values.specialInstructions) || "N/A",
    DeliveryInstructions: str(values.deliveryInstructions) || "N/A",
    OrderSource: 1,
    CityId: Number(values.cityId) || 0,
    CountryId: Number(values.countryId) || 0,
  };
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {
  const response = await api.post<CreateOrderResponse>(
    "/api/v1/Order/create",
    normalizeCreateOrderPayload(payload),
  );

  const body = response.data as CreateOrderResponse & {
    StatusCode?: number;
    ExceptionType?: string;
  };

  if (!body || typeof body !== "object") {
    throw new Error("Failed to create order. Empty response from server.");
  }

  const statusCode = Number(body.HttpStatusCode ?? body.StatusCode ?? 200);
  const type = String(body.Type || "").toLowerCase();
  const isErrorType =
    type === "error" ||
    type === "exception" ||
    Boolean(body.ExceptionType) ||
    statusCode >= 400;

  if (isErrorType) {
    throw new Error(body.Message || "Failed to create order.");
  }

  if (body.Data == null) {
    throw new Error(body.Message || "Failed to create order. No order data returned.");
  }

  return body;
}

export async function fetchCustomerOrderDetails(
  orderId: number,
): Promise<OrderDetailData> {
  const response = await api.get<ApiResponse<OrderDetailData>>(
    "/api/v1/Order/GetCustomerOrderDetails",
    { params: { OrderId: orderId } },
  );

  if (!response.data?.Data) {
    throw new Error("Order details not found.");
  }

  return response.data.Data;
}

export async function fetchSelectPayment(
  orderId: number,
): Promise<SelectPaymentData> {
  const response = await api.get<ApiResponse<SelectPaymentData>>(
    "/api/v1/Order/SelectPayment",
    { params: { OrderId: orderId } },
  );

  if (!response.data?.Data) {
    throw new Error("Payment options not found.");
  }

  const data = response.data.Data;

  return {
    ...data,
    PaymentGateways: normalizePaymentGateways(data.PaymentGateways),
  };
}

export async function cancelCustomerOrder(orderId: number): Promise<string> {
  const response = await api.post<ApiResponse<unknown>>(
    "/api/v1/Order/CancelCustomerOrder",
    null,
    { params: { OrderId: orderId } },
  );

  return response.data?.Message || "Order cancelled successfully.";
}

export interface PayInvoicePayload {
  OrderId: number;
  OrderAmount: number;
  TenantPaymentGatewayId: number;
  PaymentGateway: number;
  ReturnUrl?: string;
}

export function getStripePaymentReturnUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base =
    configured ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");

  return `${base.replace(/\/$/, "")}/PaymentResponse/stripe`;
}

export interface PayInvoiceData {
  Transaction: {
    PaymentPortal: string | null;
    TransactionID?: string;
    BillUrl?: string | null;
    ReturnUrl?: string | null;
  };
  IsOpenNewTab: boolean;
  PaymentGateway?: {
    Value: number;
    Name: string;
    DisplayName: string;
  };
  GatewayDescription?: string;
}

interface PayInvoiceResponse {
  Message?: string;
  StatusCode?: number;
  Data?: PayInvoiceData;
}

export async function payInvoice(
  payload: PayInvoicePayload,
): Promise<PayInvoiceData> {
  const response = await api.post<PayInvoiceResponse>(
    "/api/v1/Payment/payinvoice",
    {
      ...payload,
      ReturnUrl: payload.ReturnUrl ?? getStripePaymentReturnUrl(),
    },
  );

  const body = response.data;
  const data = (body?.Data ?? body) as PayInvoiceData | undefined;

  if (data?.Transaction) {
    return data;
  }

  throw new Error(body?.Message || "Failed to process payment invoice.");
}

export function getPaymentPortalUrl(data: PayInvoiceData): string | null {
  const portal = data.Transaction?.PaymentPortal?.trim();
  if (portal) return portal;

  const billUrl = data.Transaction?.BillUrl?.trim();
  if (billUrl) return billUrl;

  return null;
}

export const PENDING_PAYMENT_ORDER_KEY = "pending_payment_order_id";
export const PENDING_PAYMENT_TRANSACTION_KEY = "pending_payment_transaction_id";

export interface StripePaymentConfirmResult {
  message: string;
  orderId: number | null;
  orderNumber: string | null;
  paymentStatus: string | null;
  transactionId: string | null;
  isSuccess: boolean;
}

function readNestedValue(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

function parseStripeConfirmResponse(data: unknown): StripePaymentConfirmResult {
  const body = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const nested = (
    body.Data && typeof body.Data === "object"
      ? body.Data
      : body.data && typeof body.data === "object"
        ? body.data
        : body
  ) as Record<string, unknown>;

  const orderIdRaw = readNestedValue(nested, ["OrderId", "orderId"]);
  const orderId =
    typeof orderIdRaw === "number"
      ? orderIdRaw
      : typeof orderIdRaw === "string"
        ? Number(orderIdRaw) || null
        : null;

  const message = String(
    readNestedValue(body, ["Message", "message"]) ??
      readNestedValue(nested, ["Message", "message"]) ??
      "Payment processed successfully.",
  );

  const orderNumber = String(
    readNestedValue(nested, ["OrderNumber", "orderNumber"]) ?? "",
  );

  const paymentStatus = String(
    readNestedValue(nested, [
      "PaymentStatusDisplayName",
      "PaymentStatus",
      "paymentStatus",
    ]) ?? "",
  );

  const transactionId = String(
    readNestedValue(nested, [
      "TransactionID",
      "TransactionId",
      "transactionId",
    ]) ?? "",
  );

  const statusCode = Number(body.StatusCode ?? body.HttpStatusCode ?? 0);
  const type = String(body.Type ?? "").toLowerCase();
  const isSuccess =
    type === "success" ||
    statusCode === 200 ||
    message.toLowerCase().includes("success") ||
    message.toLowerCase().includes("confirmed") ||
    message.toLowerCase().includes("processed");

  return {
    message,
    orderId: orderId && !Number.isNaN(orderId) ? orderId : null,
    orderNumber: orderNumber || null,
    paymentStatus: paymentStatus || null,
    transactionId: transactionId || null,
    isSuccess,
  };
}

const STRIPE_CONFIRM_ENDPOINTS = [
  "/PaymentResponse/stripe",
  "/api/v1/Payment/PaymentResponse/stripe",
  "/api/v1/Payment/stripe-response",
];

export async function confirmStripePayment(
  sessionId: string,
): Promise<StripePaymentConfirmResult | null> {
  for (const endpoint of STRIPE_CONFIRM_ENDPOINTS) {
    try {
      const response = await api.get(endpoint, {
        params: { sessionId },
      });
      return parseStripeConfirmResponse(response.data);
    } catch {
      // Backend may not expose this as a JSON API — Stripe redirect is enough.
    }
  }

  return null;
}

export function savePendingPaymentOrderId(orderId: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_PAYMENT_ORDER_KEY, String(orderId));
}

export function savePendingPaymentTransactionId(transactionId: string): void {
  if (typeof window === "undefined") return;
  const value = transactionId.trim();
  if (!value) return;
  localStorage.setItem(PENDING_PAYMENT_TRANSACTION_KEY, value);
}

export function getPendingPaymentOrderId(): number | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getPendingPaymentTransactionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PENDING_PAYMENT_TRANSACTION_KEY);
}

export function clearPendingPaymentOrderId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_PAYMENT_ORDER_KEY);
  localStorage.removeItem(PENDING_PAYMENT_TRANSACTION_KEY);
}

/**
 * Clears checkout/payment leftovers so browser-back does not keep stale
 * pending payment / shipping / promo data after an order was created.
 */
export function clearOrderFlowStorage(options?: {
  keepPendingPromo?: boolean;
}): void {
  if (typeof window === "undefined") return;
  clearPendingPaymentOrderId();
  clearCartShippingPref();
  if (!options?.keepPendingPromo) {
    clearPendingPromoCode();
  }
  sessionStorage.removeItem("clear_cart_after_order");
}

export function getDeliveryOptionLabel(option: number): string {
  switch (option) {
    case 1:
      return "Home Delivery";
    case 2:
      return "Store Pickup";
    default:
      return "Standard Delivery";
  }
}

export function formatOrderDate(date: string): string {
  try {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return date;
  }
}
