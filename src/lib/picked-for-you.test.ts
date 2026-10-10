import test from "node:test";
import assert from "node:assert/strict";
import { excludeSeen, topCategory } from "./picked-for-you.ts";
import type { RecentProduct } from "./recently-viewed.ts";

const r = (id: number, categoryId?: number, category = ""): RecentProduct => ({ id, name: `p${id}`, image: "", price: 1, categoryId, category });

test("most viewed category wins", () => {
  assert.deepEqual(topCategory([r(1, 5, "Jeans"), r(2, 7, "Shirts"), r(3, 7, "Shirts")]), { id: 7, name: "Shirts" });
});

test("a tie goes to the most recently viewed category", () => {
  assert.deepEqual(topCategory([r(1, 5, "Jeans"), r(2, 7, "Shirts")]), { id: 5, name: "Jeans" });
});

test("no category information means no suggestion", () => {
  assert.equal(topCategory([r(1), r(2)]), null);
  assert.equal(topCategory([]), null);
});

test("already seen products are not suggested again", () => {
  const result = excludeSeen([{ id: "1" }, { id: "9" }], [r(1, 5)]);
  assert.deepEqual(result, [{ id: "9" }]);
});
