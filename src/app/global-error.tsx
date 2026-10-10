"use client";

/** Last safety net: used only if the root layout itself fails. It must bring its own <html>/<body>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center" }}>
        <div role="alert">
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p style={{ color: "#696C70" }}>Please try again in a moment.</p>
          <button type="button" onClick={() => reset()} style={{ marginTop: 12, padding: "10px 24px", borderRadius: 999, border: 0, background: "#1F1F1F", color: "#fff", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
