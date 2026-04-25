import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getPublicFunnelStateMock,
  getPublicPricingDataMock,
  getWorkspaceDashboardMock,
  requireFounderContextMock,
} = vi.hoisted(() => ({
  getPublicFunnelStateMock: vi.fn(),
  getPublicPricingDataMock: vi.fn(),
  getWorkspaceDashboardMock: vi.fn(),
  requireFounderContextMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: ComponentPropsWithoutRef<"a"> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/server/auth", () => ({
  requireFounderContext: requireFounderContextMock,
}));

vi.mock("@/lib/server/funnel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/funnel")>();
  return {
    ...actual,
    getPublicFunnelState: getPublicFunnelStateMock,
  };
});

vi.mock("@/lib/server/services", () => ({
  getPublicPricingData: getPublicPricingDataMock,
  getWorkspaceDashboard: getWorkspaceDashboardMock,
}));

import { buildPublicFunnelStateForTests } from "@/test/public-funnel-state";

import WorkspaceDemoPage from "./page";

const featureFlags = {
  inviteOnlyBeta: true,
  publicWaitlist: true,
  publicSignupEnabled: true,
  selfServeProvisioningEnabled: true,
  checkoutEnabled: true,
  platformBillingEnabled: true,
  proAiEnabled: false,
};

describe("/app/demo page", () => {
  beforeEach(() => {
    requireFounderContextMock.mockReset();
    getWorkspaceDashboardMock.mockReset();
    getPublicPricingDataMock.mockReset();
    getPublicFunnelStateMock.mockReset();
  });

  it("renders workspace-aware Demo Center signals and product lane links", async () => {
    requireFounderContextMock.mockResolvedValue({
      user: {
        email: "founder@example.com",
      },
      workspace: {
        id: "workspace-1",
        name: "Factory Lab",
      },
    });
    getWorkspaceDashboardMock.mockResolvedValue({
      workspace: {
        id: "workspace-1",
        name: "Factory Lab",
        ownerUserId: "user-1",
        createdAt: "2026-04-22T00:00:00.000Z",
        featureFlags,
      },
      products: [
        {
          product: {
            id: "product-1",
            workspaceId: "workspace-1",
            name: "Demo Pilot",
            summary: "Guided product lane for testing Demo content.",
            vertical: "Founder operations",
            stage: "launch",
            pricingHypothesis: "$99 per month",
            targetUser: "Solo technical founder",
            coreProblem: "Scattered launch evidence",
            chosenMoat: "workflow-specificity",
            metrics: {
              monthlyRecurringRevenue: 500,
              monthlyChurnRate: 0,
              supportHoursPerWeek: 2,
              activeP1Bugs: 0,
            },
            criticalBlockers: [],
            launchChecklist: [],
            updatedAt: "2026-04-22T00:00:00.000Z",
            createdAt: "2026-04-22T00:00:00.000Z",
          },
          template: null,
          latestGate: {
            passed: true,
          },
          latestRevenue: null,
          latestDeployment: null,
          connectedIntegrationsCount: 2,
          readyForNextProduct: true,
        },
      ],
      archivedProducts: [],
      portfolio: {
        activeProductCount: 1,
        archivedProductCount: 0,
        totalProductCount: 1,
      },
      recentActivity: [],
      featureFlags,
      crmSummary: {
        dueTodayCount: 2,
        overdueCount: 1,
        snoozedCount: 1,
        pendingAnalysisCount: 3,
        topObjections: [],
        topPainPoints: [],
      },
      availableTemplates: [],
      platformSubscription: {
        id: "subscription-1",
        workspaceId: "workspace-1",
        planId: "growth",
        status: "trial",
        source: "self-serve",
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:00:00.000Z",
      },
    });
    getPublicPricingDataMock.mockResolvedValue({
      flags: featureFlags,
      plans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: ["Single founder workspace"],
        },
      ],
    });
    getPublicFunnelStateMock.mockResolvedValue(
      buildPublicFunnelStateForTests(
        {},
        {
          founder: {
            workspaceId: "workspace-1",
            workspaceName: "Factory Lab",
            subscriptionStatus: "trial",
          },
        },
      ),
    );

    const html = renderToStaticMarkup(await WorkspaceDemoPage());

    expect(html).toContain("Workspace Demo Center");
    expect(html).toContain("Demo the operating loop with current workspace signals.");
    expect(html).toContain("Factory Lab");
    expect(html).toContain("founder@example.com");
    expect(html).toContain("Start with the workspace signals already in view.");
    expect(html).toContain("Read the control tower");
    expect(html).toContain("Triage validation pressure");
    expect(html).toContain("CRM attention");
    expect(html).toContain("Six surfaces, one founder operating loop.");
    expect(html).toContain("The authenticated demo reads the current workspace without changing it.");
    expect(html).toContain("One operating rhythm from market signal to live revenue.");
    expect(html).toContain("Demo Pilot");
    expect(html).toContain("Launch gate passed");
    expect(html).toContain('href="/app/products/product-1"');
  });
});
