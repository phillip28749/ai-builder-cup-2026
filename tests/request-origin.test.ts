import test from "node:test";
import assert from "node:assert/strict";
import { allowedRequestOrigin } from "../server/request-origin.js";

const settings = {
  publicOrigin: "https://ai-builder-cup-66e9f.web.app/",
  firebaseWebConfig: JSON.stringify({ projectId: "ai-builder-cup-66e9f" }),
};
const accepts = (origin: string) =>
  allowedRequestOrigin(origin, "backend.run.app", "https", settings);

test("accepts both exact Firebase Hosting domains behind the API proxy", () => {
  assert.equal(accepts("https://ai-builder-cup-66e9f.web.app"), true);
  assert.equal(accepts("https://ai-builder-cup-66e9f.firebaseapp.com"), true);
});
test("accepts explicit custom origins and local same-origin requests", () => {
  assert.equal(
    allowedRequestOrigin(
      "https://shop.example.com",
      "backend.run.app",
      "https",
      { publicOrigin: "https://shop.example.com/" },
    ),
    true,
  );
  assert.equal(
    allowedRequestOrigin("http://localhost:8088", "localhost:8088", "http", {}),
    true,
  );
  assert.equal(
    allowedRequestOrigin("http://localhost:8089", "localhost:8088", "http", {}),
    false,
  );
});
test("blocks other projects, lookalike domains, insecure aliases and malformed origins", () => {
  for (const origin of [
    "https://other-project.web.app",
    "https://other-project.firebaseapp.com",
    "https://ai-builder-cup-66e9f.web.app.attacker.example",
    "http://ai-builder-cup-66e9f.firebaseapp.com",
    "https://attacker.example",
    "null",
    "invalid",
    "https://ai-builder-cup-66e9f.web.app/private",
    "https://user@ai-builder-cup-66e9f.web.app",
  ])
    assert.equal(accepts(origin), false, origin);
});
test("invalid Firebase configuration does not allow unknown hosts", () => {
  assert.equal(
    allowedRequestOrigin(
      "https://other-project.web.app",
      "backend.run.app",
      "https",
      { firebaseWebConfig: "invalid" },
    ),
    false,
  );
});
