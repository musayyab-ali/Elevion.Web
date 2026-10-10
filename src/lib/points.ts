/**
 * Reward points on an order. The API converts points to money with a fixed value per point and refuses a
 * discount that would make the order free, so the screen limits the customer's choice to what will be accepted.
 * Pure functions: the server still checks everything again.
 */

export type PointsInput = {
  /** Points the customer owns right now (the API already subtracts points applied to this order). */
  balance: number;
  /** Points already applied to this order. */
  applied: number;
  /** Amount to pay for the order with the applied points already taken off. */
  payable: number;
  /** Money value of one point. */
  rate: number;
};

/** The most points that can be used on this order: limited by the balance and by keeping the total above zero. */
export function maxRedeemablePoints({ balance, applied, payable, rate }: PointsInput): number {
  if (!(rate > 0)) return 0;
  const owned = Math.max(0, Math.floor(balance)) + Math.max(0, Math.floor(applied));
  const payableWithoutPoints = Math.max(0, payable) + Math.max(0, applied) * rate;
  // The order total must stay above zero, so at least one currency unit is always left to pay.
  const byAmount = Math.floor((payableWithoutPoints - 1) / rate);
  return Math.max(0, Math.min(owned, byAmount));
}

/** Reads what the customer typed: whole points between 0 and the maximum, never NaN. */
export function clampPoints(input: string, max: number): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Math.max(0, max));
}

export function pointsValue(points: number, rate: number): number {
  return Math.max(0, Math.floor(points)) * Math.max(0, rate);
}
