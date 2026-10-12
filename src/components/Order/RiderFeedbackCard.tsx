"use client";

import { useState } from "react";
import { rateRider, setRiderTip } from "@/lib/order";
import {
  hasRiderFeedback,
  parseTip,
  RiderFeedbackState,
  STAR_WORDS,
  tipChoices,
  validStars,
} from "@/lib/rider-feedback";

/**
 * "Rate your rider" after the delivery, and "Add a cash tip" while a cash-on-delivery order is out for delivery.
 * Shown only when the shop allows it (the server decides what the customer may still do).
 */
export default function RiderFeedbackCard({
  orderId,
  initial,
  onChanged,
}: {
  orderId: number;
  initial: RiderFeedbackState | null | undefined;
  onChanged?: () => void;
}) {
  const [state, setState] = useState<RiderFeedbackState | null | undefined>(initial);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!state || !hasRiderFeedback(state)) return null;

  const who = state.RiderName ? state.RiderName : "your rider";

  async function submitRating() {
    if (!validStars(stars)) {
      setMessage({ ok: false, text: "Choose 1 to 5 stars." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await rateRider(orderId, stars, comment);
      setState((s) => (s ? { ...s, CanRate: false, Stars: stars } : s));
      setMessage({ ok: true, text: "Thank you for your feedback!" });
      onChanged?.();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Could not save your rating." });
    } finally {
      setBusy(false);
    }
  }

  async function submitTip(amount: number) {
    setBusy(true);
    setMessage(null);
    try {
      await setRiderTip(orderId, amount);
      setState((s) => (s ? { ...s, TipAmount: amount } : s));
      setMessage({
        ok: true,
        text: amount > 0 ? `Tip of PKR ${amount} saved. Hand it to the rider with your payment.` : "Tip removed.",
      });
      onChanged?.();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Could not save your tip." });
    } finally {
      setBusy(false);
    }
  }

  const box: React.CSSProperties = { background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16, marginTop: 16 };

  return (
    <section style={box} aria-label="Rider feedback">
      {state.CanRate && (
        <div>
          <div className="heading6">How was your delivery?</div>
          <p className="caption1 text-secondary mt-1">Rate {who}. It helps us look after our riders and customers.</p>
          <div role="radiogroup" aria-label="Stars" style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={stars === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setStars(n)}
                style={{ fontSize: 30, lineHeight: 1, background: "none", border: 0, cursor: "pointer", color: n <= stars ? "#F59E0B" : "#CBD5E1" }}
              >
                ★
              </button>
            ))}
            <span className="caption1 text-secondary" style={{ alignSelf: "center", marginLeft: 6 }}>{STAR_WORDS[stars]}</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Anything to add? (optional)"
            style={{ width: "100%", marginTop: 10, border: "1px solid #E5E7EB", borderRadius: 8, padding: 8 }}
          />
          <button type="button" className="button-main mt-3" disabled={busy || stars === 0} onClick={submitRating}>
            {busy ? "Saving..." : "Submit rating"}
          </button>
        </div>
      )}

      {!state.CanRate && state.Stars ? (
        <div className="caption1">
          You rated {who}: <b style={{ color: "#F59E0B" }}>{"★".repeat(state.Stars)}</b>
          <span style={{ color: "#CBD5E1" }}>{"★".repeat(5 - state.Stars)}</span>
        </div>
      ) : null}

      {state.CanTip && (
        <div style={{ marginTop: state.CanRate ? 18 : 0 }}>
          <div className="heading6">Add a tip for {who}</div>
          <p className="caption1 text-secondary mt-1">
            A cash tip: you hand it over with your payment at the door. Current tip: <b>PKR {state.TipAmount}</b>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {tipChoices(state.MaxTip).map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={busy}
                onClick={() => submitTip(amount)}
                aria-pressed={state.TipAmount === amount}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${state.TipAmount === amount ? "#111827" : "#CBD5E1"}`,
                  background: state.TipAmount === amount ? "#111827" : "#fff",
                  color: state.TipAmount === amount ? "#fff" : "#111827",
                  cursor: "pointer",
                }}
              >
                {amount === 0 ? "No tip" : `PKR ${amount}`}
              </button>
            ))}
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={`Other (max ${state.MaxTip})`}
              aria-label="Other tip amount"
              style={{ width: 130, border: "1px solid #CBD5E1", borderRadius: 999, padding: "8px 12px" }}
            />
            <button
              type="button"
              disabled={busy || parseTip(custom, state.MaxTip) === null}
              onClick={() => {
                const v = parseTip(custom, state.MaxTip);
                if (v !== null) submitTip(v);
              }}
              style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #111827", background: "#fff", cursor: "pointer" }}
            >
              Set
            </button>
          </div>
        </div>
      )}

      {!state.CanTip && state.TipAmount > 0 && (
        <div className="caption1" style={{ marginTop: state.Stars ? 8 : 0 }}>
          Your tip of <b>PKR {state.TipAmount}</b> goes to {who}.
        </div>
      )}

      {message && (
        <div role="status" className="caption1" style={{ marginTop: 10, color: message.ok ? "#047857" : "#B91C1C" }}>
          {message.text}
        </div>
      )}
    </section>
  );
}
