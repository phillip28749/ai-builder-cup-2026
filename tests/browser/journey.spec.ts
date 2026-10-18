import { test, expect } from "@playwright/test";
test("brand to content to customer order", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your brand, in motion." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Brand Studio", exact: true }).click();
  await page.getByRole("button", { name: "Generate brand guidelines" }).click();
  await expect(page.getByLabel("Editable brand guidelines")).not.toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "Save brand", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Brand profile saved");
  await page.getByRole("link", { name: "Content Studio", exact: true }).click();
  await page.getByRole("button", { name: "Find the words" }).click();
  await expect(page.getByLabel("Your editable caption")).not.toHaveValue("");
  await page
    .getByLabel("Your editable caption")
    .fill("A thoughtful piece, made for your everyday. Discover Habi Home.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await page
    .getByLabel("Saved content")
    .selectOption({ label: "A story worth sharing" });
  await page.getByRole("button", { name: "Add to calendar" }).click();
  await expect(page.getByRole("status")).toContainText("Content planned");
  await page.getByRole("link", { name: "Customer Hub", exact: true }).click();
  await page
    .getByRole("link", { name: "Open storefront", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "From our hands to your home." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "A question? Let’s talk" }).click();
  await page
    .getByLabel("Message the store")
    .fill("Is the blanket available in Iloilo?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message.assistant").last()).toContainText(
    "Sample",
  );
  await page.getByRole("button", { name: "Prepare an order" }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Demo Customer");
  await page.getByLabel("Mobile number").fill("+639171234567");
  await page.getByRole("button", { name: "Review my request" }).click();
  await expect(
    page.getByRole("heading", { name: "One last look." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm & submit request" }).click();
  await expect(
    page.getByRole("heading", { name: "Your request is with the owner." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue exploring" }).click();
  await page.goto("/customers");
  await expect(page.getByText("Demo Customer ·")).toBeVisible();
  await page.getByRole("button", { name: "Accept order" }).click();
  await expect(page.getByRole("status")).toContainText("Order accepted");
  expect(errors).toEqual([]);
});
test("all workspace pages and storefront fit mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/dashboard",
    "/brand",
    "/content",
    "/calendar",
    "/audience",
    "/customers",
    "/s/habi-home",
    "/s/habi-home/chat",
  ]) {
    await page.goto(route);
    await expect(
      page
        .locator("h1:visible,h2:visible,.chat-panel-heading strong:visible")
        .first(),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if (route === "/dashboard")
      await page.screenshot({
        path: "test-results/overview-mobile.png",
        fullPage: true,
      });
  }
});
test("mobile navigation and order dialog keyboard access", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Brand Studio", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A brand that feels like you." }),
  ).toBeVisible();
  await page.goto("/s/habi-home/chat");
  await page.getByRole("button", { name: "Prepare an order" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(
          document.querySelector(".modal")?.contains(document.activeElement),
        ),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
