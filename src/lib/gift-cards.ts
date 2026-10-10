import api from "@/lib/api";
import { camelize, rewardsErrorMessage } from "@/lib/rewards";

/** Customer gift cards: stored-value cards added by code and spent on orders. camelCase shapes for the pages. */

export interface GiftCardTransaction {
  type: number;
  typeName: string;
  amount: number;
  balanceAfter: number;
  orderId: number | null;
  note: string | null;
  createdOn: string;
}

export interface GiftCard {
  giftCardId: number;
  maskedCode: string;
  initialAmount: number;
  balance: number;
  statusName: string;
  isUsable: boolean;
  expiresOn: string | null;
  createdOn: string;
  /** What this card pays on the order that was asked about (0 otherwise). */
  appliedToOrder: number;
  transactions: GiftCardTransaction[];
}

export interface OrderGiftCardResult {
  orderId: number;
  giftCardId: number;
  appliedFromThisCard: number;
  appliedTotal: number;
  netAmount: number;
  cardBalance: number;
}

type Envelope = { Data?: unknown; Message?: string };

export async function fetchMyGiftCards(orderId?: number): Promise<GiftCard[]> {
  const res = await api.get("/api/v1/CustomerGiftCards/GetMyGiftCards", { params: orderId ? { orderId } : undefined });
  return camelize<GiftCard[]>((res.data as Envelope)?.Data ?? []);
}

/** Rejects with the API's own message ("This gift card code is not valid.", "Too many wrong codes ..."). */
export async function addGiftCard(code: string): Promise<GiftCard> {
  const res = await api.post("/api/v1/CustomerGiftCards/AddGiftCard", { Code: code.trim() });
  return camelize<GiftCard>((res.data as Envelope)?.Data);
}

export async function applyGiftCard(orderId: number, giftCardId: number, amount: number): Promise<OrderGiftCardResult> {
  const res = await api.post("/api/v1/CustomerGiftCards/ApplyGiftCard", { OrderId: orderId, GiftCardId: giftCardId, Amount: amount });
  return camelize<OrderGiftCardResult>((res.data as Envelope)?.Data);
}

export async function removeGiftCard(orderId: number, giftCardId: number): Promise<OrderGiftCardResult> {
  const res = await api.post("/api/v1/CustomerGiftCards/RemoveGiftCard", { OrderId: orderId, GiftCardId: giftCardId, Amount: 0 });
  return camelize<OrderGiftCardResult>((res.data as Envelope)?.Data);
}

export const giftCardErrorMessage = rewardsErrorMessage;
