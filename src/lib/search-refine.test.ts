import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_REFINEMENT, categoryFacets, refineProducts, type RefinableProduct } from "./search-refine.ts";

const p = (name: string, category: string, price: number, extra: Partial<RefinableProduct> = {}): RefinableProduct => ({
  name,
  category,
  price,
  new: false,
  sale: false,
  ...extra,
});

const items = [
  p("Blue Jeans", "Jeans", 3000, { new: true }),
  p("Slim Shirt", "Shirts", 1500, { sale: true }),
  p("Jeans Jacket", "Jackets", 5000, { inStock: false }),
  p("Cotton Tee", "Shirts", 450),
];

test("price sorting works both ways", () => {
  assert.deepEqual(refineProducts(items, { ...DEFAULT_REFINEMENT, sort: "price-asc" }).map((i) => i.price), [450, 1500, 3000, 5000]);
  assert.deepEqual(refineProducts(items, { ...DEFAULT_REFINEMENT, sort: "price-desc" }).map((i) => i.price), [5000, 3000, 1500, 450]);
});

test("category, stock and sale filters combine", () => {
  assert.equal(refineProducts(items, { ...DEFAULT_REFINEMENT, category: "Shirts" }).length, 2);
  assert.equal(refineProducts(items, { ...DEFAULT_REFINEMENT, inStockOnly: true }).some((i) => i.name === "Jeans Jacket"), false);
  assert.deepEqual(refineProducts(items, { ...DEFAULT_REFINEMENT, onSaleOnly: true }).map((i) => i.name), ["Slim Shirt"]);
});

test("unknown stock state counts as available", () => {
  assert.equal(refineProducts([p("A", "X", 1)], { ...DEFAULT_REFINEMENT, inStockOnly: true }).length, 1);
  assert.equal(refineProducts([p("A", "X", 1, { comingSoon: true })], { ...DEFAULT_REFINEMENT, inStockOnly: true }).length, 0);
});

test("best match puts name matches before others and keeps API order inside a group", () => {
  const result = refineProducts(items, DEFAULT_REFINEMENT, "jeans").map((i) => i.name);
  assert.deepEqual(result.slice(0, 2), ["Blue Jeans", "Jeans Jacket"].sort((a, b) => result.indexOf(a) - result.indexOf(b)));
  assert.equal(result[0], "Jeans Jacket"); // starts with the query -> rank 1, before "Blue Jeans" (contains -> rank 2)
});

test("input is never mutated", () => {
  const copy = items.map((i) => i.name);
  refineProducts(items, { ...DEFAULT_REFINEMENT, sort: "price-desc" });
  assert.deepEqual(items.map((i) => i.name), copy);
});

test("category facets are counted and ordered", () => {
  assert.deepEqual(categoryFacets(items), [
    { name: "Shirts", count: 2 },
    { name: "Jackets", count: 1 },
    { name: "Jeans", count: 1 },
  ]);
});
