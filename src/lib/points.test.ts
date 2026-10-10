import test from "node:test";
import assert from "node:assert/strict";
import { checkPointsRequest, clampPoints, maxRedeemablePoints, pointsValue } from "./points.ts";

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

test("asking for more points than owned is an error, not a smaller number", () => {
  const base = { balance: 200, applied: 0, payable: 5000, rate: 1 };
  assert.deepEqual(checkPointsRequest("500", base), { ok: false, message: "You only have 200 reward points." });
  assert.deepEqual(checkPointsRequest("200", base), { ok: true, points: 200 });
  assert.deepEqual(checkPointsRequest("1", { ...base, balance: 1 }), { ok: true, points: 1 });
});

test("asking for more than the order can take says how many it can take", () => {
  const r = checkPointsRequest("600", { balance: 1000, applied: 0, payable: 500, rate: 1 });
  assert.deepEqual(r, { ok: false, message: "You can use at most 499 points on this order." });
});

test("empty, zero, negative and fractional input are rejected with a reason", () => {
  const base = { balance: 200, applied: 0, payable: 5000, rate: 1 };
  for (const bad of ["", "  ", "0", "-3", "abc"]) {
    const r = checkPointsRequest(bad, base);
    assert.equal(r.ok, false);
  }
  assert.deepEqual(checkPointsRequest("2.5", base), { ok: false, message: "Points must be a whole number." });
});

test("points already on the order count as owned", () => {
  // 100 applied, 20 left: 120 owned, so 120 is fine and 121 is not.
  const p = { balance: 20, applied: 100, payable: 400, rate: 1 };
  assert.equal(checkPointsRequest("120", p).ok, true);
  assert.deepEqual(checkPointsRequest("121", p), { ok: false, message: "You only have 120 reward points." });
});
