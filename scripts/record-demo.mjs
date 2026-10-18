import { chromium } from "@playwright/test";
import { mkdir, rename } from "node:fs/promises";
await mkdir("output/video", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: "tmp/video", size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const base = "http://127.0.0.1:8088";
async function stage(text, seconds = 7) {
  await page.evaluate((text) => {
    document.getElementById("demo-caption")?.remove();
    const bar = document.createElement("div");
    bar.id = "demo-caption";
    bar.style.cssText =
      "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);padding:16px 24px;background:#143d33;color:white;border:1px solid #c7d5b0;border-radius:10px;z-index:99999;font:14px sans-serif;max-width:1100px;box-shadow:0 8px 25px #0003;text-align:center";
    bar.textContent = text + " | Local sample demo";
    document.body.append(bar);
  }, text);
  await page.waitForTimeout(seconds * 1000);
}
await page.goto(base + "/dashboard");
await page.getByRole("heading", { name: "Your brand, in motion." }).waitFor();
await stage(
  "AsensoPost Studio: a personal brand workspace for a business of one.",
);
await page.goto(base + "/brand");
await stage("Start with the creator’s story, values, and brand voice.");
await page.getByRole("button", { name: "Generate brand guidelines" }).click();
await page.getByLabel("Editable brand guidelines").waitFor();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Save brand", exact: true }).click();
await stage(
  "Editable guidelines guide the rest of the workspace. This recording uses labeled sample AI.",
);
await page.goto(base + "/content");
await page.getByRole("button", { name: "Find the words" }).click();
await page.waitForTimeout(500);
await page
  .getByLabel("Your editable caption")
  .fill(
    "A thoughtful home starts with a little story. Meet the hands behind Habi Home and discover our locally woven collection.",
  );
await stage("Create, edit, and preview a post using shared brand context.");
await page.getByRole("button", { name: "Save draft", exact: true }).click();
await page.waitForTimeout(500);
await page.goto(base + "/calendar");
await page
  .getByLabel("Saved content")
  .selectOption({ label: "A story worth sharing" });
await page.getByRole("button", { name: "Add to calendar" }).click();
await stage(
  "Plan the post. A scheduled item is not an externally published post.",
);
await page.goto(base + "/s/habi-home?c=demo-video");
await stage(
  "A campaign leads to a personal storefront with a small, clear collection.",
);
await page.goto(base + "/s/habi-home/chat?c=demo-video");
await page
  .getByLabel("Message the store")
  .fill("Is the blanket available in Iloilo?");
await page.getByRole("button", { name: "Send message", exact: true }).click();
await page.waitForTimeout(500);
await stage(
  "Customer replies use configured product information. Live Sheets and Gemini are supported adapters.",
);
await page.getByRole("button", { name: "Prepare an order" }).click();
await page
  .getByLabel("Your name", { exact: true })
  .fill("Sample Video Customer");
await page.getByLabel("Mobile number").fill("+639170000000");
await page.getByRole("button", { name: "Review my request" }).click();
await page.getByRole("heading", { name: "One last look." }).waitFor();
await stage(
  "The customer reviews contact details, fulfilment, and the server-calculated total.",
);
await page.getByRole("button", { name: "Confirm & submit request" }).click();
await page
  .getByRole("heading", { name: "Your request is with the owner." })
  .waitFor();
await stage(
  "Explicit confirmation submits a pending request. Stock has not been deducted.",
);
await page.goto(base + "/customers");
await page.getByRole("button", { name: "Accept order" }).last().click();
await page.waitForTimeout(500);
await stage(
  "The owner accepts the request. Only then does the application adjust stock.",
);
await page.getByRole("button", { name: "Conversations", exact: true }).click();
await stage(
  "The owner can read the conversation and take over customer replies.",
);
await page.goto(base + "/dashboard");
await stage(
  "One creator. One connected workflow. Built for Future of Work & Enterprise Productivity.",
  8,
);
const recording = await page.video().path();
await context.close();
await browser.close();
await rename(recording, "output/video/asensopost-local-preview.webm");
console.log(
  "Local sample preview saved to output/video/asensopost-local-preview.webm",
);
