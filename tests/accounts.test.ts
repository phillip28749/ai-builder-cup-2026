import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { DecodedIdToken } from "firebase-admin/auth";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { createOwnerAuth } from "../server/auth.js";
import { load, save, locked } from "../server/store.js";
import { workspaceId } from "../server/workspace.js";
import { createMediaRouter } from "../server/media-router.js";
import { configuredSheetId } from "../server/sheets.js";
let server: Server;
let base: string;
let dir: string;
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "asenso-accounts-"));
  process.env.LOCAL_DATA_FILE = path.join(dir, "workspace.json");
  process.env.GOOGLE_SHEET_ID = "demo-sheet-must-not-leak";
  const app = express();
  app.use(express.json({ limit: "6mb" }));
  app.use(
    createOwnerAuth({
      demo: false,
      verify: async (token) => {
        if (!["alice", "bob", "email-user"].includes(token))
          throw new Error("Invalid token");
        return {
          uid: token,
          aud: "test-project",
          auth_time: 0,
          exp: 9999999999,
          iat: 0,
          iss: "https://securetoken.google.com/test-project",
          sub: token,
          name: token,
          email: token + "@example.test",
          firebase: {
            identities: { "google.com": [token] },
            sign_in_provider:
              token === "email-user" ? "password" : "google.com",
          },
        } as DecodedIdToken;
      },
    }),
  );
  app.get("/state", async (_req, res) =>
    res.json({
      ...(await load()),
      workspaceId: workspaceId(),
      sheetId: configuredSheetId() || null,
    }),
  );
  app.patch("/brand", async (req, res) => {
    await locked(async () => {
      const s = await load();
      s.brand.name = req.body.name;
      await save(s);
    });
    res.json({ ok: true });
  });
  app.use("/media", createMediaRouter());
  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => res.status(400).json({ error: error.message }),
  );
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  assert.ok(
    path
      .resolve(dir)
      .startsWith(path.resolve(tmpdir()) + path.sep + "asenso-accounts-"),
  );
  await rm(dir, { recursive: true, force: true });
  delete process.env.LOCAL_DATA_FILE;
  delete process.env.GOOGLE_SHEET_ID;
});
async function call(
  user: string,
  route: string,
  body?: unknown,
  method?: string,
) {
  const res = await fetch(base + route, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      Authorization: "Bearer " + user,
      "Content-Type": "application/json",
      "X-Workspace": "habi-home",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
test("Google accounts get distinct persistent workspaces and cannot select another workspace by header", async () => {
  const [a, b] = await Promise.all([
    call("alice", "/state"),
    call("bob", "/state"),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.notEqual(a.data.workspaceId, b.data.workspaceId);
  assert.equal(a.data.brand.name, "Your brand");
  assert.equal(a.data.sheetId, null);
  await Promise.all([
    call("alice", "/brand", { name: "Alice Studio" }, "PATCH"),
    call("bob", "/brand", { name: "Bob Studio" }, "PATCH"),
  ]);
  assert.equal((await call("alice", "/state")).data.brand.name, "Alice Studio");
  assert.equal((await call("bob", "/state")).data.brand.name, "Bob Studio");
});
test("media files are isolated between Google accounts", async () => {
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#c9aa82" },
  })
    .png()
    .toBuffer();
  const uploaded = await call("alice", "/media/upload", {
    name: "alice.png",
    mimeType: "image/png",
    data: image.toString("base64"),
  });
  assert.equal(uploaded.status, 200);
  assert.equal((await call("bob", "/media")).data.assets.length, 0);
  assert.equal((await call("alice", "/media")).data.assets.length, 1);
  const forbidden = await fetch(base + "/media/" + uploaded.data.id + "/file", {
    headers: { Authorization: "Bearer bob" },
  });
  assert.notEqual(forbidden.status, 200);
  const own = await fetch(base + "/media/" + uploaded.data.id + "/file", {
    headers: { Authorization: "Bearer alice" },
  });
  assert.equal(own.status, 200);
});
test("invalid tokens and unsupported providers do not create access", async () => {
  assert.equal((await call("forged", "/state")).status, 401);
  assert.equal((await call("email-user", "/state")).status, 403);
});
