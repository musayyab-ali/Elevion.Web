"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import { RESOLUTIONS, createReturn, fetchReturnableOrder, returnsErrorMessage, type ReturnableOrder } from "@/lib/returns";
import { checkReturnForm, clampQuantity, estimateRefund, selectedItems } from "@/lib/returns-form";
import { formatRsPrice } from "@/lib/cart";

function NewReturn() {
  const router = useRouter();
  const orderId = Number(useSearchParams().get("orderId"));

  const [order, setOrder] = useState<ReturnableOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [reasonCode, setReasonCode] = useState(0);
  const [resolution, setResolution] = useState(1);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoadError("Open this page from one of your delivered orders.");
      return;
    }
    fetchReturnableOrder(orderId)
      .then(setOrder)
      .catch((e) => setLoadError(returnsErrorMessage(e, "Could not load this order.")));
  }, [orderId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const check = checkReturnForm(order.items, picked, reasonCode, comments);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    setSubmitting(true);
    try {
      const created = await createReturn({ orderId, reasonCode, resolution, comments, items: selectedItems(order.items, picked).map((i) => ({ orderProductId: i.orderProductId, quantity: i.quantity })) });
      toast.success(`Return ${created.reference} requested.`);
      router.push("/my-account/returns");
    } catch (error) {
      toast.error(returnsErrorMessage(error, "Could not request this return."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center">
        <p className="text-red">{loadError}</p>
        <Link href="/my-account" className="button-main inline-block mt-4">Back to my account</Link>
      </div>
    );
  }
  if (!order) return <div className="py-20 text-center text-secondary" role="status">Loading...</div>;

  if (!order.canReturn) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center">
        <div className="heading5">This order cannot be returned</div>
        <p className="body1 text-secondary mt-2">{order.reason}</p>
        <Link href="/my-account" className="button-main inline-block mt-4">Back to my account</Link>
      </div>
    );
  }

  const anyLeft = order.items.some((i) => i.returnable > 0);
  const estimate = estimateRefund(order.items, picked);

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <div className="heading5">Return items from order {order.orderNumber}</div>
        {order.returnByDate && (
          <p className="caption1 text-secondary mt-1">
            You can return items until {new Date(order.returnByDate).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}.
          </p>
        )}
      </div>

      {!anyLeft ? (
        <p className="rounded-2xl bg-surface p-6 text-secondary">Everything in this order has already been returned or is in another return.</p>
      ) : (
        <fieldset className="rounded-2xl border border-line bg-white p-5">
          <legend className="heading6 px-1">Which items?</legend>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.orderProductId} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-button truncate">{item.productName ?? "Item"}</div>
                  <div className="caption1 text-secondary">
                    {formatRsPrice(item.unitAmount)} each · ordered {item.ordered}
                    {item.alreadyRequested > 0 ? ` · ${item.alreadyRequested} already in a return` : ""}
                  </div>
                </div>
                {item.returnable > 0 ? (
                  <label className="flex items-center gap-2 caption1">
                    Return
                    <select
                      className="h-10 rounded-lg border border-line px-2 bg-white"
                      value={picked[item.orderProductId] ?? 0}
                      onChange={(e) => setPicked((p) => ({ ...p, [item.orderProductId]: clampQuantity(Number(e.target.value), item.returnable) }))}
                      aria-label={`How many ${item.productName ?? "items"} to return`}
                    >
                      {Array.from({ length: item.returnable + 1 }, (_, n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span className="caption1 text-secondary">Not returnable</span>
                )}
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 caption1 text-secondary">
          Why are you returning it?
          <select className="h-12 rounded-lg border border-line px-3 text-black bg-white" value={reasonCode} onChange={(e) => setReasonCode(Number(e.target.value))} required>
            <option value={0}>Choose a reason</option>
            {order.reasons.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="caption1 text-secondary mb-1">What would you like?</legend>
          {RESOLUTIONS.map((r) => (
            <label key={r.value} className="flex items-start gap-2 caption1 cursor-pointer">
              <input type="radio" name="resolution" className="mt-1" checked={resolution === r.value} onChange={() => setResolution(r.value)} />
              <span><strong className="text-black">{r.label}</strong> <span className="text-secondary">· {r.hint}</span></span>
            </label>
          ))}
        </fieldset>
      </div>

      <label className="flex flex-col gap-1 caption1 text-secondary">
        Anything we should know? (optional)
        <textarea className="min-h-[96px] rounded-lg border border-line p-3 text-black" maxLength={1000} value={comments} onChange={(e) => setComments(e.target.value)} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5">
        <div className="caption1">
          {resolution === 2 ? "A replacement will be sent." : "Value of the items"}: <strong>{resolution === 2 ? "" : formatRsPrice(estimate)}</strong>
          <div className="caption2 text-secondary">The shop confirms the final amount after it receives the items.</div>
        </div>
        <button type="submit" className="button-main" disabled={submitting || !anyLeft}>
          {submitting ? "Sending..." : "Request return"}
        </button>
      </div>
    </form>
  );
}

export default function NewReturnPage() {
  return (
    <>
      <TopNavOne props="style-one bg-black" slogan="" />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Return items" subHeading="Return items" />
      </div>
      <div className="lg:py-20 md:py-14 py-10">
        <div className="container max-w-3xl">
          <Suspense fallback={<div className="py-20 text-center text-secondary" role="status">Loading...</div>}>
            <NewReturn />
          </Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
