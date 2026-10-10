"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import { expiryHint } from "@/lib/voucher-expiry";
import {
  applyReferralCode,
  fetchMyLoyalty,
  fetchMyReferral,
  fetchMyVouchers,
  isVoucherUsable,
  rewardsErrorMessage,
  type Loyalty,
  type MyReferral,
  type Voucher,
} from "@/lib/rewards";

type Tab = "vouchers" | "membership" | "invite";
type Section<T> = { data: T; error: string | null };

const money = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const STATUS_CLASS: Record<string, string> = {
  Issued: "bg-black/10 text-black",
  Delivered: "bg-black/10 text-black",
  Viewed: "bg-purple/10 text-purple",
  Redeemed: "bg-success/10 text-success",
  Expired: "bg-surface text-secondary",
  Revoked: "bg-red/10 text-red",
  Cancelled: "bg-red/10 text-red",
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy. Please select the code and copy it.");
  }
}

const Notice = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex flex-col items-center text-center gap-3 py-14 text-secondary">
    {icon}
    <p className="max-w-md">{text}</p>
  </div>
);

const VoucherCard = ({ voucher }: { voucher: Voucher }) => {
  const usable = isVoucherUsable(voucher);
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 ${usable ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center">
          <Icon.Gift size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="heading6 truncate">{voucher.partnerName}</div>
          <div className="caption1 text-secondary">{money(voucher.value)} voucher</div>
        </div>
        <span className={`px-3 py-1 rounded-full caption2 font-semibold ${STATUS_CLASS[voucher.statusName] ?? STATUS_CLASS.Expired}`}>
          {voucher.statusName}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-3">
        <code className="heading6 tracking-widest break-all select-all">{voucher.code}</code>
        {usable && (
          <button type="button" className="text-secondary hover:text-black duration-300" onClick={() => copyText(voucher.code)} aria-label="Copy voucher code">
            <Icon.Copy size={20} />
          </button>
        )}
      </div>

      <div className="mt-3 caption1 text-secondary">
        {usable && expiryHint(voucher.expiresOn) && (
          <span className="mr-2 inline-block rounded-full bg-yellow/20 px-2.5 py-0.5 caption2 font-semibold text-black">
            {expiryHint(voucher.expiresOn)}
          </span>
        )}
        {voucher.expiresOn ? `Valid until ${formatDate(voucher.expiresOn)}` : "No expiry date"}
        {voucher.redeemedOn ? ` · Used ${formatDate(voucher.redeemedOn)}` : ""}
      </div>
      {voucher.terms && <p className="mt-2 caption2 text-secondary2">{voucher.terms}</p>}
    </div>
  );
};

const VouchersTab = ({ vouchers, error }: { vouchers: Voucher[]; error: string | null }) => {
  if (error) return <Notice icon={<Icon.WarningCircle size={40} />} text={error} />;
  if (!vouchers.length) return <Notice icon={<Icon.Gift size={40} />} text="No vouchers yet. Complete an order and your rewards will appear here." />;

  const usable = vouchers.filter(isVoucherUsable);
  const past = vouchers.filter((v) => !isVoucherUsable(v));
  return (
    <div className="flex flex-col gap-4">
      {usable.length > 0 && <div className="heading6">Ready to use ({usable.length})</div>}
      {usable.map((v) => <VoucherCard key={v.voucherId} voucher={v} />)}
      {past.length > 0 && <div className="heading6 mt-4">History</div>}
      {past.map((v) => <VoucherCard key={v.voucherId} voucher={v} />)}
    </div>
  );
};

const MembershipTab = ({ loyalty, error }: { loyalty: Loyalty | null; error: string | null }) => {
  if (error) return <Notice icon={<Icon.WarningCircle size={40} />} text={error} />;
  if (!loyalty) return null;

  const color = loyalty.tierColor || "#F2694F";
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-line bg-white p-5 text-center">
          <div className="heading5">{money(loyalty.lifetimeSpend)}</div>
          <div className="caption1 text-secondary mt-1">Total spent</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 text-center">
          <div className="heading5">{Number(loyalty.rewardPoints || 0).toLocaleString()}</div>
          <div className="caption1 text-secondary mt-1">Reward points</div>
        </div>
      </div>

      {!loyalty.tiersEnabled || !loyalty.tier ? (
        <Notice icon={<Icon.Medal size={40} />} text="Membership levels are not available yet." />
      ) : (
        <div className="rounded-2xl bg-white p-6" style={{ border: `2px solid ${color}` }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ background: color }}>
              <Icon.Medal size={24} weight="fill" />
            </div>
            <div>
              <div className="caption1 text-secondary">Your level</div>
              <div className="heading4">{loyalty.tier}</div>
            </div>
          </div>
          {loyalty.benefits && <p className="mt-4 text-secondary">{loyalty.benefits}</p>}
          <div className="mt-5 h-2.5 rounded-full bg-surface overflow-hidden" role="progressbar" aria-valuenow={loyalty.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full duration-500" style={{ width: `${Math.min(100, Math.max(0, loyalty.progress))}%`, background: color }} />
          </div>
          <div className="mt-2 caption1 text-secondary">
            {loyalty.nextTier ? `${money(loyalty.spendToNextTier)} more to reach ${loyalty.nextTier}` : "You are at the top level. Thank you!"}
          </div>
        </div>
      )}

      {loyalty.tiersEnabled && loyalty.levels.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="heading6">All levels</div>
          {loyalty.levels.map((level) => (
            <div key={level.name} className={`flex items-center gap-4 rounded-xl border bg-white p-4 ${level.current ? "border-black" : "border-line"}`}>
              <span className="w-3.5 h-3.5 rounded-full" style={{ background: level.color || "#9AA0AA", opacity: level.reached ? 1 : 0.35 }} />
              <div className="flex-1 min-w-0">
                <div className="heading6">{level.name}{level.current ? " (you)" : ""}</div>
                <div className="caption1 text-secondary">{level.minSpend > 0 ? `From ${money(level.minSpend)} total spend` : "Everyone starts here"}</div>
                {level.benefits && <div className="caption1 text-secondary">{level.benefits}</div>}
              </div>
              {level.reached && <Icon.CheckCircle size={22} weight="fill" className="text-success" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InviteTab = ({ referral, error, onApplied }: { referral: MyReferral | null; error: string | null; onApplied: () => void }) => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  if (error) return <Notice icon={<Icon.WarningCircle size={40} />} text={error} />;
  if (!referral) return null;

  const share = async () => {
    const message = `Join me and use my referral code ${referral.code} on your first order to get a reward.`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    await copyText(message);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const message = await applyReferralCode(code);
      setFeedback({ ok: true, text: message });
      setCode("");
      onApplied();
    } catch (err) {
      setFeedback({ ok: false, text: rewardsErrorMessage(err, "That code could not be used.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-black text-white p-6 text-center">
        <div className="heading5">Invite friends, earn rewards</div>
        <p className="mt-2 text-white/70">Share your code. When a friend places their first order, you both get a reward.</p>
        <div className="my-6 text-3xl font-bold tracking-[0.2em] select-all break-all">{referral.code}</div>
        <div className="flex flex-wrap gap-3 justify-center">
          <button type="button" className="button-main bg-white text-black" onClick={share}>Share my code</button>
          <button type="button" className="button-main bg-transparent border border-white text-white" onClick={() => copyText(referral.code)}>Copy code</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[["Invited", referral.invited], ["Waiting", referral.pending], ["Joined", referral.qualified]].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-line bg-white p-5 text-center">
            <div className="heading5">{value}</div>
            <div className="caption1 text-secondary mt-1">{label}</div>
          </div>
        ))}
      </div>

      {referral.canApplyCode ? (
        <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-6">
          <div className="heading6">Have a friend&apos;s code?</div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              className="border-line px-4 py-3 w-full rounded-lg uppercase tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="REF-0000-00"
              autoComplete="off"
              aria-label="Referral code"
            />
            <button type="submit" className="button-main whitespace-nowrap" disabled={!code.trim() || busy}>
              {busy ? "Applying..." : "Apply code"}
            </button>
          </div>
          {feedback && <p className={`mt-3 ${feedback.ok ? "text-success" : "text-red"}`} role="status">{feedback.text}</p>}
        </form>
      ) : referral.wasReferred ? (
        <p className="text-center text-secondary">You joined with a friend&apos;s referral code. Your reward comes after your first order.</p>
      ) : null}
    </div>
  );
};

const TABS: { key: Tab; label: string }[] = [
  { key: "vouchers", label: "Vouchers" },
  { key: "membership", label: "Membership" },
  { key: "invite", label: "Invite friends" },
];

export default function RewardsPage() {
  const [tab, setTab] = useState<Tab>("vouchers");
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<Section<Voucher[]>>({ data: [], error: null });
  const [loyalty, setLoyalty] = useState<Section<Loyalty | null>>({ data: null, error: null });
  const [referral, setReferral] = useState<Section<MyReferral | null>>({ data: null, error: null });

  const load = useCallback(async () => {
    const [v, l, r] = await Promise.allSettled([fetchMyVouchers(), fetchMyLoyalty(), fetchMyReferral()]);
    setVouchers(v.status === "fulfilled" ? { data: v.value, error: null } : { data: [], error: rewardsErrorMessage(v.reason, "Could not load your vouchers.") });
    setLoyalty(l.status === "fulfilled" ? { data: l.value, error: null } : { data: null, error: rewardsErrorMessage(l.reason, "Could not load your membership.") });
    setReferral(r.status === "fulfilled" ? { data: r.value, error: null } : { data: null, error: rewardsErrorMessage(r.reason, "Could not load your referral details.") });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const usableCount = useMemo(() => vouchers.data.filter(isVoucherUsable).length, [vouchers.data]);

  return (
    <>
      <TopNavOne props="style-one bg-black" slogan="" />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Rewards" subHeading="Rewards" />
      </div>

      <div className="rewards-page lg:py-20 md:py-14 py-10">
        <div className="container max-w-3xl">
          <div className="flex border-b border-line mb-8 overflow-x-auto" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`px-5 py-3 whitespace-nowrap heading6 duration-300 border-b-2 -mb-px ${tab === t.key ? "border-black text-black" : "border-transparent text-secondary hover:text-black"}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === "vouchers" && usableCount > 0 ? ` (${usableCount})` : ""}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-secondary" role="status">Loading your rewards...</div>
          ) : (
            <>
              {tab === "vouchers" && <VouchersTab vouchers={vouchers.data} error={vouchers.error} />}
              {tab === "membership" && <MembershipTab loyalty={loyalty.data} error={loyalty.error} />}
              {tab === "invite" && <InviteTab referral={referral.data} error={referral.error} onApplied={() => void load()} />}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
