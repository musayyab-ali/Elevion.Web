import test from "node:test";
import assert from "node:assert/strict";
import { clampPoints, maxRedeemablePoints, pointsValue } from "./points.ts";

test("limited by the balance", () => {
  assert.equal(maxRedeemablePoints({ balance: 120, applied: 0, payable: 5000, rate: 1 }), 120);
});

test("limited so the order never becomes free", () => {
  // Rs. 500 to pay at Rs. 1 per point: at most 499 points, so Rs. 1 is left.
  assert.equal(maxRedeemablePoints({ balance: 10000, applied: 0, payable: 500, rate: 1 }), 499);
  assert.equal(maxRedeemablePoints({ balance: 10000, applied: 0, payable: 500, rate: 2 }), 249);
});

test("points already applied count as owned and are added back to the amount", () => {
  // 100 points (Rs. 100) are applied: balance shows 20 left, Rs. 400 still to pay.
  // Owned = 20 + 100 = 120; the amount would allow 499, so the balance is the limit.
  assert.equal(maxRedeemablePoints({ balance: 20, applied: 100, payable: 400, rate: 1 }), 120);
  // Same order but only Rs. 150 payable after the applied points: Rs. 250 gross -> at most 249 points, balance 120 limits.
  assert.equal(maxRedeemablePoints({ balance: 20, applied: 100, payable: 150, rate: 1 }), 120);
  assert.equal(maxRedeemablePoints({ balance: 500, applied: 100, payable: 150, rate: 1 }), 249);
});

test("no rate or nothing to pay means no points", () => {
  assert.equal(maxRedeemablePoints({ balance: 50, applied: 0, payable: 500, rate: 0 }), 0);
  assert.equal(maxRedeemablePoints({ balance: 50, applied: 0, payable: 0, rate: 1 }), 0);
});

test("typed values are clamped to whole points inside the allowed range", () => {
  assert.equal(clampPoints("12.9", 50), 12);
  assert.equal(clampPoints("999", 50), 50);
  assert.equal(clampPoints("-4", 50), 0);
  assert.equal(clampPoints("abc", 50), 0);
  assert.equal(clampPoints("", 50), 0);
});

test("value of points", () => {
  assert.equal(pointsValue(30, 2), 60);
  assert.equal(pointsValue(-5, 2), 0);
});
