import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../server/seed.js";
import { validateOrder } from "../server/domain.js";
const details = {
  productId: "p1",
  quantity: 2,
  branch: "Iloilo",
  name: "Demo Customer",
  phone: "+639171234567",
  method: "pickup",
  address: "",
};
test("server computes total and ignores a forged client total", () => {
  const result = validateOrder(initialState(), { ...details, total: 1 });
  assert.equal(result.total, 3600);
});
test("rejects unsupported products, branches, quantities and missing delivery address", () => {
  for (const change of [
    { productId: "missing" },
    { branch: "Mars" },
    { quantity: 0 },
    { quantity: 0.5 },
    { quantity: 100 },
    { method: "delivery", address: "" },
    { phone: "x" },
  ])
    assert.throws(() =>
      validateOrder(initialState(), { ...details, ...change }),
    );
});
test("zero stock cannot be ordered", () =>
  assert.throws(() =>
    validateOrder(initialState(), {
      ...details,
      productId: "p2",
      branch: "Manila",
    }),
  ));
