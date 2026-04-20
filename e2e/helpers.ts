import { readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

import { encryptSecret } from "../src/lib/server/crypto";

const E2E_DB_FILE = path.join(os.tmpdir(), "microsaas-factory-e2e", "db.json");

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Admin secret").fill("microsaas-admin");
  await page.getByRole("button", { name: "Enter admin console" }).click();
}

export async function openInviteUrlForCard(
  page: Page,
  input: { workspaceName: string; founderEmail: string },
) {
  const inviteLink = page
    .locator("div")
    .filter({ hasText: input.workspaceName })
    .filter({ hasText: input.founderEmail })
    .getByRole("link", { name: "Open invite URL" })
    .first();

  await expect(inviteLink).toBeVisible();
  const inviteHref = await inviteLink.getAttribute("href");

  expect(inviteHref).toBeTruthy();
  await page.goto(inviteHref!);
}

export async function seedProductBuildConnections(productId: string) {
  process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY ??= "microsaas-factory-e2e";

  const raw = await readFile(E2E_DB_FILE, "utf8");
  const database = JSON.parse(raw) as {
    products: Array<{ id: string; stage: string; updatedAt: string }>;
    integrations: Array<Record<string, unknown>>;
    deploymentSnapshots: Array<Record<string, unknown>>;
  };
  const now = new Date().toISOString();
  const product = database.products.find((entry) => entry.id === productId);

  expect(product).toBeTruthy();

  if (product) {
    product.stage = "build";
    product.updatedAt = now;
  }

  database.integrations = database.integrations.filter((entry) => entry.productId !== productId);
  database.deploymentSnapshots = database.deploymentSnapshots.filter(
    (entry) => entry.productId !== productId,
  );

  database.integrations.push(
    {
      id: `github-${productId}`,
      productId,
      provider: "github",
      status: "connected",
      connectedAt: now,
      lastSyncAt: now,
      metadata: {
        owner: "factory",
        repo: "microsaas-factory",
        repoFullName: "factory/microsaas-factory",
        defaultBranch: "main",
      },
    },
    {
      id: `gcp-${productId}`,
      productId,
      provider: "gcp",
      status: "connected",
      connectedAt: now,
      lastSyncAt: now,
      metadata: {
        projectId: "test-project",
        region: "us-central1",
        serviceName: "factory-service",
        buildRegion: "global",
      },
      secret: encryptSecret("not-json"),
    },
  );

  database.deploymentSnapshots.push(
    {
      id: `github-snapshot-${productId}`,
      productId,
      provider: "github",
      environment: "beta",
      updatedAt: now,
      data: {
        defaultBranch: "main",
        repoUrl: "https://github.com/factory/microsaas-factory",
        lastPushAt: now,
        recentCommits: [{ sha: "abc123", message: "Test commit", authoredAt: now }],
        recentPullRequests: [{ number: 1, title: "Test PR", state: "open", url: "#", updatedAt: now }],
        releases: [{ tag: "v0.1.0", url: "#", publishedAt: now }],
      },
    },
    {
      id: `gcp-snapshot-${productId}`,
      productId,
      provider: "gcp",
      environment: "beta",
      updatedAt: now,
      data: {
        projectId: "test-project",
        region: "us-central1",
        serviceName: "factory-service",
        serviceUrl: "https://factory-service.run.app",
        latestReadyRevision: "factory-service-0001",
        terminalCondition: {
          state: "CONDITION_SUCCEEDED",
          message: "Ready",
        },
        traffic: [{ percent: 100, revision: "factory-service-0001" }],
        latestBuilds: [{ id: "build-1", status: "SUCCESS", finishTime: now }],
      },
    },
  );

  const tempFile = `${E2E_DB_FILE}.${process.pid}.tmp`;
  await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
  await rename(tempFile, E2E_DB_FILE);
}
