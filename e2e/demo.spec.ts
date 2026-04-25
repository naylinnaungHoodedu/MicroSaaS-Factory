import { expect, test } from "@playwright/test";

import { loginAsAdmin, openInviteUrlForCard } from "./helpers";

test("public and workspace Demo tabs show the read-only operating loop", async ({ page }) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", {
      name: "Demo the MicroSaaS Factory loop from signal to live revenue.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Demo" }).first()).toBeVisible();
  await expect(page.getByText("Public Demo Center").first()).toBeVisible();
  await expect(page.getByText("Understand the lane before you create or reopen a workspace.")).toBeVisible();
  await expect(page.getByText("Choose the commercial path")).toBeVisible();
  await expect(page.getByText("Six surfaces, one founder operating loop.")).toBeVisible();
  await expect(page.getByText("One operating rhythm from market signal to live revenue.")).toBeVisible();
  await expect(page.getByText("Does the Demo tab create or mutate workspace data?")).toBeVisible();

  const unique = Date.now().toString(36);
  const founderEmail = `demo-${unique}@example.com`;
  const workspaceName = `Demo Workspace ${unique}`;
  const productName = `Demo Center Pilot ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create invite" }).click();

  await expect(page.getByText(workspaceName).first()).toBeVisible();
  await openInviteUrlForCard(page, { workspaceName, founderEmail });
  await page.getByLabel("Name").fill("Demo Founder");
  await page.getByLabel("Invite email").fill(founderEmail);
  await page.getByRole("button", { name: "Activate workspace" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.getByLabel("Product name").fill(productName);
  await page.getByLabel("Vertical").fill("Founder operations");
  await page.getByLabel("Summary").fill("A lane used to verify workspace-aware Demo guidance.");
  await page.getByLabel("Target user").fill("Solo technical founder");
  await page.getByLabel("Pricing hypothesis").fill("$99 per month");
  await page.getByLabel("Core problem").fill("Disconnected launch and validation evidence");
  await page.getByRole("button", { name: "Create product" }).click();

  await expect(page.getByRole("link", { name: productName, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Demo", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/demo$/);
  await expect(
    page.getByRole("heading", {
      name: "Demo the operating loop with current workspace signals.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Workspace Demo Center").first()).toBeVisible();
  await expect(page.getByText(workspaceName).first()).toBeVisible();
  await expect(page.getByText(founderEmail).first()).toBeVisible();
  await expect(page.getByText("Start with the workspace signals already in view.")).toBeVisible();
  await expect(page.getByText("Triage validation pressure")).toBeVisible();
  await expect(page.getByText(productName).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open lane" })).toBeVisible();
});
