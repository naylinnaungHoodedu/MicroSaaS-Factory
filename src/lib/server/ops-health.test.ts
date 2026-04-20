import { describe, expect, it } from "vitest";

import { summarizeProductOpsHealth } from "@/lib/server/ops-health";
import type {
  DeploymentSnapshot,
  EmailSequence,
  IntegrationConnection,
  RevenueSnapshot,
} from "@/lib/types";

function makeIntegration(
  provider: IntegrationConnection["provider"],
  metadata: Record<string, unknown> = {},
): IntegrationConnection {
  return {
    id: `${provider}-1`,
    productId: "product-1",
    provider,
    status: "connected",
    connectedAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    metadata,
  };
}

function makeDeploymentSnapshot(
  provider: DeploymentSnapshot["provider"],
  data: Record<string, unknown>,
): DeploymentSnapshot {
  return {
    id: `${provider}-snapshot`,
    productId: "product-1",
    provider,
    environment: "beta",
    data,
    updatedAt: new Date().toISOString(),
  };
}

function makeRevenueSnapshot(overrides: Partial<RevenueSnapshot> = {}): RevenueSnapshot {
  return {
    id: "revenue-1",
    productId: "product-1",
    currency: "USD",
    activeSubscriptions: 18,
    monthlyRecurringRevenue: 1250,
    annualRecurringRevenue: 15000,
    productCount: 4,
    syncedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEmailSequence(): EmailSequence {
  return {
    id: "sequence-1",
    productId: "product-1",
    senderEmail: "noreply@example.com",
    status: "connected",
    updatedAt: new Date().toISOString(),
    lastTestSentAt: new Date().toISOString(),
    items: [
      { key: "day-0", day: 0, title: "Welcome", subject: "Welcome", body: "Body" },
      { key: "day-1", day: 1, title: "Nudge", subject: "Nudge", body: "Body" },
      { key: "day-3", day: 3, title: "Case study", subject: "Case", body: "Body" },
      { key: "day-7", day: 7, title: "Upgrade", subject: "Upgrade", body: "Body" },
      { key: "day-14", day: 14, title: "Survey", subject: "Survey", body: "Body" },
    ],
  };
}

describe("summarizeProductOpsHealth", () => {
  it("builds healthy parsed summaries for connected systems", () => {
    const summary = summarizeProductOpsHealth({
      integrations: [
        makeIntegration("github", {
          repoFullName: "factory/microsaas-factory",
          authMode: "app",
          installationId: "12345",
        }),
        makeIntegration("gcp", {
          serviceName: "factory-web",
          region: "us-central1",
          buildRegion: "global",
        }),
        makeIntegration("stripe", {
          priceCount: 7,
        }),
        makeIntegration("resend", {
          senderEmail: "noreply@example.com",
          domains: [{ name: "example.com", status: "verified" }],
        }),
      ],
      deploymentSnapshots: [
        makeDeploymentSnapshot("github", {
          defaultBranch: "main",
          repoUrl: "https://github.com/factory/microsaas-factory",
          lastPushAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          recentCommits: [{ sha: "1", message: "feat: ops health", authoredAt: new Date().toISOString() }],
          recentPullRequests: [{ number: 12, title: "Ops health", state: "open", url: "https://github.com", updatedAt: new Date().toISOString() }],
          releases: [{ tag: "v1.2.0", url: "https://github.com", publishedAt: new Date().toISOString() }],
        }),
        makeDeploymentSnapshot("gcp", {
          projectId: "factory-project",
          region: "us-central1",
          serviceName: "factory-web",
          serviceUrl: "https://factory-web.run.app",
          latestReadyRevision: "factory-web-00012-abc",
          terminalCondition: { state: "CONDITION_SUCCEEDED", message: "Ready" },
          traffic: [{ percent: 100, revision: "factory-web-00012-abc" }],
          latestBuilds: [{ id: "build-1", status: "SUCCESS", finishTime: new Date().toISOString() }],
        }),
      ],
      revenueSnapshots: [makeRevenueSnapshot()],
      emailSequence: makeEmailSequence(),
    });

    expect(summary.overallStatus).toBe("success");
    expect(summary.connectedCount).toBe(4);
    expect(summary.headline).toContain("All four operational systems are connected");
    expect(summary.providers.find((provider) => provider.provider === "github")).toMatchObject({
      status: "success",
      headline: "factory/microsaas-factory",
    });
    expect(
      summary.providers
        .find((provider) => provider.provider === "github")
        ?.metrics.find((metric) => metric.label === "Automation")?.value,
    ).toBe("webhook + scheduled fallback");
    expect(summary.providers.find((provider) => provider.provider === "gcp")).toMatchObject({
      status: "success",
      headline: "factory-web",
    });
    expect(summary.providers.find((provider) => provider.provider === "stripe")?.headline).toContain("$1,250");
    expect(summary.providers.find((provider) => provider.provider === "resend")).toMatchObject({
      status: "success",
      headline: "noreply@example.com",
    });
  });

  it("surfaces stale, failing, and incomplete systems as attention items", () => {
    const summary = summarizeProductOpsHealth({
      integrations: [
        makeIntegration("github", {
          repoFullName: "factory/microsaas-factory",
        }),
        makeIntegration("gcp", {
          serviceName: "factory-web",
          region: "us-central1",
          buildRegion: "global",
        }),
        makeIntegration("stripe"),
        makeIntegration("resend", {
          senderEmail: "noreply@example.com",
          domains: [{ name: "example.com", status: "pending" }],
        }),
      ],
      deploymentSnapshots: [
        makeDeploymentSnapshot("github", {
          defaultBranch: "main",
          repoUrl: "https://github.com/factory/microsaas-factory",
          lastPushAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          recentCommits: [],
          recentPullRequests: [],
          releases: [],
        }),
        makeDeploymentSnapshot("gcp", {
          projectId: "factory-project",
          region: "us-central1",
          serviceName: "factory-web",
          latestReadyRevision: "factory-web-00011-xyz",
          terminalCondition: { state: "CONDITION_SUCCEEDED", message: "Ready" },
          traffic: [{ percent: 100, revision: "factory-web-00011-xyz" }],
          latestBuilds: [{ id: "build-2", status: "FAILURE", finishTime: new Date().toISOString() }],
        }),
      ],
      revenueSnapshots: [],
      emailSequence: null,
    });

    expect(summary.overallStatus).toBe("error");
    expect(summary.detail).toContain("GitHub");
    expect(summary.detail).toContain("Google Cloud");
    expect(summary.detail).toContain("Stripe");
    expect(summary.detail).toContain("Resend");
    expect(summary.providers.find((provider) => provider.provider === "github")?.status).toBe("warning");
    expect(summary.providers.find((provider) => provider.provider === "gcp")?.status).toBe("error");
    expect(summary.providers.find((provider) => provider.provider === "stripe")?.status).toBe("pending");
    expect(summary.providers.find((provider) => provider.provider === "resend")?.status).toBe("warning");
  });

  it("does not mislabel Resend as unverified when older metadata only stored a partial domain list", () => {
    const summary = summarizeProductOpsHealth({
      integrations: [
        makeIntegration("resend", {
          senderEmail: "noreply@sender-domain.com",
          domainCount: 8,
          domains: [
            { name: "example.com", status: "verified" },
            { name: "demo.com", status: "verified" },
            { name: "staging.com", status: "pending" },
            { name: "sample.com", status: "verified" },
            { name: "factory.dev", status: "verified" },
          ],
        }),
      ],
      deploymentSnapshots: [],
      revenueSnapshots: [],
      emailSequence: {
        ...makeEmailSequence(),
        senderEmail: "noreply@sender-domain.com",
      },
    });

    const resend = summary.providers.find((provider) => provider.provider === "resend");

    expect(resend).toMatchObject({
      status: "warning",
      headline: "noreply@sender-domain.com",
    });
    expect(resend?.detail).toContain("not present in the stored Resend domain metadata yet");
    expect(resend?.metrics.find((metric) => metric.label === "Domain status")?.value).toBe("Metadata incomplete");
  });
});
