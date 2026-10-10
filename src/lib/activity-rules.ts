/** The server counts a look at the same product within 30 minutes as one visit, so there is no point asking again sooner. */
export const SAME_VISIT_MS = 30 * 60 * 1000;

/** Whether to tell the server about a product view, given when this browser last told it about the same product. */
export function shouldReportView(lastReportedAt: number | undefined, now: number, gapMs: number = SAME_VISIT_MS): boolean {
  if (lastReportedAt === undefined || !Number.isFinite(lastReportedAt)) return true;
  return now - lastReportedAt >= gapMs;
}

/** A product id worth reporting: a positive whole number. */
export function isReportableProduct(productId: unknown): productId is number {
  return typeof productId === "number" && Number.isInteger(productId) && productId > 0;
}
