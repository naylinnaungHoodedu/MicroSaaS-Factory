import { expect, test } from "@playwright/test";

import { openInviteUrlForCard } from "./helpers";

test("applying a template to an existing product preserves existing work", async ({ page }) => {
  const unique = Date.now().toString(36);
  const founderEmail = `founder-template-${unique}@example.com`;
  const workspaceName = `Factory Template Apply ${unique}`;
  const productName = `Custom Search Pilot ${unique}`;
  const summary = "Existing founder thesis that should stay in place.";

  await page.goto("/admin");
  await page.getByLabel("Admin secret").fill("microsaas-admin");
  await page.getByRole("button", { name: "Enter admin console" }).click();

  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByText(workspaceName)).toBeVisible();
  await openInviteUrlForCard(page, { workspaceName, founderEmail });

  await page.getByLabel("Name").fill("Template Founder");
  await page.getByLabel("Invite email").fill(founderEmail);
  await page.getByRole("button", { name: "Activate workspace" }).click();

  await expect(page).toHaveURL(/\/app$/);

  await page.getByLabel("Product name").fill(productName);
  await page.getByLabel("Vertical").fill("Construction operations");
  await page.getByLabel("Summary").fill(summary);
  await page.getByLabel("Target user").fill("Project manager");
  await page.getByLabel("Pricing hypothesis").fill("$79/month");
  await page.getByLabel("Core problem").fill("Teams cannot find the right clause fast enough.");
  await page.getByRole("button", { name: "Create product" }).click();

  await page.getByRole("link", { name: productName, exact: true }).click();
  await expect(page).toHaveURL(/\/app\/products\/[^/]+$/);
  const productHeroSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: productName, exact: true }),
  });
  await expect(productHeroSection.getByText(summary, { exact: true })).toBeVisible();

  await page.getByLabel("Apply or replace template").selectOption("construction-document-search");
  await page.getByRole("button", { name: "Apply template" }).click();

  const workflowTemplateSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Workflow template" }),
  });
  await expect(
    workflowTemplateSection.getByText(
      "Project-scoped search and chat across specs, RFIs, drawings, and field documents.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(productHeroSection.getByText(summary, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ops" }).click();
  await expect(
    page.getByRole("heading", { name: "Construction Document Search guidance" }),
  ).toBeVisible();
  await expect(page.getByText("Recommended integrations")).toBeVisible();
});
