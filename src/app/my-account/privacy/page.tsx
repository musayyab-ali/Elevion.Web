"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import {
  consentLabel,
  downloadMyData,
  fetchConsents,
  privacyErrorMessage,
  saveConsents,
  type ConsentChoice,
} from "@/lib/privacy";

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

export default function PrivacyPage() {
  const [consents, setConsents] = useState<ConsentChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingType, setSavingType] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try {
      setConsents(await fetchConsents());
      setError(null);
    } catch (err) {
      setError(privacyErrorMessage(err, "Could not load your privacy choices."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Each switch is saved on its own, right away: withdrawing consent must be as easy as giving it.
  const toggle = async (choice: ConsentChoice) => {
    if (savingType !== null) return;
    setSavingType(choice.type);
    const next = !choice.isGranted;
    setConsents((list) => list.map((c) => (c.type === choice.type ? { ...c, isGranted: next } : c)));
    try {
      setConsents(await saveConsents([{ type: choice.type, isGranted: next }]));
      toast.success(next ? "Preference saved" : "Consent withdrawn");
    } catch (err) {
      setConsents((list) => list.map((c) => (c.type === choice.type ? { ...c, isGranted: choice.isGranted } : c)));
      toast.error(privacyErrorMessage(err, "Could not save your choice. Please try again."));
    } finally {
      setSavingType(null);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadMyData();
      toast.success("Your data has been downloaded");
    } catch (err) {
      toast.error(privacyErrorMessage(err, "Could not download your data. Please try again."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <TopNavOne props="style-one bg-black" slogan="" />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
        <Breadcrumb heading="Privacy & data" subHeading="Privacy & data" />
      </div>

      <div className="privacy-page lg:py-20 md:py-14 py-10">
        <div className="container max-w-3xl flex flex-col gap-10">
          <section>
            <h2 className="heading5">Your choices</h2>
            <p className="mt-2 text-secondary">Decide how we may contact you and use your data. You can change your mind at any time.</p>

            {loading ? (
              <div className="py-10 text-center text-secondary" role="status">Loading...</div>
            ) : error ? (
              <p className="py-10 text-center text-red" role="alert">{error}</p>
            ) : (
              <ul className="mt-6 flex flex-col gap-3">
                {consents.map((choice) => {
                  const label = consentLabel(choice);
                  const busy = savingType === choice.type;
                  return (
                    <li key={choice.type} className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
                      <div className="flex-1 min-w-0">
                        <div className="heading6">{label.title}</div>
                        {label.description && <div className="caption1 text-secondary">{label.description}</div>}
                        {choice.updatedOn && <div className="caption2 text-secondary2 mt-1">Last changed {formatDate(choice.updatedOn)}</div>}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={choice.isGranted}
                        aria-label={label.title}
                        disabled={busy}
                        onClick={() => toggle(choice)}
                        className={`relative h-7 w-12 shrink-0 rounded-full duration-300 ${choice.isGranted ? "bg-black" : "bg-line"} ${busy ? "opacity-60" : ""}`}
                      >
                        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow duration-300 ${choice.isGranted ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white p-6">
            <h2 className="heading5">Download my data</h2>
            <p className="mt-2 text-secondary">Get a copy of everything we hold about you (profile, addresses, orders, consents) as a file.</p>
            <button type="button" className="button-main mt-5" onClick={download} disabled={downloading}>
              {downloading ? "Preparing..." : "Download my data"}
            </button>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
