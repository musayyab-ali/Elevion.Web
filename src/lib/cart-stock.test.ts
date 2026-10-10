import test from "node:test";
import assert from "node:assert/strict";
import { canIncrease, findStockIssues, stockNote, stockSummary, type StockLine } from "./cart-stock.ts";

const line = (quantity: number, available?: number | null, cartId = "1", name = "Suit"): StockLine => ({ cartId, name, quantity, available });

test("lines without a stock limit never have issues", () => {
  assert.deepEqual(findStockIssues([line(50, null), line(5, undefined)]), []);
  assert.equal(canIncrease(line(50, null)), true);
  assert.equal(stockNote(line(50, null)), null);
});

test("more in the cart than in stock is an 'over' issue with the amount to reduce to", () => {
  assert.deepEqual(findStockIssues([line(4, 3)]), [{ cartId: "1", name: "Suit", quantity: 4, available: 3, kind: "over" }]);
});

test("nothing left is a 'soldout' issue; negative stock counts as nothing", () => {
  assert.equal(findStockIssues([line(1, 0)])[0].kind, "soldout");
  assert.equal(findStockIssues([line(1, -2)])[0].kind, "soldout");
});

test("exactly the stock is fine", () => {
  assert.deepEqual(findStockIssues([line(3, 3)]), []);
});

test("the plus button stops at the stock", () => {
  assert.equal(canIncrease(line(2, 3)), true);
  assert.equal(canIncrease(line(3, 3)), false);
  assert.equal(canIncrease(line(4, 3)), false);
});

test("notes", () => {
  assert.equal(stockNote(line(1, 0)), "Out of stock");
  assert.equal(stockNote(line(4, 3)), "Only 3 left in stock (you have 4)");
  assert.equal(stockNote(line(3, 3)), "That is all we have: 3 in stock");
  assert.equal(stockNote(line(1, 4)), "Only 4 left");
  assert.equal(stockNote(line(1, 40)), null);
});

test("summary sentence", () => {
  assert.equal(stockSummary([]), null);
  assert.equal(
    stockSummary(findStockIssues([line(4, 3, "1"), line(2, 0, "2"), line(9, 1, "3")])),
    "2 items have more in your cart than we have in stock and 1 item is out of stock.",
  );
});
