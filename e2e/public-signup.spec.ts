import { expect, test } from "@playwright/test";

import { loginAsAdmin, openInviteUrlForCard } from "./helpers";

test("public signup stays hidden when the flag is off", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByLabel("Public signup").uncheck();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await expect(
    page.getByText("Access stays operator-controlled while the stack hardens."),
  ).toBeVisible();
  await expect(page.getByLabel("Public signup")).not.toBeChecked();

  await page.goto("/signup");
  await expect(page).toHaveURL(/\/waitlist$/);
});

test("public pricing is visible while checkout stays hidden during the staged rollout", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByLabel("Self-serve provisioning").uncheck();
  await page.getByLabel("Platform billing visibility").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await expect(
    page.getByText("Capture founder demand now, provision deliberately later."),
  ).toBeVisible();

  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: "Choose the MicroSaaS Factory lane" })).toBeVisible();
  await expect(page.getByText("Growth")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start monthly checkout" })).toHaveCount(0);
  await expect(
    page.getByRole("article").getByRole("link", { name: "Start signup" }),
  ).toBeVisible();
});

test("default staged signup intent appears in admin and can be issued as an invite", async ({
  page,
}) => {
  const unique = Date.now().toString(36);
  const founderEmail = `signup-${unique}@example.com`;
  const workspaceName = `Signup Workspace ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByLabel("Self-serve provisioning").uncheck();
  await page.getByLabel("Platform billing visibility").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await expect(
    page.getByText("Capture founder demand now, provision deliberately later."),
  ).toBeVisible();
  await expect(page.getByLabel("Public signup")).toBeChecked();
  await expect(page.getByLabel("Platform billing visibility")).toBeChecked();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Register a founder intent" })).toBeVisible();
  await page.getByLabel("Founder name").fill("Signup Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Submit signup intent" }).click();

  await expect(
    page.getByText(
      "Your signup intent has been recorded. Workspace activation still stays behind operator review until self-serve provisioning is enabled.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Founder intent is now queued for operator review.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit signup intent" })).toHaveCount(0);

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
  await expect(
    page.getByText("Choose a lane, verify identity, and open a founder workspace."),
  ).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your founder workspace" })).toBeVisible();
  await page.getByLabel("Founder name").fill("Self Serve Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Save details and continue" }).click();

  await expect(page.getByText(`Signup details saved for ${workspaceName}.`)).toBeVisible();
  await expect(
    page.getByText("Workspace details are staged for activation."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue with Test Google" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Founder control tower" })).toBeVisible();
  await expect(page.getByText(workspaceName)).toBeVisible();
});

test("self-serve signup can activate through the test email-link path", async ({ page }) => {
  const unique = Date.now().toString(36);
  const founderEmail = `self-serve-email-${unique}@example.com`;
  const workspaceName = `Email Link ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByLabel("Self-serve provisioning").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();

  await page.goto("/signup");
  await page.getByLabel("Founder name").fill("Email Link Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Save details and continue" }).click();

  await expect(page.getByText(`Signup details saved for ${workspaceName}.`)).toBeVisible();
  await page.getByRole("button", { name: "Continue with Test Email Link" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Founder control tower" })).toBeVisible();
  await expect(page.getByText(workspaceName)).toBeVisible();
});

test("repeat signup with an existing founder email routes the user to login instead of reprovisioning", async ({
  page,
}) => {
  const unique = Date.now().toString(36);
  const founderEmail = `repeat-signup-${unique}@example.com`;
  const workspaceName = `Repeat Signup ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByLabel("Self-serve provisioning").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();

  await page.goto("/signup");
  await page.getByLabel("Founder name").fill("Repeat Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Save details and continue" }).click();
  await page.getByRole("button", { name: "Continue with Test Google" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.context().clearCookies();

  await page.goto("/signup");
  await page.getByLabel("Founder name").fill("Repeat Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill("Duplicate Workspace");
  await page.getByRole("button", { name: "Save details and continue" }).click();

  await expect(
    page.getByText("A founder workspace already exists for this email. Reopen it from founder login."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open founder login" })).toBeVisible();
  await expect(page.getByText(workspaceName, { exact: true }).first()).toBeVisible();
});
