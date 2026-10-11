"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  OPEN_COOKIE_SETTINGS_EVENT,
  currentChoice,
  getStoredChoice,
  saveChoice,
} from "@/lib/cookie-consent";

/**
 * Cookie / storage choice. Shown until the visitor chooses. "Necessary only" and "Accept all" look the same and are equally easy;
 * nothing optional is used before a choice. Can be reopened from the footer ("Cookie settings").
 */
const CookieBanner = () => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (!getStoredChoice()) setOpen(true);
    const reopen = () => {
      const now = currentChoice();
      setPreferences(now.preferences);
      setAnalytics(now.analytics);
      setDetail(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (choice: { preferences: boolean; analytics: boolean }) => {
    saveChoice(choice);
    setOpen(false);
    setDetail(false);
  };

  const buttonClass = "flex-1 min-w-[140px] rounded-full border border-black px-5 py-3 text-button hover:bg-black hover:text-white duration-300";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie settings"
      className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-line bg-white p-4 shadow-lg md:left-4 md:bottom-4 md:right-auto md:max-w-[460px] md:rounded-2xl md:border"
    >
      <div className="heading6">Your privacy choices</div>
      <p className="caption1 mt-2 text-secondary">
        We always use what the shop needs to work (sign-in, cart, checkout). With your OK we also remember what you looked at
        and use it for suggestions. You decide, and you can change it any time.{" "}
        <Link href="/pages/privacy-policy" className="underline">
          Privacy Policy
        </Link>
      </p>

      {detail && (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-start gap-3 opacity-70">
            <input type="checkbox" checked disabled className="mt-1" />
            <span className="caption1">
              <strong>Necessary</strong> — sign-in, cart, checkout and this choice. Always on.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={preferences} onChange={(e) => setPreferences(e.target.checked)} className="mt-1" />
            <span className="caption1">
              <strong>Preferences</strong> — &quot;Recently viewed&quot; and &quot;Picked for you&quot;, kept only in this browser.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1" />
            <span className="caption1">
              <strong>Analytics</strong> — tells the shop which products you opened while signed in, to improve reminders and offers.
            </span>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => choose({ preferences: false, analytics: false })}>
          Necessary only
        </button>
        <button type="button" className={buttonClass} onClick={() => choose({ preferences: true, analytics: true })}>
          Accept all
        </button>
        {detail ? (
          <button type="button" className={buttonClass} onClick={() => choose({ preferences, analytics })}>
            Save my choice
          </button>
        ) : (
          <button type="button" className={buttonClass} onClick={() => setDetail(true)}>
            Choose
          </button>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
