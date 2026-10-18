import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
test("restricted owner APIs require a verified Firebase session", async () => {
  const server = spawn(process.execPath, ["dist-server/index.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "8097",
      DEMO_MODE: "false",
      DATA_BACKEND: "local",
      K_SERVICE: "",
      OWNER_UID: "test-owner",
      FIREBASE_WEB_CONFIG: JSON.stringify({
        apiKey: "test",
        projectId: "test",
        authDomain: "test.invalid",
      }),
    },
    stdio: "pipe",
  });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch("http://127.0.0.1:8097/api/health")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.ok(ready);
    const missing = await fetch("http://127.0.0.1:8097/api/owner/state");
    assert.equal(missing.status, 401);
    for (const route of [
      "/api/owner/media",
      "/api/owner/media/config",
      "/api/owner/media/00000000-0000-4000-8000-000000000000/file",
    ]) {
      assert.equal((await fetch("http://127.0.0.1:8097" + route)).status, 401);
    }
    const invalid = await fetch("http://127.0.0.1:8097/api/owner/state", {
      headers: { Authorization: "Bearer forged-token" },
    });
    assert.equal(invalid.status, 401);
    const storefront = await fetch("http://127.0.0.1:8097/api/public/store");
    assert.equal(storefront.status, 200);
  } finally {
    server.kill();
    await new Promise<void>((r) => {
      if (server.exitCode !== null) r();
      else server.once("exit", () => r());
    });
  }
});
