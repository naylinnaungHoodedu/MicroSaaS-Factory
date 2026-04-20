import { expect, test } from "@playwright/test";

import { openInviteUrlForCard } from "./helpers";

test("founder validation CRM captures transcripts and aggregates work in /app/crm", async ({
  page,
}) => {
  const unique = Date.now().toString(36);
  const founderEmail = `founder-crm-${unique}@example.com`;
  const workspaceName = `Factory CRM ${unique}`;
  const productName = `Validation CRM Pilot ${unique}`;

  await page.goto("/admin");
  await page.getByLabel("Admin secret").fill("microsaas-admin");
  await page.getByRole("button", { name: "Enter admin console" }).click();
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create invite" }).click();

  await expect(page.getByText(workspaceName)).toBeVisible();
  await openInviteUrlForCard(page, { workspaceName, founderEmail });
  await page.getByLabel("Name").fill("Founder CRM");
  await page.getByLabel("Invite email").fill(founderEmail);
  await page.getByRole("button", { name: "Activate workspace" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.getByLabel("Template").selectOption("oee-dashboard");
  await page.getByLabel("Product name").fill(productName);
  await page.getByRole("button", { name: "Create product" }).click();
  await page.getByRole("link", { name: productName, exact: true }).click();
  await page.getByRole("link", { name: "Validate" }).click();

  const leadSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Log validation targets" }) });
  await leadSection.getByLabel("Name").fill("Jamie Founder");
  await leadSection.getByLabel("Email").fill("jamie@example.com");
  await leadSection.getByLabel("Company").fill("Factory Co");
  await leadSection.getByLabel("Role").fill("Plant Manager");
  await leadSection.getByLabel("Channel").fill("LinkedIn");
  await leadSection.getByLabel("Notes").fill("Warm intro from an existing operator.");
  await leadSection.getByRole("button", { name: "Log validation lead" }).click();

  await expect(page.getByText("Jamie Founder", { exact: true })).toBeVisible();

  const transcriptSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Capture validation sessions" }) });
  await transcriptSection
    .getByLabel("Linked lead")
    .selectOption({ label: "Jamie Founder / Factory Co" });
  await transcriptSection
    .getByLabel("Context")
    .fill("Pricing and pilot discovery call");
  await transcriptSection.getByLabel("Transcript text").fill(
    "Our biggest problem is manual quoting that wastes hours. We are interested and would pay for a pilot. Security review is a concern.",
  );
  await transcriptSection.getByRole("button", { name: "Capture transcript" }).click();

  await expect(
    page.getByRole("heading", { name: "Pricing and pilot discovery call" }),
  ).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("Recommended next actions").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Snooze" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Snooze" }).first().click();
  await expect(page.getByText("Snoozed").first()).toBeVisible();

  await page.getByRole("link", { name: "CRM" }).click();
  await expect(page).toHaveURL(/\/app\/crm$/);
  await expect(
    page.getByRole("heading", { name: "Cross-product validation inbox" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pricing and pilot discovery call" }),
  ).toBeVisible();
  await expect(page.getByText("Snoozed").first()).toBeVisible();
});
