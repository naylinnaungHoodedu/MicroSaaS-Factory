import { expect, test } from "@playwright/test";

import { loginAsAdmin, openInviteUrlForCard, seedProductBuildConnections } from "./helpers";

test("founder can persist build state and trigger build-tab refresh actions", async ({
  page,
}) => {
  const unique = Date.now().toString(36);
  const founderEmail = `founder-build-${unique}@example.com`;
  const workspaceName = `Factory Build ${unique}`;
  const productName = `Build Lane ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create invite" }).click();

  await expect(page.getByText(workspaceName)).toBeVisible();
  await openInviteUrlForCard(page, { workspaceName, founderEmail });
  await page.getByLabel("Name").fill("Founder Build");
  await page.getByLabel("Invite email").fill(founderEmail);
  await page.getByRole("button", { name: "Activate workspace" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.getByLabel("Template").selectOption("oee-dashboard");
  await page.getByLabel("Product name").fill(productName);
  await page.getByRole("button", { name: "Create product" }).click();
  await page.getByRole("link", { name: productName, exact: true }).click();
  await expect(page).toHaveURL(/\/app\/products\/[^/]+$/);

  const productId = page.url().split("/").at(-1)!;
  await seedProductBuildConnections(productId);
  await page.goto(`/app/products/${productId}/build`);

  await page.getByLabel("Release goal").fill("Ship the first founder-ready beta lane");
  await page
    .getByLabel("Ship checklist, one per line")
    .fill("Run founder dry-run\nValidate deployment snapshot");
  await page.getByLabel("Build blockers, one per line").fill("Waiting on final review");
  await page.getByLabel("Notes").fill("Do not start launch review until the release dry-run is complete.");
  await page.getByRole("button", { name: "Save build state" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Release goal")).toHaveValue(
    "Ship the first founder-ready beta lane",
  );

  await page.goto(`/app/products/${productId}/build`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByLabel("Release goal")).toHaveValue(
    "Ship the first founder-ready beta lane",
    { timeout: 30_000 },
  );
  await expect(page.getByLabel("Build blockers, one per line")).toHaveValue(
    "Waiting on final review",
  );

  await page.getByRole("button", { name: "Refresh GitHub" }).click();
  await expect(
    page.getByText(
      "GitHub refresh failed. Check the saved repo metadata and active GitHub credentials.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Refresh GCP" }).click();
  await expect(
    page.getByText(
      "Google Cloud refresh failed. Check the saved project metadata and service-account access.",
    ),
  ).toBeVisible();
});
