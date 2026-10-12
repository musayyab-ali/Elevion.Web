import test from "node:test";
import assert from "node:assert/strict";
import { hasRiderFeedback, tipChoices, parseTip, validStars } from "./rider-feedback.ts";

test("the card shows only when there is something to do or to remember", () => {
  assert.equal(hasRiderFeedback(null), false);
  assert.equal(hasRiderFeedback({ CanRate: false, CanTip: false, TipAmount: 0, MaxTip: 500 }), false);
  assert.equal(hasRiderFeedback({ CanRate: true, CanTip: false, TipAmount: 0, MaxTip: 500 }), true);
  assert.equal(hasRiderFeedback({ CanRate: false, CanTip: true, TipAmount: 0, MaxTip: 500 }), true);
  assert.equal(hasRiderFeedback({ CanRate: false, Stars: 4, CanTip: false, TipAmount: 0, MaxTip: 500 }), true);
  assert.equal(hasRiderFeedback({ CanRate: false, CanTip: false, TipAmount: 50, MaxTip: 500 }), true);
});

test("tip buttons never go above the shop's limit", () => {
  assert.deepEqual(tipChoices(500), [0, 50, 100, 200, 500]);
  assert.deepEqual(tipChoices(150), [0, 50, 100]);
  assert.deepEqual(tipChoices(0), [0]);
});

test("a custom tip is whole rupees within the limit", () => {
  assert.equal(parseTip("75", 500), 75);
  assert.equal(parseTip(" 0 ", 500), 0);
  assert.equal(parseTip("501", 500), null);
  assert.equal(parseTip("-5", 500), null);
  assert.equal(parseTip("12.5", 500), null);
  assert.equal(parseTip("abc", 500), null);
  assert.equal(parseTip("", 500), null);
});

test("stars are 1 to 5", () => {
  assert.equal(validStars(1), true);
  assert.equal(validStars(5), true);
  assert.equal(validStars(0), false);
  assert.equal(validStars(6), false);
  assert.equal(validStars(3.5), false);
});
