import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin, SESSION_COOKIE_NAMES } from "@/lib/server/session";
import { REFRESH_TOKEN_KEY, SESSION_UNTIL_KEY, USER_ROLE_KEY } from "@/lib/auth-keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Is there a logged-in session? (the tokens themselves are never returned) */
export async function GET(req: NextRequest) {
  const until = Number(req.cookies.get(SESSION_UNTIL_KEY)?.value);
  const authenticated = Boolean(req.cookies.get(REFRESH_TOKEN_KEY)?.value) && Number.isFinite(until) && until > Date.now();
  return NextResponse.json(
    { authenticated, role: authenticated ? (req.cookies.get(USER_ROLE_KEY)?.value ?? null) : null },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Log out: forget the session cookies. */
export async function DELETE(req: NextRequest) {
  if (!isSameOrigin("DELETE", req.headers.get("origin"), req.headers.get("host"))) {
    return NextResponse.json({ Message: "Cross-site request refused" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  for (const name of SESSION_COOKIE_NAMES) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
