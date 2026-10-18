import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("product upload, connection guidance, and attaching a real photo to a draft", async ({
  page,
}) => {
  await page.goto("/content");
  await page.getByRole("button", { name: "Product photos & video" }).click();
  await expect(
    page.getByText("Generation setup & connection status"),
  ).toBeVisible();
  await expect(
    page.getByText("Gemini API key needed", { exact: true }),
  ).toBeVisible();
  const image = await sharp({
    create: { width: 400, height: 400, channels: 3, background: "#be9d72" },
  })
    .png()
    .toBuffer();
  await page.getByLabel("Upload product photo").setInputFiles({
    name: "sample-product.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(
    page.getByText(
      "Product photo uploaded. Choose a creative type and describe the scene.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate product shot", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Your uploaded reference" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use in post", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Content title", { exact: true })
    .fill("Uploaded photo draft");
  await page
    .getByLabel("Your editable caption")
    .fill("A thoughtful product photo, ready for our next post.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const state = await (await page.request.get("/api/owner/state")).json();
  expect(
    state.content.find((c: any) => c.title === "Uploaded photo draft")
      .mediaAssetId,
  ).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "Product photos & video" }).click();
  await expect(
    page.getByText("sample-product.png", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator(".sidebar")
        .evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  await page
    .getByLabel("Or use a saved photo")
    .selectOption({ label: "sample-product.png · Uploaded" });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/content-media-mobile.png",
    fullPage: true,
  });
});
