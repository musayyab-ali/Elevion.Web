import { test } from "node:test";
import assert from "node:assert/strict";
import { isReportableProduct, SAME_VISIT_MS, shouldReportView } from "./activity-rules.ts";

test("a product never reported before is reported", () => {
  assert.equal(shouldReportView(undefined, 1_000), true);
  assert.equal(shouldReportView(Number.NaN, 1_000), true);
});

test("the same product is not reported again within the same visit", () => {
  const t = 10_000_000;
  assert.equal(shouldReportView(t, t + 1_000), false);
  assert.equal(shouldReportView(t, t + SAME_VISIT_MS - 1), false);
});

test("it is reported again once the visit gap has passed", () => {
  const t = 10_000_000;
  assert.equal(shouldReportView(t, t + SAME_VISIT_MS), true);
  assert.equal(shouldReportView(t, t + SAME_VISIT_MS * 3), true);
});

test("only positive whole product ids are reportable", () => {
  assert.equal(isReportableProduct(12), true);
  for (const bad of [0, -3, 1.5, Number.NaN, "12", null, undefined]) assert.equal(isReportableProduct(bad), false);
});
