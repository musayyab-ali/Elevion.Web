/**
 * Paying part of an order with a gift card: what can be asked for, and the sentences to say when it cannot.
 * Mirrors the server's rules so the customer is told before asking; the server still checks everything.
 */

export type CardAmountInput = {
  /** The card's balance now (the server has already put back what this card pays on this order). */
  balance: number;
  /** What this card already pays on this order. */
  applied: number;
  /** What the order still costs to pay, with this card's current payment already taken off. */
  payable: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The most this card can pay: its balance (plus what it already pays) and the order total minus Rs. 1 that must stay to pay. */
export function maxCardAmount({ balance, applied, payable }: CardAmountInput): number {
  const available = Math.max(0, balance) + Math.max(0, applied);
  const payableWithoutCard = Math.max(0, payable) + Math.max(0, applied);
  const byOrder = Math.floor((payableWithoutCard - 1) * 100) / 100;
  return Math.max(0, round2(Math.min(available, byOrder)));
}

export type CardAmountCheck = { ok: true; amount: number } | { ok: false; message: string };

export function checkCardAmount(input: string, p: CardAmountInput): CardAmountCheck {
  const text = input.trim();
  const typed = Number(text);
  if (!text || !Number.isFinite(typed) || typed <= 0) return { ok: false, message: "Enter how much you want to use from this card." };
  if (round2(typed) !== typed) return { ok: false, message: "Use an amount with at most 2 decimals." };

  const available = Math.max(0, p.balance) + Math.max(0, p.applied);
  if (typed > available) return { ok: false, message: `This card only has Rs. ${round2(available)}.` };

  const max = maxCardAmount(p);
  if (typed > max) {
    return {
      ok: false,
      message: max > 0 ? `You can use at most Rs. ${max} from this card on this order.` : "This card cannot be used on this order.",
    };
  }
  return { ok: true, amount: typed };
}

/** Types "gc abcd efgh ..." and sees it tidied as GC-ABCD-EFGH-...: upper case, no stray characters, dashes after each group. */
export function formatCodeInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 18);
  if (clean.length <= 2) return clean;
  const body = clean.slice(2).match(/.{1,4}/g) ?? [];
  return ["GC", ...body].join("-");
}

export function looksLikeCompleteCode(code: string): boolean {
  return /^GC(-[A-Z0-9]{4}){4}$/.test(code);
}
