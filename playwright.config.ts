import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8099",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "node dist-server/index.js",
    url: "http://127.0.0.1:8099/api/health",
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production",
      PORT: "8099",
      DEMO_MODE: "true",
      DATA_BACKEND: "local",
      LOCAL_DATA_FILE: "test-results/browser-workspace.json",
      GOOGLE_CLOUD_PROJECT: "",
      GOOGLE_SHEET_ID: "",
      GEMINI_MODEL: "",
      GEMINI_API_KEY: "",
      K_SERVICE: "",
    },
  },
});
