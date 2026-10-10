import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backendConfig,
  extractAndScrubTokens,
  isAccessExpired,
  isSafeApiPath,
  isSameOrigin,
  isTokenEndpoint,
  sessionCookies,
  tokensFromRefreshResponse,
  TOKEN_PLACEHOLDER,
} from "./session.ts";

test("login response: tokens are extracted and replaced by a placeholder", () => {
  const body = { Message: "ok", StatusCode: 200, Data: { AccessToken: "AAA", RefreshToken: "RRR", ExpiresIn: 900, TokenType: "Bearer", UserRole: "Customer" } };
  const tokens = extractAndScrubTokens(body);

  assert.deepEqual(tokens, { accessToken: "AAA", refreshToken: "RRR", expiresIn: 900, role: "Customer" });
  assert.equal(body.Data.AccessToken, TOKEN_PLACEHOLDER);
  assert.equal(body.Data.RefreshToken, TOKEN_PLACEHOLDER);
  assert.equal(JSON.stringify(body).includes("AAA"), false);
  assert.equal(JSON.stringify(body).includes("RRR"), false);
  assert.equal(body.Data.TokenType, "Bearer"); // everything else is untouched
});

test("guest checkout: tokens nested deep inside an order response are found", () => {
  const body = { Data: { OrderId: 5, UserInfoDto: { UserName: "x", LoginTokenResponseModel: { AccessToken: "A1", RefreshToken: "R1", AccessTokenExpiresIn: 1800, UserRole: 2 } } } };
  const tokens = extractAndScrubTokens(body);

  assert.equal(tokens?.accessToken, "A1");
  assert.equal(tokens?.expiresIn, 1800);
  assert.equal(tokens?.role, "2");
  assert.equal(JSON.stringify(body).includes("A1"), false);
  assert.equal(body.Data.OrderId, 5);
});

test("camelCase and snake_case token names work; a response without a pair is left alone", () => {
  assert.equal(extractAndScrubTokens({ access_token: "a", refresh_token: "r", expires_in: 60 })?.expiresIn, 60);
  assert.equal(extractAndScrubTokens({ accessToken: "a", refreshToken: "r" })?.expiresIn, 3600);   // default

  const onlyAccess = { Data: { AccessToken: "a" } };           // no refresh token: nothing to keep a session with
  assert.equal(extractAndScrubTokens(onlyAccess), null);
  assert.equal(onlyAccess.Data.AccessToken, "a");
  assert.equal(extractAndScrubTokens({ Data: [1, 2, { x: 1 }] }), null);
  assert.equal(extractAndScrubTokens(null), null);
  assert.equal(extractAndScrubTokens("text"), null);
});

test("a placeholder or empty token is never mistaken for a real one", () => {
  assert.equal(extractAndScrubTokens({ AccessToken: TOKEN_PLACEHOLDER, RefreshToken: "r" }), null);
  assert.equal(extractAndScrubTokens({ AccessToken: "  ", RefreshToken: "r" }), null);
});

test("deeply nested junk does not run forever", () => {
  let node: Record<string, unknown> = { AccessToken: "a", RefreshToken: "r" };
  for (let i = 0; i < 20; i++) node = { child: node };
  assert.equal(extractAndScrubTokens(node), null);
});

test("session cookies: only the tokens are httpOnly, all are strict and path /", () => {
  const cookies = sessionCookies({ accessToken: "A", refreshToken: "R", expiresIn: 600, role: "Customer" }, true, 1_000_000);
  const byName = Object.fromEntries(cookies.map((c) => [c.name, c]));

  assert.equal(byName.accessToken.httpOnly, true);
  assert.equal(byName.refreshToken.httpOnly, true);
  assert.equal(byName.auth_expires_at.httpOnly, false);
  assert.equal(byName.auth_expires_at.value, String(1_000_000 + 600_000));
  assert.equal(byName.auth_session_until.value, String(1_000_000 + 14 * 86400 * 1000));
  assert.equal(byName.userRole.value, "Customer");
  assert.ok(cookies.every((c) => c.sameSite === "strict" && c.path === "/" && c.secure === true));

  const insecure = sessionCookies({ accessToken: "A", refreshToken: "R", expiresIn: 60 }, false);
  assert.ok(insecure.every((c) => c.secure === false));
  assert.equal(insecure.some((c) => c.name === "userRole"), false);
});

test("only api/... paths can be proxied, without path tricks", () => {
  assert.equal(isSafeApiPath(["api", "v1", "Cart", "GetCart", "current"]), true);
  assert.equal(isSafeApiPath(["session"]), false);
  assert.equal(isSafeApiPath(["api"]), false);
  assert.equal(isSafeApiPath(["api", "..", "admin"]), false);
  assert.equal(isSafeApiPath(["api", "v1", "%2e%2e"]), false);
  assert.equal(isSafeApiPath(["api", "v1", "a/b"]), false);
  assert.equal(isSafeApiPath(["", "api"]), false);
  assert.equal(isSafeApiPath(["admin", "x"]), false);
});

test("writes need a same-origin Origin header; reads do not", () => {
  assert.equal(isSameOrigin("GET", null, "shop.com"), true);
  assert.equal(isSameOrigin("POST", "https://shop.com", "shop.com"), true);
  assert.equal(isSameOrigin("POST", "http://localhost:3000", "localhost:3000"), true);
  assert.equal(isSameOrigin("POST", "https://evil.com", "shop.com"), false);
  assert.equal(isSameOrigin("POST", "https://shop.com.evil.com", "shop.com"), false);
  assert.equal(isSameOrigin("POST", null, "shop.com"), false);
  assert.equal(isSameOrigin("DELETE", "not a url", "shop.com"), false);
  assert.equal(isSameOrigin("PUT", "https://shop.com", null), false);
});

test("token endpoints are recognised", () => {
  assert.equal(isTokenEndpoint("api/v1/oauth/token"), true);
  assert.equal(isTokenEndpoint("api/v1/oauth/token/refresh"), true);
  assert.equal(isTokenEndpoint("api/v1/oauth/token/"), true);
  assert.equal(isTokenEndpoint("api/v1/Cart/GetCart/current"), false);
  assert.equal(isTokenEndpoint("api/v1/oauth/rider-login"), false);
});

test("backend config prefers the server-only names and falls back to the old public ones", () => {
  assert.deepEqual(backendConfig({ API_BACKEND_URL: "http://a/", API_SECURITY_KEY: " k " }), { baseUrl: "http://a", securityKey: "k" });
  assert.deepEqual(backendConfig({ NEXT_PUBLIC_API_KEY: "http://old", NEXT_PUBLIC_SECURITY_KEY: "oldk" }), { baseUrl: "http://old", securityKey: "oldk" });
  assert.deepEqual(backendConfig({ API_BACKEND_URL: "http://new", NEXT_PUBLIC_API_URL: "http://pub" }), { baseUrl: "http://new", securityKey: "" });
  assert.deepEqual(backendConfig({}), { baseUrl: "", securityKey: "" });
});

test("access expiry hint: expired, fresh and unknown", () => {
  const now = 1_000_000;
  assert.equal(isAccessExpired(String(now - 1), now), true);
  assert.equal(isAccessExpired(String(now + 60_000), now), false);
  assert.equal(isAccessExpired(String(now + 3_000), now), true);   // within the 5 s safety margin
  assert.equal(isAccessExpired(undefined, now), false);
  assert.equal(isAccessExpired("garbage", now), false);
});

test("refresh response: token pair is read and the old role is kept when the API omits it", () => {
  const t = tokensFromRefreshResponse({ StatusCode: 200, Data: { AccessToken: "n1", RefreshToken: "n2", ExpiresIn: 300 } }, "Customer");
  assert.deepEqual(t, { accessToken: "n1", refreshToken: "n2", expiresIn: 300, role: "Customer" });
  assert.equal(tokensFromRefreshResponse({ Message: "nope" }), null);
  assert.equal(tokensFromRefreshResponse(undefined), null);
});

test("header profile hint: only display claims are copied out of the access token", () => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = `${b64({ alg: "HS256" })}.${b64({ email: "a@b.c", FullName: "Ali Raza", role: "Customer", secret: "x", sub: "ali" })}.sig`;
  const cookies = sessionCookies({ accessToken: jwt, refreshToken: "R", expiresIn: 60 }, false);
  const profile = cookies.find((c) => c.name === "auth_profile");

  assert.ok(profile);
  assert.equal(profile.httpOnly, false);
  assert.deepEqual(JSON.parse(profile.value), { FullName: "Ali Raza", email: "a@b.c", sub: "ali" });
  assert.equal(profile.value.includes("secret"), false);
  assert.equal(sessionCookies({ accessToken: "not-a-jwt", refreshToken: "R", expiresIn: 60 }, false).some((c) => c.name === "auth_profile"), false);
});
