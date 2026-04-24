import { expect, test } from "@playwright/test";

import { loginAsAdmin, openInviteUrlForCard } from "./helpers";

test("public signup stays hidden when the flag is off", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByLabel("Public signup").uncheck();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await expect(
    page.getByText("Use the reviewed path when context should come before direct signup.", {
      exact: true,
    }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Public signup")).not.toBeChecked();

  await page.goto("/signup");
  await expect(page).toHaveURL(/\/waitlist$/);
});

test("public pricing stays visible while checkout remains hidden in the staged rollout", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByLabel("Self-serve provisioning").uncheck();
  await page.getByLabel("Platform billing visibility").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await expect(page.getByText("Full launch target")).toBeVisible();
  await expect(page.getByText("selfServeProvisioningEnabled")).toBeVisible();
  await expect(page.getByText("checkoutEnabled")).toBeVisible();

  await page.goto("/pricing");

  await expect(
    page.getByRole("heading", {
      name: "Choose the Growth lane without losing sight of the workspace path.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Growth", exact: true })).toBeVisible();
  await expect(page.getByText("Billing Path", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "What founders can do now versus what the launch target unlocks later.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Why show pricing before checkout is live?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start monthly checkout" })).toHaveCount(0);
  await expect(
    page.getByRole("article").getByRole("link", { name: "Start founder workspace" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Founder login" }).last()).toBeVisible();
});

test("staged signup intent appears in admin and can be issued as an invite", async ({
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

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Register founder intent" })).toBeVisible();
  await expect(page.getByText("Use the real founder email")).toBeVisible();
  await page.getByLabel("Founder name").fill("Signup Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Submit signup intent" }).click();

  await expect(
    page.getByText(
      "Your signup intent has been recorded. Workspace activation still stays behind reviewed access until self-serve provisioning is enabled.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Founder intent is now queued for reviewed intake.")).toBeVisible();

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
    page.getByText("Start the founder workspace and move from signal to launch in one surface.", {
      exact: true,
    }).first(),
  ).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your founder workspace" })).toBeVisible();
  await page.getByLabel("Founder name").fill("Self Serve Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Save details and continue" }).click();

  await expect(page.getByText(`Signup details saved for ${workspaceName}.`)).toBeVisible();
  await expect(page.getByText("Workspace details are staged for activation.")).toBeVisible();
  await page.getByRole("button", { name: "Continue with Test Google" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Founder control tower" })).toBeVisible();
  await expect(page.getByRole("heading", { name: workspaceName, exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: workspaceName, exact: true })).toBeVisible();
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

test("eligible founders see checkout buttons and billing return states", async ({ page }) => {
  const unique = Date.now().toString(36);
  const founderEmail = `checkout-${unique}@example.com`;
  const workspaceName = `Checkout ${unique}`;

  await loginAsAdmin(page);
  await page.getByLabel("Public signup").check();
  await page.getByLabel("Self-serve provisioning").check();
  await page.getByLabel("Platform billing visibility").check();
  await page.getByLabel("Platform checkout").check();
  await page.getByRole("button", { name: "Save feature flags" }).click();
  await expect(page.getByLabel("Platform checkout")).toBeChecked();

  await page.goto("/signup");
  await page.getByLabel("Founder name").fill("Checkout Founder");
  await page.getByLabel("Founder email").fill(founderEmail);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Save details and continue" }).click();
  await page.getByRole("button", { name: "Continue with Test Google" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/pricing");
  await expect(page.getByRole("button", { name: "Start monthly checkout" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start annual checkout" })).toBeVisible();

  await page.goto("/pricing?billing=cancelled");
  await expect(page.getByText("Checkout was canceled before completion.")).toBeVisible();

  await page.goto("/pricing?billing=error&reason=Checkout%20could%20not%20be%20started%20from%20this%20pricing%20page.");
  await expect(
    page.getByText("Checkout could not be started from this pricing page."),
  ).toBeVisible();

  await page.goto("/app?billing=success");
  await expect(page.getByText("Checkout completed. Stripe webhook processing will upgrade the workspace subscription as soon as the platform event is received.")).toBeVisible();
});

test("public auth surfaces keep legal routes reachable and focused controls visible", async ({
  page,
}) => {
  await page.goto("/login");

  const inviteEmail = page.getByLabel("Invite email");
  await inviteEmail.focus();
  await expect(inviteEmail).toBeFocused();

  const focusStyles = await inviteEmail.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      boxShadow: styles.boxShadow,
      outlineWidth: styles.outlineWidth,
    };
  });

  expect(focusStyles.outlineWidth).not.toBe("0px");
  expect(focusStyles.boxShadow).not.toBe("none");

  await expect(page.getByRole("link", { name: "Terms" }).last()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Founder recovery should feel coherent across the whole public surface.",
    }),
  ).toBeVisible();
  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Launch-baseline terms for founder access" }),
  ).toBeVisible();

  await page.goto("/waitlist");
  await expect(
    page.getByRole("heading", {
      name: "The waitlist lane should add clarity, not duplicate signup.",
    }),
  ).toBeVisible();
  await expect(page.getByText("When is waitlist the right path?")).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Launch-baseline privacy disclosure" })).toBeVisible();
});
