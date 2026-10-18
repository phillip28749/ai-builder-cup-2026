import { test, expect } from "@playwright/test";
test("Google account page explains setup and never simulates authentication", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Google sign-in needs one-time project setup.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("First time here?", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Just looking? Explore the sample studio" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your brand, in motion." }),
  ).toBeVisible();
});
