import test from "node:test";
import assert from "node:assert/strict";
import { checkReturnForm, clampQuantity, estimateRefund, selectedItems, statusTone, type Pickable } from "./returns-form.ts";

const items: Pickable[] = [
  { orderProductId: 1, returnable: 3, unitAmount: 450 },
  { orderProductId: 2, returnable: 1, unitAmount: 200.5 },
  { orderProductId: 3, returnable: 0, unitAmount: 99 }, // already returned
];

test("quantities are whole numbers inside the allowed range", () => {
  assert.equal(clampQuantity(2.9, 3), 2);
  assert.equal(clampQuantity(9, 3), 3);
  assert.equal(clampQuantity(-4, 3), 0);
  assert.equal(clampQuantity(Number.NaN, 3), 0);
  assert.equal(clampQuantity(2, -1), 0);
});

test("only lines with a quantity are sent, and never more than can be returned", () => {
  assert.deepEqual(selectedItems(items, { 1: 2, 2: 0 }), [{ orderProductId: 1, quantity: 2 }]);
  assert.deepEqual(selectedItems(items, { 1: 99 }), [{ orderProductId: 1, quantity: 3 }]);
  assert.deepEqual(selectedItems(items, { 3: 1 }), []);                 // a line with nothing returnable is ignored
  assert.deepEqual(selectedItems(items, { 77: 1 }), []);                // a line that is not on the order is ignored
});

test("the estimate follows the picked quantities", () => {
  assert.equal(estimateRefund(items, { 1: 2, 2: 1 }), 1100.5);
  assert.equal(estimateRefund(items, {}), 0);
});

test("the form needs an item, a reason and sane comments", () => {
  assert.deepEqual(checkReturnForm(items, {}, 3, ""), { ok: false, message: "Choose at least one item to return." });
  assert.deepEqual(checkReturnForm(items, { 1: 1 }, 0, ""), { ok: false, message: "Please choose a reason." });
  assert.equal(checkReturnForm(items, { 1: 1 }, 3, "x".repeat(1001)).ok, false);
  assert.equal(checkReturnForm(items, { 1: 1 }, 3, "zip broken").ok, true);
});

test("status tones", () => {
  assert.equal(statusTone("Requested"), "info");
  assert.equal(statusTone("Completed"), "good");
  assert.equal(statusTone("Rejected"), "bad");
  assert.equal(statusTone("Cancelled"), "neutral");
});
