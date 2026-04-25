import { expect, test } from "@playwright/test";

import { openInviteUrlForCard } from "./helpers";

test("public and workspace Help centers guide founders through the operating path", async ({
  page,
}) => {
  await page.goto("/help");
  await expect(
    page.getByRole("heading", {
      name: "Operational guidance for every founder using MicroSaaS Factory.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Help" }).first()).toBeVisible();
  await expect(page.getByText("Read this first").first()).toBeVisible();
  await expect(page.getByText("Checkout buttons are not visible.")).toBeVisible();

  const unique = Date.now().toString(36);
  const founderEmail = `help-${unique}@example.com`;
  const workspaceName = `Help Workspace ${unique}`;
  const productName = `Help Center Pilot ${unique}`;

  await page.goto("/admin");
  await page.getByLabel("Admin secret").fill("microsaas-admin");
  await page.getByRole("button", { name: "Enter admin console" }).click();
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create invite" }).click();

  await expect(page.getByText(workspaceName).first()).toBeVisible();
  await openInviteUrlForCard(page, { workspaceName, founderEmail });
  await page.getByLabel("Name").fill("Help Founder");
  await page.getByLabel("Invite email").fill(founderEmail);
  await page.getByRole("button", { name: "Activate workspace" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.getByLabel("Product name").fill(productName);
  await page.getByLabel("Vertical").fill("Founder operations");
  await page.getByLabel("Summary").fill("A lane used to verify workspace-aware Help guidance.");
  await page.getByLabel("Target user").fill("Solo technical founder");
  await page.getByLabel("Pricing hypothesis").fill("$99 per month");
  await page.getByLabel("Core problem").fill("Scattered launch and validation guidance");
  await page.getByRole("button", { name: "Create product" }).click();

  await expect(page.getByRole("link", { name: productName, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Help", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/help$/);
  await expect(
    page.getByRole("heading", { name: "Workspace-aware operating guide" }),
  ).toBeVisible();
  await expect(page.getByText(workspaceName).first()).toBeVisible();
  await expect(page.getByText("Triage CRM pressure").first()).toBeVisible();
  await expect(page.getByText(founderEmail).first()).toBeVisible();
  await expect(page.getByText(productName).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open lane" })).toBeVisible();
});
