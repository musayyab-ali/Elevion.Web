import test from "node:test";
import assert from "node:assert/strict";
import { checkCardAmount, formatCodeInput, looksLikeCompleteCode, maxCardAmount } from "./gift-card-form.ts";

test("the most a card can pay is limited by the card and by keeping Rs. 1 to pay", () => {
  assert.equal(maxCardAmount({ balance: 500, applied: 0, payable: 1101 }), 500);
  assert.equal(maxCardAmount({ balance: 5000, applied: 0, payable: 1101 }), 1100);
  assert.equal(maxCardAmount({ balance: 5000, applied: 0, payable: 1 }), 0);
  assert.equal(maxCardAmount({ balance: 5000, applied: 0, payable: 1000.55 }), 999.55);
});

test("what the card already pays counts as available and as payable again", () => {
  // 200 already used: balance shows 300 left, order shows 901 to pay.
  assert.equal(maxCardAmount({ balance: 300, applied: 200, payable: 901 }), 500);
  assert.equal(maxCardAmount({ balance: 5000, applied: 200, payable: 901 }), 1100);
});

test("asking for too much is an error that says the limit", () => {
  const p = { balance: 50, applied: 0, payable: 1101 };
  assert.deepEqual(checkCardAmount("60", p), { ok: false, message: "This card only has Rs. 50." });
  assert.deepEqual(checkCardAmount("50", p), { ok: true, amount: 50 });
  assert.deepEqual(checkCardAmount("1101", { balance: 5000, applied: 0, payable: 1101 }), { ok: false, message: "You can use at most Rs. 1100 from this card on this order." });
  assert.deepEqual(checkCardAmount("10", { balance: 5000, applied: 0, payable: 1 }), { ok: false, message: "This card cannot be used on this order." });
});

test("empty, zero, negative and over-precise input are rejected with a reason", () => {
  const p = { balance: 500, applied: 0, payable: 1101 };
  for (const bad of ["", " ", "0", "-5", "abc"]) assert.equal(checkCardAmount(bad, p).ok, false);
  assert.deepEqual(checkCardAmount("10.555", p), { ok: false, message: "Use an amount with at most 2 decimals." });
  assert.deepEqual(checkCardAmount("10.55", p), { ok: true, amount: 10.55 });
});

test("the code box tidies what is typed", () => {
  assert.equal(formatCodeInput("gc"), "GC");
  assert.equal(formatCodeInput("gcab"), "GC-AB");
  assert.equal(formatCodeInput("gc abcd efgh jklm npqr"), "GC-ABCD-EFGH-JKLM-NPQR");
  assert.equal(formatCodeInput("GC-ABCD-EFGH-JKLM-NPQR-EXTRA"), "GC-ABCD-EFGH-JKLM-NPQR");   // cut at the right length
  assert.equal(formatCodeInput("gc!!@@ab"), "GC-AB");                                        // stray characters dropped
  assert.equal(looksLikeCompleteCode("GC-ABCD-EFGH-JKLM-NPQR"), true);
  assert.equal(looksLikeCompleteCode("GC-ABCD-EFGH"), false);
});
