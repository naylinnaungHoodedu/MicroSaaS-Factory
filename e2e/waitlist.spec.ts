import { expect, test } from "@playwright/test";

test("waitlist submission succeeds", async ({ page }) => {
  await page.goto("/waitlist");

  await page.getByLabel("Name").fill("Playwright Founder");
  await page.getByLabel("Email").fill("playwright-founder@example.com");
  await page
    .getByLabel("Current bottleneck")
    .fill("Research, validation, and launch work are split across too many tools.");
  await page
    .getByLabel("Current stack")
    .fill("GitHub, Cloud Run, Firestore, Stripe, Resend");

  await page.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(page).toHaveURL(/\/waitlist\?submitted=1$/);
  await expect(page.getByText("Your request has been recorded.")).toBeVisible();
});
