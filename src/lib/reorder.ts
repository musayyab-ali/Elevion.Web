import { addProductToCart } from "@/lib/cart";
import { getApiErrorMessage } from "@/lib/api";
import type { OrderItem } from "@/lib/order";

export type ReorderResult = {
  added: number;
  /** Items the shop could not add (sold out, no longer sold ...), with the reason the API gave. */
  failed: { name: string; reason: string }[];
};

/**
 * "Buy again": puts the lines of a past order back into the cart at today's price and stock.
 * Lines are added one after another (the cart API is additive) and one failing line never stops the others.
 */
export async function reorderItems(items: OrderItem[]): Promise<ReorderResult> {
  const result: ReorderResult = { added: 0, failed: [] };

  for (const item of items) {
    const quantity = Math.max(1, Math.floor(Number(item.Quantity) || 1));
    try {
      await addProductToCart(item.ProductId, item.ProductDetailId, quantity);
      result.added += 1;
    } catch (error) {
      result.failed.push({
        name: item.ProductName,
        reason: getApiErrorMessage(error, "Not available right now."),
      });
    }
  }

  return result;
}
