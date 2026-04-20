import { expect, test } from "@playwright/test";

import { loginAsAdmin, openInviteUrlForCard } from "./helpers";

test("public signup stays hidden when the flag is off", async ({ page }) => {
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/waitlist$/);
});

test("flag-gated signup intent appears in admin and can be issued as an invite", async ({
  page,
}) => {
  const unique = Date.now().toString(36);
  const founderEmail = `signup-${unique}@example.com`;
  const workspaceName = `Signup Workspace ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await page.waitForLoadState("networkidle");
  await page.goto("/admin");
  await expect(page.getByLabel("Public signup")).toBeChecked();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Register a founder intent" })).toBeVisible();
  await page.getByLabel("Founder name").fill("Signup Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Submit signup intent" }).click();

  await expect(page.getByText("Your signup intent has been recorded.")).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByText(workspaceName)).toBeVisible();
  await expect(page.getByText(founderEmail)).toBeVisible();
  await page.getByRole("button", { name: "Issue invite" }).click();
  await expect(page.locator('a[href^="/invite/"]').first()).toBeVisible();

  await openInviteUrlForCard(page, { workspaceName, founderEmail });
  await expect(page).toHaveURL(/\/invite\//);
});

test("self-serve signup provisions a founder workspace immediately", async ({ page }) => {
  const unique = Date.now().toString(36);
  const founderEmail = `self-serve-${unique}@example.com`;
  const workspaceName = `Self Serve ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByLabel("Self-serve provisioning").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your founder workspace" })).toBeVisible();
  await page.getByLabel("Founder name").fill("Self Serve Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Save details and continue" }).click();

  await expect(page.getByText(`Signup details saved for ${workspaceName}.`)).toBeVisible();
  await page.getByRole("button", { name: "Continue with Test Google" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Founder control tower" })).toBeVisible();
  await expect(page.getByText(workspaceName)).toBeVisible();
});
