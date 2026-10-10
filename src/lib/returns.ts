import api from "@/lib/api";
import { camelize, rewardsErrorMessage } from "@/lib/rewards";

/**
 * Customer returns (RMA): ask to send back items of a delivered order and follow the request.
 * The API answers in PascalCase inside { Message, StatusCode, Data }; this file hands out camelCase shapes.
 */

export interface ReturnableItem {
  orderProductId: number;
  productId: number;
  productName: string | null;
  ordered: number;
  alreadyRequested: number;
  returnable: number;
  unitAmount: number;
}

export interface ReturnableOrder {
  orderId: number;
  orderNumber: string | null;
  canReturn: boolean;
  reason: string | null;
  returnByDate: string | null;
  items: ReturnableItem[];
  reasons: { code: number; name: string }[];
}

export interface ReturnItem {
  orderProductId: number;
  productName: string | null;
  quantity: number;
  unitAmount: number;
}

export interface ReturnEvent {
  status: number;
  statusName: string;
  note: string | null;
  createdOn: string;
}

export interface ReturnRequestDto {
  returnId: number;
  reference: string;
  orderId: number;
  orderNumber: string | null;
  status: number;
  statusName: string;
  resolution: number;
  resolutionName: string;
  reasonCode: number;
  reasonName: string;
  comments: string | null;
  refundAmount: number;
  createdOn: string;
  decidedOn: string | null;
  decisionNote: string | null;
  receivedOn: string | null;
  completedOn: string | null;
  canCancel: boolean;
  items: ReturnItem[];
  timeline: ReturnEvent[];
}

export const RESOLUTIONS = [
  { value: 1, label: "Refund", hint: "Get your money back" },
  { value: 2, label: "Replacement", hint: "Get the same item again" },
  { value: 3, label: "Store credit", hint: "Get a gift card with the value" },
] as const;

export interface CreateReturnPayload {
  orderId: number;
  reasonCode: number;
  resolution: number;
  comments?: string;
  items: { orderProductId: number; quantity: number }[];
}

type Envelope = { Data?: unknown; Message?: string };

export async function fetchReturnableOrder(orderId: number): Promise<ReturnableOrder> {
  const res = await api.get("/api/v1/CustomerReturns/GetReturnableOrder", { params: { orderId } });
  return camelize<ReturnableOrder>((res.data as Envelope)?.Data);
}

export async function createReturn(payload: CreateReturnPayload): Promise<ReturnRequestDto> {
  const res = await api.post("/api/v1/CustomerReturns/CreateReturn", {
    OrderId: payload.orderId,
    ReasonCode: payload.reasonCode,
    Resolution: payload.resolution,
    Comments: payload.comments?.trim() || null,
    Items: payload.items.map((i) => ({ OrderProductId: i.orderProductId, Quantity: i.quantity })),
  });
  return camelize<ReturnRequestDto>((res.data as Envelope)?.Data);
}

export async function fetchMyReturns(): Promise<ReturnRequestDto[]> {
  const res = await api.get("/api/v1/CustomerReturns/GetMyReturns");
  return camelize<ReturnRequestDto[]>((res.data as Envelope)?.Data ?? []);
}

export async function cancelReturn(returnId: number): Promise<ReturnRequestDto> {
  const res = await api.post("/api/v1/CustomerReturns/CancelReturn", null, { params: { returnId } });
  return camelize<ReturnRequestDto>((res.data as Envelope)?.Data);
}

export const returnsErrorMessage = rewardsErrorMessage;
