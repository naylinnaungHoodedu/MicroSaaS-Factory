import { expect, test } from "@playwright/test";

import { loginAsAdmin, openInviteUrlForCard } from "./helpers";

test("founder can edit, archive, restore, and clone a product lane", async ({ page }) => {
  const unique = Date.now().toString(36);
  const founderEmail = `lifecycle-e2e-${unique}@example.com`;
  const workspaceName = `Lifecycle Lab ${unique}`;
  const productName = `Lifecycle Pilot ${unique}`;
  const updatedProductName = `${productName} Updated`;
  const definitionOfDone = `Lifecycle definition ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create invite" }).click();

  await expect(page.getByText(workspaceName)).toBeVisible();
  await openInviteUrlForCard(page, { workspaceName, founderEmail });

  await page.getByLabel("Name").fill("Lifecycle Founder");
  await page.getByLabel("Invite email").fill(founderEmail);
  await page.getByRole("button", { name: "Activate workspace" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.getByLabel("Template").selectOption("oee-dashboard");
  await page.getByLabel("Product name").fill(productName);
  await page.getByRole("button", { name: "Create product" }).click();
  await page.getByRole("link", { name: productName, exact: true }).click();

  await expect(page).toHaveURL(/\/app\/products\/[^/]+$/);
  const productId = page.url().split("/").at(-1)!;

  await page.getByLabel("Product name").fill(updatedProductName);
  await page.getByLabel("Summary").fill("Lifecycle-managed founder lane");
  await page.getByLabel("Vertical").fill("Industrial analytics");
  await page.getByLabel("Target user").fill("Solo founder operator");
  await page.getByLabel("Pricing hypothesis").fill("$79/month");
  await page.getByLabel("Core problem").fill("Too many disconnected portfolio lanes");
  await page.getByRole("button", { name: "Save product settings" }).click();

  await expect(page.getByRole("heading", { name: updatedProductName })).toBeVisible();

  await page.goto(`/app/products/${productId}/spec`);
  await page.getByLabel("Definition of done").fill(definitionOfDone);
  await page.getByRole("button", { name: "Save spec" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.getByLabel("Definition of done")).toHaveValue(definitionOfDone);

  await page.goto(`/app/products/${productId}/validate`);
  const leadsSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Log validation targets" }) });
  await leadsSection.getByLabel("Name").fill("Jamie Founder");
  await leadsSection.getByLabel("Email").fill(`jamie-${unique}@example.com`);
  await leadsSection.getByLabel("Company").fill("Factory Co");
  await leadsSection.getByLabel("Role").fill("Founder");
  await leadsSection.getByRole("button", { name: "Log validation lead" }).click();
  await expect(page.getByText("Jamie Founder", { exact: true })).toBeVisible();

  await page.goto(`/app/products/${productId}`);
  await page.getByLabel("Archive reason").fill("Sunsetting the original lane");
  await page.getByRole("button", { name: "Archive lane" }).click();
  await expect(page.getByText("Archived lane")).toBeVisible();

  await page.goto("/app");
  await page.reload();
  const activeSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Every active product remains accountable to a gate." }) });
  const archivedSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Archived lanes stay accessible without cluttering active rollups." }) });

  await expect(page.getByText("No active products")).toBeVisible();
  await expect(archivedSection.getByRole("link", { name: updatedProductName, exact: true })).toBeVisible();

  await archivedSection
    .locator("div")
    .filter({ hasText: updatedProductName })
    .getByRole("button", { name: "Restore" })
    .click();
  await expect(activeSection.getByRole("link", { name: updatedProductName, exact: true })).toBeVisible();

  await activeSection
    .locator("div")
    .filter({ hasText: updatedProductName })
    .getByRole("button", { name: "Clone" })
    .click();

  const clonedProductName = `Copy of ${updatedProductName}`;
  await expect(page).toHaveURL(/\/app\/products\/[^/]+$/);
  await expect(page.getByRole("heading", { name: clonedProductName })).toBeVisible();
  await expect(page.locator('[aria-current="step"]').filter({ hasText: "Validate" })).toBeVisible();
  await expect(page.getByLabel("Vertical")).toHaveValue("Industrial analytics");

  const clonedProductId = page.url().split("/").at(-1)!;
  await page.goto(`/app/products/${clonedProductId}/spec`);
  await expect(page.getByLabel("Definition of done")).toHaveValue(definitionOfDone);

  await page.goto(`/app/products/${clonedProductId}/validate`);
  await expect(page.getByText("No validation leads logged")).toBeVisible();
});
