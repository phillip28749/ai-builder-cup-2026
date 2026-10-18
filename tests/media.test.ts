import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import sharp from "sharp";
import { GenerateVideosOperation } from "@google/genai";
import type { Server } from "node:http";
import { createMediaRouter } from "../server/media-router.js";
import {
  normalizeUpload,
  safeProviderError,
} from "../server/media-provider.js";

let server: Server;
let base: string;
let dir: string;
let sourceId: string;
let imageCalls = 0;
let videoCalls = 0;
let pollCalls = 0;
let rejectImages = false;
let seenPrompt = "";
let picture: Buffer;
const testKey = "unit-test-key-not-real";
async function call(url: string, body?: unknown) {
  const res = await fetch(base + url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "asenso-media-test-"));
  process.env.LOCAL_DATA_FILE = path.join(dir, "workspace.json");
  process.env.GEMINI_API_KEY = testKey;
  picture = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#dbb991" },
  })
    .png()
    .toBuffer();
  const app = express();
  app.use(express.json({ limit: "6mb" }));
  app.use(
    createMediaRouter({
      generatePhoto: async (_bytes, mime, prompt) => {
        imageCalls++;
        assert.equal(mime, "image/jpeg");
        seenPrompt = prompt;
        if (rejectImages) throw new Error("API key invalid " + testKey);
        return picture;
      },
      beginVideo: async () => {
        videoCalls++;
        return Object.assign(new GenerateVideosOperation(), {
          name: "models/test/operations/private-operation",
        });
      },
      inspectVideo: async () => {
        pollCalls++;
        return Object.assign(
          new GenerateVideosOperation(),
          pollCalls === 1
            ? { done: false }
            : {
                done: true,
                response: {
                  generatedVideos: [
                    { video: { mimeType: "video/mp4", videoBytes: "AAAA" } },
                  ],
                },
              },
        );
      },
      downloadVideo: async () =>
        Buffer.from("explicit mocked video fixture - not a real video"),
    }),
  );
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
      .startsWith(path.resolve(tmpdir()) + path.sep + "asenso-media-test-"),
  );
  await rm(dir, { recursive: true, force: true });
  delete process.env.GEMINI_API_KEY;
  delete process.env.LOCAL_DATA_FILE;
});
test("upload validates and normalizes real image bytes, without exposing the key", async () => {
  const bad = await call("/upload", {
    name: "bad.png",
    mimeType: "image/png",
    data: Buffer.from("not an image").toString("base64"),
  });
  assert.equal(bad.status, 400);
  const upload = await call("/upload", {
    name: "product.png",
    mimeType: "image/png",
    data: picture.toString("base64"),
  });
  assert.equal(upload.status, 200);
  assert.equal(upload.data.kind, "reference");
  assert.equal(upload.data.mimeType, "image/jpeg");
  sourceId = upload.data.id;
  const file = await fetch(base + "/" + sourceId + "/file");
  const normalized = Buffer.from(await file.arrayBuffer());
  assert.equal(normalized[0], 0xff);
  assert.equal(normalized[1], 0xd8);
  const config = await call("/config");
  assert.equal(config.data.keyConfigured, true);
  assert.ok(!JSON.stringify(config.data).includes(testKey));
});
test("image generation uses uploaded bytes and shared brand context; failures never become fake images", async () => {
  const created = await call("/generate", {
    kind: "product",
    sourceAssetId: sourceId,
    prompt: "Warm studio photograph",
    aspectRatio: "1:1",
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.asset.kind, "image");
  assert.equal(created.data.asset.sourceAssetId, sourceId);
  assert.match(seenPrompt, /Habi Home/);
  assert.match(seenPrompt, /Preserve the actual product/);
  assert.equal(imageCalls, 1);
  const before = (await call("/")).data.assets.length;
  rejectImages = true;
  const rejected = await call("/generate", {
    kind: "advertisement",
    sourceAssetId: sourceId,
    prompt: "A realistic kitchen scene",
    aspectRatio: "16:9",
  });
  assert.equal(rejected.status, 400);
  assert.ok(!JSON.stringify(rejected.data).includes(testKey));
  assert.equal((await call("/")).data.assets.length, before);
  rejectImages = false;
});
test("video operations persist, are idempotent, and complete only after polling", async () => {
  const requestId = "ab1cb6d9-b2c8-4fd4-b870-a2613e89ec10";
  const payload = {
    requestId,
    kind: "video",
    sourceAssetId: sourceId,
    prompt: "Slow product camera move",
    aspectRatio: "16:9",
  };
  const started = await call("/generate", payload);
  assert.equal(started.data.job.status, "processing");
  assert.ok(!("operationName" in started.data.job));
  await call("/generate", payload);
  assert.equal(videoCalls, 1);
  const pending = await call("/jobs/" + requestId + "/check", {});
  assert.equal(pending.data.status, "processing");
  const done = await call("/jobs/" + requestId + "/check", {});
  assert.equal(done.data.status, "ready");
  assert.equal(done.data.assetId, requestId);
  const repeated = await call("/jobs/" + requestId + "/check", {});
  assert.equal(repeated.data.status, "ready");
  assert.equal(pollCalls, 2);
  const library = (await call("/")).data;
  assert.equal(library.assets.filter((a: any) => a.kind === "video").length, 1);
});
test("missing key blocks billable requests and invalid image limits are rejected", async () => {
  delete process.env.GEMINI_API_KEY;
  const before = imageCalls;
  const result = await call("/generate", {
    kind: "product",
    sourceAssetId: sourceId,
    prompt: "Bright studio product",
    aspectRatio: "1:1",
  });
  assert.equal(result.status, 400);
  assert.match(result.data.error, /GEMINI_API_KEY/);
  assert.equal(imageCalls, before);
  process.env.GEMINI_API_KEY = testKey;
  await assert.rejects(
    () => normalizeUpload(Buffer.alloc(4 * 1024 * 1024 + 1)),
    /4 MB/,
  );
  assert.match(safeProviderError(new Error("quota 429 " + testKey)), /quota/);
});
