"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import { addGiftCard, fetchMyGiftCards, giftCardErrorMessage, type GiftCard } from "@/lib/gift-cards";
import { formatCodeInput, looksLikeCompleteCode } from "@/lib/gift-card-form";
import { formatRsPrice } from "@/lib/cart";

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const Card = ({ card }: { card: GiftCard }) => {
  const [open, setOpen] = useState(false);
  return (
    <article className={`rounded-2xl border border-line bg-white p-5 ${card.isUsable ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="caption1 text-secondary">{card.maskedCode}</div>
          <div className="heading4 mt-1">{formatRsPrice(card.balance)}</div>
          <div className="caption1 text-secondary mt-1">
            of {formatRsPrice(card.initialAmount)}
            {card.expiresOn ? ` · valid until ${formatDate(card.expiresOn)}` : " · no expiry"}
          </div>
        </div>
        <span className={`caption2 rounded-full px-3 py-1 font-semibold ${card.statusName === "Active" && card.balance > 0 ? "bg-success/15 text-success" : "bg-surface text-secondary"}`}>
          {card.balance <= 0 && card.statusName === "Active" ? "Used up" : card.statusName}
        </span>
      </div>

      <button type="button" className="mt-3 caption1 underline text-secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide history" : "Show history"}
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {card.transactions.map((t, i) => (
            <li key={i} className="flex justify-between gap-3 caption1">
              <span>{t.typeName} <span className="text-secondary">· {formatDate(t.createdOn)}</span></span>
              <span className={t.amount < 0 ? "text-secondary" : "text-success"}>{t.amount < 0 ? "-" : "+"}{formatRsPrice(Math.abs(t.amount))}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [codeError, setCodeError] = useState("");

  const load = useCallback(async () => {
    try {
      setCards(await fetchMyGiftCards());
      setError(null);
    } catch (e) {
      setError(giftCardErrorMessage(e, "Could not load your gift cards."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!looksLikeCompleteCode(code)) {
      setCodeError("Enter the full code, like GC-ABCD-EFGH-JKLM-NPQR.");
      return;
    }
    setAdding(true);
    setCodeError("");
    try {
      const card = await addGiftCard(code);
      toast.success(`Gift card added: ${formatRsPrice(card.balance)}`);
      setCode("");
      await load();
    } catch (err) {
      const message = giftCardErrorMessage(err, "Could not add this gift card.");
      setCodeError(message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <TopNavOne props="style-one bg-black" />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Gift cards" subHeading="Gift cards" />
      </div>

      <div className="lg:py-20 md:py-14 py-10">
        <div className="container max-w-3xl">
          <form onSubmit={add} className="rounded-2xl bg-surface p-5">
            <label htmlFor="gift-code" className="heading6">Add a gift card</label>
            <p className="caption1 text-secondary mt-1">Type the code printed on your card or sent to you.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                id="gift-code"
                className={`h-12 flex-1 min-w-[220px] rounded-lg border px-4 tracking-wider uppercase ${codeError ? "border-red" : "border-line"}`}
                placeholder="GC-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setCode(formatCodeInput(e.target.value));
                  if (codeError) setCodeError("");
                }}
              />
              <button type="submit" className="button-main" disabled={adding || !code}>{adding ? "Adding..." : "Add card"}</button>
            </div>
            {codeError && <p className="caption1 text-red mt-2" role="alert">{codeError}</p>}
          </form>

          <div className="mt-8">
            {loading ? (
              <div className="py-16 text-center text-secondary" role="status">Loading your gift cards...</div>
            ) : error ? (
              <div className="rounded-2xl bg-surface p-8 text-center">
                <p className="text-red">{error}</p>
                <button type="button" className="button-main mt-4" onClick={() => void load()}>Try again</button>
              </div>
            ) : cards.length === 0 ? (
              <p className="rounded-2xl bg-surface p-8 text-center text-secondary">You have no gift cards yet. When you have one, add its code above and use it at the payment step.</p>
            ) : (
              <div className="space-y-4">
                {cards.map((card) => (
                  <Card key={card.giftCardId} card={card} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
