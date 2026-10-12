// Rules for the "rate and tip your rider" card (no React, no network), so they can be tested with `npm test`.

export interface RiderFeedbackState {
  CanRate: boolean;
  Stars?: number | null;
  CanTip: boolean;
  TipAmount: number;
  MaxTip: number;
  RiderName?: string | null;
}

/** The card shows only when the customer can still do something, or has already rated / tipped. */
export function hasRiderFeedback(state: RiderFeedbackState | null | undefined): boolean {
  if (!state) return false;
  return state.CanRate || state.CanTip || !!state.Stars || state.TipAmount > 0;
}

/** Quick tip buttons: only amounts the shop allows. 0 means no tip. */
export function tipChoices(maxTip: number): number[] {
  const presets = [0, 50, 100, 200, 500];
  return presets.filter((p) => p <= Math.max(0, maxTip));
}

/** What the customer typed as a custom tip: whole rupees from 0 to the shop's limit, or null when it is not usable. */
export function parseTip(input: string, maxTip: number): number | null {
  const clean = String(input ?? "").trim();
  if (!/^\d{1,5}$/.test(clean)) return null;
  const value = Number(clean);
  return value >= 0 && value <= maxTip ? value : null;
}

export function validStars(stars: number): boolean {
  return Number.isInteger(stars) && stars >= 1 && stars <= 5;
}

export const STAR_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
