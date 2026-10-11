import { test } from "node:test";
import assert from "node:assert/strict";
import {
  benefitIconClass,
  copyrightLine,
  defaultBranding,
  mailtoHref,
  pageHref,
  pageTitle,
  parseBranding,
  safeWebUrl,
  telHref,
} from "./branding-model.ts";

const FULL = {
  ShopName: " Demo Mart ",
  Email: "hello@demo.example",
  Phone: "+92 313 7675517",
  Address: "1 Main Road",
  Copyright: "(c) 2026 Demo",
  NewsletterText: "Join us",
  Theme: { Preset: "ocean", Colors: { black: "#0b2545", purple: "#1d7afc", green: "#bde9f5", surface: "#abc", red: "not a colour", extra: "#000000" } },
  Benefits: [{ Icon: "truck", Title: "Free delivery", Description: "Over 5000" }, { Icon: "nonsense", Title: "Odd icon", Description: "" }, { Icon: "star", Title: "  " }],
  Social: [
    { Platform: "Facebook", Name: "Facebook", Url: "https://facebook.com/demo" },
    { Platform: "instagram", Name: "Instagram", Url: "javascript:alert(1)" },
    { Platform: "tiktok", Name: "TikTok", Url: "" },
  ],
  Pages: [{ Key: "about", Title: "About us" }, { Key: "mystery", Title: "Nope" }, { Key: "FAQ", Title: "Faqs" }],
};

test("a full answer is read as the shop's branding", () => {
  const b = parseBranding(FULL, "Fallback");
  assert.equal(b.shopName, "Demo Mart");
  assert.equal(b.email, "hello@demo.example");
  assert.equal(b.phone, "+92 313 7675517");
  assert.equal(b.address, "1 Main Road");
  assert.equal(b.copyright, "(c) 2026 Demo");
  assert.equal(b.newsletterText, "Join us");
  assert.equal(b.theme.preset, "ocean");
  assert.deepEqual(b.theme.colors, { black: "#0b2545", purple: "#1d7afc", green: "#bde9f5", surface: "#abc" });
});

test("benefits keep only complete rows with a known icon", () => {
  const b = parseBranding(FULL, "x");
  assert.deepEqual(b.benefits.map((x) => [x.icon, x.title]), [["truck", "Free delivery"], ["star", "Odd icon"]]);
  const many = parseBranding({ Benefits: Array.from({ length: 9 }, (_, i) => ({ Icon: "gift", Title: `T${i}` })) }, "x");
  assert.equal(many.benefits.length, 6);
});

test("only real web addresses become social links", () => {
  const b = parseBranding(FULL, "x");
  assert.deepEqual(b.social.map((s) => [s.platform, s.url]), [["facebook", "https://facebook.com/demo"]]);
  assert.equal(safeWebUrl("javascript:alert(1)"), null);
  assert.equal(safeWebUrl("data:text/html,x"), null);
  assert.equal(safeWebUrl("ftp://x.example"), null);
  assert.equal(safeWebUrl("not a url"), null);
  assert.equal(safeWebUrl(5), null);
  assert.equal(safeWebUrl("http://new.com"), "http://new.com/");
});

test("only known kinds of page are kept", () => {
  const b = parseBranding(FULL, "x");
  assert.deepEqual(b.pages.map((p) => p.key), ["about", "faq"]);
  assert.equal(pageHref("terms"), "/pages/terms-and-conditions");
  assert.equal(pageHref("privacy"), "/pages/privacy-policy");
  assert.equal(pageHref("nope"), null);
});

test("nothing or rubbish gives the neutral default, never an error", () => {
  for (const raw of [undefined, null, 5, "x", [], {}]) {
    const b = parseBranding(raw, "Shop");
    assert.equal(b.shopName, "Shop");
    assert.equal(b.email, null);
    assert.deepEqual(b.benefits, []);
    assert.deepEqual(b.social, []);
    assert.deepEqual(b.theme.colors, {});
  }
  assert.equal(defaultBranding("").shopName, "Our Store");
});

test("text is cleaned and cut", () => {
  const b = parseBranding({ ShopName: "A\u0000B\n  C", Address: "x".repeat(900), Email: 42 }, "x");
  assert.equal(b.shopName, "AB C");
  assert.equal(b.address?.length, 500);
  assert.equal(b.email, null);
});

test("phone and email links are safe", () => {
  assert.equal(telHref("+92 313-7675517"), "tel:+923137675517");
  assert.equal(telHref("(021) 345 6789"), "tel:0213456789");
  assert.equal(telHref("abc"), null);
  assert.equal(telHref(null), null);
  assert.equal(mailtoHref("a@b.co"), "mailto:a@b.co");
  assert.equal(mailtoHref("a b@c.com"), null);
  assert.equal(mailtoHref(null), null);
});

test("the copyright line is the shop's own or the name with the year", () => {
  assert.equal(copyrightLine(parseBranding(FULL, "x"), 2026), "(c) 2026 Demo");
  assert.equal(copyrightLine(defaultBranding("Demo"), 2026), "© 2026 Demo. All Rights Reserved.");
});

test("benefit icons map to the storefront's icon font", () => {
  assert.equal(benefitIconClass("truck"), "icon-delivery-truck");
  assert.equal(benefitIconClass("headset"), "icon-phone-call");
  assert.equal(benefitIconClass("star"), "icon-check-circle");
});

test("page titles carry the shop name", () => {
  assert.equal(pageTitle("Demo", "About us"), "About us | Demo");
  assert.equal(pageTitle("Demo"), "Demo");
});
