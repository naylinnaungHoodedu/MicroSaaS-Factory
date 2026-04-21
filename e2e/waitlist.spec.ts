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

  await expect(page).toHaveURL(/\/waitlist$/);
  await expect(page.getByText("Request recorded")).toBeVisible();
  await expect(
    page.getByText("Your request has been recorded. Return to the overview or wait for an invite."),
  ).toBeVisible();
  await expect(page.getByText("Playwright Founder")).toBeVisible();
  await expect(page.getByText("playwright-founder@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toHaveCount(0);
});
