import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
let server: ChildProcess;
let dir: string;
let cookie = "";
const base = "http://127.0.0.1:8098/api";
async function call(
  route: string,
  body?: unknown,
  method?: string,
  other = false,
) {
  const res = await fetch(base + route, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(!other && cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get("set-cookie");
  if (set && !other) cookie = set.split(";")[0];
  return { status: res.status, data: await res.json() };
}
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "asenso-test-"));
  server = spawn(process.execPath, ["dist-server/index.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "8098",
      DEMO_MODE: "true",
      DATA_BACKEND: "local",
      LOCAL_DATA_FILE: path.join(dir, "data.json"),
      GOOGLE_CLOUD_PROJECT: "",
      GOOGLE_SHEET_ID: "",
      GEMINI_MODEL: "",
      GEMINI_API_KEY: "",
      K_SERVICE: "",
    },
    stdio: "pipe",
  });
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(base + "/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  assert.ok(ready, "Test server starts");
});
after(async () => {
  if (server) {
    server.kill();
    await new Promise<void>((r) => {
      if (server.exitCode !== null) r();
      else server.once("exit", () => r());
    });
  }
  if (dir) await rm(dir, { recursive: true, force: true });
});
test("customer confirmation, privacy, retry safety, stock and human takeover", async () => {
  await call("/public/conversation");
  const chat = await call("/public/chat", {
    text: "Is the blanket available?",
    campaignId: "campaign-test",
  });
  assert.equal(chat.status, 200);
  const details = {
    productId: "p1",
    quantity: 2,
    branch: "Iloilo",
    name: "Demo Customer",
    phone: "+639171234567",
    method: "pickup",
    address: "",
    total: 1,
  };
  const draft = await call("/public/orders/draft", details);
  assert.equal(draft.status, 200);
  assert.equal(draft.data.total, 3600);
  assert.equal(draft.data.status, "draft");
  const unconfirmed = await call(
    "/public/orders/" + draft.data.id + "/submit",
    {},
  );
  assert.equal(unconfirmed.status, 400);
  const pending = await call("/public/orders/" + draft.data.id + "/submit", {
    confirm: true,
  });
  assert.equal(pending.data.status, "pending");
  assert.equal(pending.data.campaignId, "campaign-test");
  await call("/public/orders/" + draft.data.id + "/submit", { confirm: true });
  const stranger = await call(
    "/public/conversation",
    undefined,
    undefined,
    true,
  );
  assert.equal(stranger.data.orders.length, 0);
  assert.equal(stranger.data.conversation.messages.length, 0);
  const forbidden = await call(
    "/public/orders/" + draft.data.id + "/submit",
    { confirm: true },
    undefined,
    true,
  );
  assert.equal(forbidden.status, 400);
  let owner = (await call("/owner/state")).data;
  assert.equal(
    owner.orders.filter((o: any) => o.status === "pending").length,
    1,
  );
  assert.equal(owner.products[0].stock.Iloilo, 12);
  const accepted = await call(
    "/owner/orders/" + draft.data.id,
    { action: "confirm" },
    "PATCH",
  );
  assert.equal(accepted.data.status, "confirmed");
  await call("/owner/orders/" + draft.data.id, { action: "confirm" }, "PATCH");
  owner = (await call("/owner/state")).data;
  assert.equal(owner.products[0].stock.Iloilo, 10);
  const id = owner.conversations[0].id;
  await call("/owner/conversations/" + id, { mode: "human" }, "PATCH");
  const before = owner.conversations[0].messages.length;
  await call("/public/chat", { text: "Hello again" });
  let conversation = (await call("/public/conversation")).data.conversation;
  assert.equal(conversation.messages.length, before + 1);
  await call("/owner/conversations/" + id + "/messages", {
    text: "Hello from the owner.",
  });
  conversation = (await call("/public/conversation")).data.conversation;
  assert.equal(conversation.messages.at(-1).role, "staff");
  await call("/owner/conversations/" + id, { mode: "ai" }, "PATCH");
  await call("/public/chat", { text: "What does the blanket cost?" });
  conversation = (await call("/public/conversation")).data.conversation;
  assert.equal(conversation.messages.at(-1).role, "assistant");
});
test("brand context is saved and used by the labeled sample generator", async () => {
  const state = (await call("/owner/state")).data;
  await call(
    "/owner/brand",
    { ...state.brand, voice: "Calm and practical" },
    "PATCH",
  );
  const r = await call("/owner/generate", {
    kind: "content",
    topic: "A new collection",
  });
  assert.match(r.data.text, /Calm and practical/);
  assert.match(r.data.source, /Sample/);
});
test("content persists and scheduling requires a date", async () => {
  const payload = {
    title: "My draft",
    body: "Hello world",
    direction: "Natural light",
    audienceId: "a1",
    date: "",
    status: "draft",
  };
  assert.equal((await call("/owner/content", payload)).status, 200);
  const state = (await call("/owner/state")).data;
  const item = state.content[0];
  assert.equal(
    (await call("/owner/content/" + item.id, { status: "scheduled" }, "PATCH"))
      .status,
    400,
  );
  await call(
    "/owner/content/" + item.id,
    { status: "scheduled", date: "2026-10-18" },
    "PATCH",
  );
  const refreshed = (await call("/owner/state")).data;
  assert.equal(refreshed.content[0].status, "scheduled");
});
test("cancelling an order never changes stock and cannot later be accepted", async () => {
  const details = {
    productId: "p3",
    quantity: 1,
    branch: "Iloilo",
    name: "Sample Buyer",
    phone: "+639171234567",
    method: "pickup",
    address: "",
  };
  const draft = (await call("/public/orders/draft", details)).data;
  await call("/public/orders/" + draft.id + "/submit", { confirm: true });
  const result = await call(
    "/owner/orders/" + draft.id,
    { action: "cancel" },
    "PATCH",
  );
  assert.equal(result.data.status, "cancelled");
  assert.equal((await call("/owner/state")).data.products[2].stock.Iloilo, 3);
  assert.equal(
    (await call("/owner/orders/" + draft.id, { action: "confirm" }, "PATCH"))
      .status,
    400,
  );
});
