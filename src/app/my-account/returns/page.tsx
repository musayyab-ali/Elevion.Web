"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import { cancelReturn, fetchMyReturns, returnsErrorMessage, type ReturnRequestDto } from "@/lib/returns";
import { statusTone } from "@/lib/returns-form";
import { formatRsPrice } from "@/lib/cart";

const TONE_CLASS = {
  // Only colours from the shop theme exist (see tailwind.config.ts): they also follow the tenant's palette.
  info: "bg-purple/20 text-black",
  good: "bg-success/15 text-success",
  bad: "bg-red/10 text-red",
  neutral: "bg-surface text-secondary",
} as const;

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const ReturnCard = ({ item, onChanged }: { item: ReturnRequestDto; onChanged: () => void }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    if (!window.confirm(`Cancel return ${item.reference}?`)) return;
    setBusy(true);
    try {
      await cancelReturn(item.returnId);
      toast.success("Return cancelled.");
      onChanged();
    } catch (error) {
      toast.error(returnsErrorMessage(error, "Could not cancel this return."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div className="min-w-0">
          <div className="heading6">{item.reference}</div>
          <div className="caption1 text-secondary mt-1">
            Order {item.orderNumber ?? item.orderId} · {formatDate(item.createdOn)} · {item.resolutionName}
          </div>
        </div>
        <span className={`caption2 shrink-0 rounded-full px-3 py-1 font-semibold ${TONE_CLASS[statusTone(item.statusName)]}`}>{item.statusName}</span>
      </button>

      <ul className="mt-3 text-secondary caption1">
        {item.items.map((line) => (
          <li key={line.orderProductId}>
            {line.quantity} × {line.productName ?? "Item"}
          </li>
        ))}
      </ul>
      <div className="mt-2 caption1">
        {item.resolution === 2 ? "Replacement" : item.statusName === "Completed" ? "Amount" : "Expected amount"}:{" "}
        <strong>{item.resolution === 2 ? "—" : formatRsPrice(item.refundAmount)}</strong>
      </div>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="caption1 text-secondary">Reason: {item.reasonName}</div>
          {item.comments && <p className="caption1 mt-1">&ldquo;{item.comments}&rdquo;</p>}
          {item.decisionNote && (
            <p className="caption1 mt-3 rounded-lg bg-surface p-3">
              <strong>Message from the shop:</strong> {item.decisionNote}
            </p>
          )}
          <ol className="mt-4 space-y-2">
            {item.timeline.map((event, i) => (
              <li key={i} className="caption1">
                <strong>{event.statusName}</strong> <span className="text-secondary">· {formatDate(event.createdOn)}</span>
                {event.note && <div className="text-secondary">{event.note}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {item.canCancel && (
        <button type="button" className="mt-4 caption1 underline text-secondary" onClick={() => void cancel()} disabled={busy}>
          {busy ? "Cancelling..." : "Cancel this return"}
        </button>
      )}
    </article>
  );
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReturns(await fetchMyReturns());
      setError(null);
    } catch (e) {
      setError(returnsErrorMessage(e, "Could not load your returns."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <TopNavOne props="style-one bg-black" slogan="" />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="My Returns" subHeading="My Returns" />
      </div>

      <div className="lg:py-20 md:py-14 py-10">
        <div className="container max-w-3xl">
          {loading ? (
            <div className="py-20 text-center text-secondary" role="status">Loading your returns...</div>
          ) : error ? (
            <div className="rounded-2xl bg-surface p-8 text-center">
              <p className="text-red">{error}</p>
              <button type="button" className="button-main mt-4" onClick={() => void load()}>Try again</button>
            </div>
          ) : returns.length === 0 ? (
            <div className="rounded-2xl bg-surface p-10 text-center">
              <div className="heading5">No returns yet</div>
              <p className="body1 text-secondary mt-2">To return something, open a delivered order and choose &ldquo;Return items&rdquo;.</p>
              <Link href="/my-account" className="button-main inline-block mt-5">Go to my orders</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map((item) => (
                <ReturnCard key={item.returnId} item={item} onChanged={() => void load()} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
