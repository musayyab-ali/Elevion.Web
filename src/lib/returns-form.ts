/**
 * The "return items" form: what the customer picked turns into the request. Pure functions, no imports from the app.
 */

export type Pickable = { orderProductId: number; returnable: number; unitAmount: number };

/** A typed or stepped quantity, whole and inside 0..max. */
export function clampQuantity(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), Math.max(0, Math.floor(max)));
}

/** The lines with a quantity, as the request wants them; lines that cannot be returned are ignored even if picked. */
export function selectedItems(items: Pickable[], picked: Record<number, number>): { orderProductId: number; quantity: number }[] {
  const result: { orderProductId: number; quantity: number }[] = [];
  for (const item of items) {
    const quantity = clampQuantity(picked[item.orderProductId] ?? 0, item.returnable);
    if (quantity > 0) result.push({ orderProductId: item.orderProductId, quantity });
  }
  return result;
}

/** What the picked items are worth to the customer (the server works it out again and has the last word). */
export function estimateRefund(items: Pickable[], picked: Record<number, number>): number {
  const total = selectedItems(items, picked).reduce((sum, s) => {
    const item = items.find((i) => i.orderProductId === s.orderProductId)!;
    return sum + item.unitAmount * s.quantity;
  }, 0);
  return Math.round(total * 100) / 100;
}

export type FormCheck = { ok: true } | { ok: false; message: string };

export function checkReturnForm(items: Pickable[], picked: Record<number, number>, reasonCode: number, comments: string): FormCheck {
  if (selectedItems(items, picked).length === 0) return { ok: false, message: "Choose at least one item to return." };
  if (!reasonCode) return { ok: false, message: "Please choose a reason." };
  if (comments.trim().length > 1000) return { ok: false, message: "Comments can be at most 1000 characters." };
  return { ok: true };
}

/** A colour family for a status badge. */
export function statusTone(statusName: string): "info" | "good" | "bad" | "neutral" {
  switch (statusName) {
    case "Requested":
    case "Approved":
    case "Received":
      return "info";
    case "Completed":
      return "good";
    case "Rejected":
      return "bad";
    default:
      return "neutral";
  }
}
