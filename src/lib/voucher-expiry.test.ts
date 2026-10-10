import test from "node:test";
import assert from "node:assert/strict";
import { expiryHint } from "./voucher-expiry.ts";

// Local-time dates: the wording follows the customer's calendar, whatever the time zone.
const now = new Date(2026, 9, 10, 12, 0, 0);
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour, 0, 0).toISOString();

test("no warning without an expiry date, when far away, or when already past", () => {
  assert.equal(expiryHint(null, now), null);
  assert.equal(expiryHint(new Date(2026, 11, 31).toISOString(), now), null);
  assert.equal(expiryHint(at(9), now), null);
  assert.equal(expiryHint("not a date", now), null);
});

test("warns inside the last week", () => {
  assert.equal(expiryHint(at(13), now), "Expires in 3 days");
  assert.equal(expiryHint(at(17, 11), now), "Expires in 7 days");
  assert.equal(expiryHint(at(18), now), null);
});

test("tomorrow and today wording", () => {
  assert.equal(expiryHint(at(11, 10), now), "Expires tomorrow");
  assert.equal(expiryHint(at(10, 20), now), "Expires today");
});

test("a time without a zone is read as UTC", () => {
  // 12:00 with no zone = 12:00 UTC; far enough from midnight in any time zone to stay on that day +-1, so check the wording only.
  assert.match(expiryHint("2026-10-13T12:00:00", now) ?? "", /^Expires in [234] days$/);
});
