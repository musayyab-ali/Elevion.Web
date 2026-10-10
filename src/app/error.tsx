"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page crashes while rendering: the customer can retry or go home instead of seeing a blank screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The digest lets support find the matching server log line; the message itself is never shown to the customer.
    console.error("Page error", error.digest ?? "");
  }, [error]);

  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-4 py-20 text-center" role="alert">
      <div className="heading3">Something went wrong</div>
      <p className="body1 text-secondary max-w-md">
        We could not load this page. Please try again; if the problem stays, come back in a few minutes.
      </p>
      {error.digest && <p className="caption1 text-secondary2">Reference: {error.digest}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button type="button" className="button-main" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="button-main bg-white text-black border border-black">
          Back to home
        </Link>
      </div>
    </div>
  );
}
