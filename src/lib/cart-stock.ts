/**
 * Stock problems in the cart. The API reports, for every cart line, how many are left (when the shop manages
 * its inventory); this turns that into plain facts the screens can show and act on. Pure functions.
 */

export type StockLine = {
  cartId: string;
  name: string;
  quantity: number;
  /** How many the shop can supply; null / undefined = no limit (inventory not managed). */
  available?: number | null;
};

export type StockIssue = {
  cartId: string;
  name: string;
  quantity: number;
  available: number;
  /** "soldout": none left, the line must go. "over": fewer left than in the cart, it can be reduced. */
  kind: "soldout" | "over";
};

export function hasLimit(line: Pick<StockLine, "available">): line is { available: number } {
  return typeof line.available === "number" && Number.isFinite(line.available);
}

export function findStockIssues(lines: StockLine[]): StockIssue[] {
  const issues: StockIssue[] = [];
  for (const line of lines) {
    if (!hasLimit(line)) continue;
    const available = Math.max(0, Math.floor(line.available));
    if (available <= 0) {
      issues.push({ cartId: line.cartId, name: line.name, quantity: line.quantity, available: 0, kind: "soldout" });
    } else if (line.quantity > available) {
      issues.push({ cartId: line.cartId, name: line.name, quantity: line.quantity, available, kind: "over" });
    }
  }
  return issues;
}

/** The + button is only usable while one more is still in stock. */
export function canIncrease(line: StockLine): boolean {
  if (!hasLimit(line)) return true;
  return line.quantity < Math.max(0, Math.floor(line.available));
}

/** What the customer should read next to a line, or null when there is nothing to say. */
export function stockNote(line: StockLine): string | null {
  if (!hasLimit(line)) return null;
  const available = Math.max(0, Math.floor(line.available));
  if (available <= 0) return "Out of stock";
  if (line.quantity > available) return `Only ${available} left in stock (you have ${line.quantity})`;
  if (line.quantity === available) return `That is all we have: ${available} in stock`;
  if (available <= 5) return `Only ${available} left`;
  return null;
}

/** One sentence for a banner above the cart / the pay button. */
export function stockSummary(issues: StockIssue[]): string | null {
  if (issues.length === 0) return null;
  const soldOut = issues.filter((i) => i.kind === "soldout").length;
  const over = issues.length - soldOut;
  const parts: string[] = [];
  if (over > 0) parts.push(`${over} item${over === 1 ? " has" : "s have"} more in your cart than we have in stock`);
  if (soldOut > 0) parts.push(`${soldOut} item${soldOut === 1 ? " is" : "s are"} out of stock`);
  return `${parts.join(" and ")}.`;
}
