import { expect, test } from "@playwright/test";

import { openInviteUrlForCard } from "./helpers";

test("admin invite creation and founder onboarding flow succeeds", async ({ page }) => {
  const unique = Date.now().toString(36);
  const founderEmail = `founder-e2e-${unique}@example.com`;
  const workspaceName = `Factory Lab E2E ${unique}`;
  const productName = `Factory OEE Pilot ${unique}`;

  await page.goto("/admin");
  await page.getByLabel("Admin secret").fill("microsaas-admin");
  await page.getByRole("button", { name: "Enter admin console" }).click();

  await expect(page.getByRole("heading", { name: "Issue invites and control beta exposure." })).toBeVisible();

  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create invite" }).click();

  await expect(page.getByText(workspaceName)).toBeVisible();
  await openInviteUrlForCard(page, { workspaceName, founderEmail });

  await expect(page).toHaveURL(/\/invite\//);
  await page.getByLabel("Name").fill("Founder E2E");
  await page.getByLabel("Invite email").fill(founderEmail);
  await page.getByRole("button", { name: "Activate workspace" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Founder control tower" })).toBeVisible();
  await expect(page.getByText(workspaceName)).toBeVisible();

  await page.getByLabel("Template").selectOption("oee-dashboard");
  await expect(
    page.getByText(
      "Operations dashboard for Availability, Performance, and Quality across plant lines.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Vertical")).toHaveValue("Manufacturing operations");
  await page.getByLabel("Product name").fill(productName);
  await page.getByRole("button", { name: "Create product" }).click();

  await expect(
    page.getByRole("link", { name: productName, exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("link", { name: productName, exact: true }).click();
  await expect(page).toHaveURL(/\/app\/products\/[^/]+$/);

  const workflowTemplateSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Workflow template" }),
  });
  await expect(
    workflowTemplateSection.getByText(
      "Operations dashboard for Availability, Performance, and Quality across plant lines.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Research" }).click();
  await expect(page.getByRole("heading", { name: "OEE Dashboard guidance" })).toBeVisible();
  await expect(page.getByText("Pricing band")).toBeVisible();
  await page.getByRole("link", { name: "Spec" }).click();
  await expect(page.getByRole("heading", { name: "OEE Dashboard guidance" })).toBeVisible();
  await expect(page.getByText("Definition of done frame")).toBeVisible();
});
