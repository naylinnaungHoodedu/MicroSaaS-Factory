import { describe, expect, it } from "vitest";

import { buildDashboardPageViewModel } from "@/lib/server/dashboard-view-model";
import { buildPublicFunnelStateForTests } from "@/test/public-funnel-state";

describe("buildDashboardPageViewModel", () => {
  it("reuses the full-launch billing posture for founder workspaces", () => {
    const viewModel = buildDashboardPageViewModel({
      dashboard: {
        workspace: {
          id: "workspace-1",
          name: "Factory Lab",
          ownerUserId: "user-1",
          createdAt: "2026-04-22T00:00:00.000Z",
          featureFlags: {
            inviteOnlyBeta: true,
            publicWaitlist: true,
            publicSignupEnabled: true,
            selfServeProvisioningEnabled: true,
            checkoutEnabled: true,
            platformBillingEnabled: true,
            proAiEnabled: false,
          },
        },
        products: [],
        archivedProducts: [],
        portfolio: {
          activeProductCount: 0,
          archivedProductCount: 0,
          totalProductCount: 0,
        },
        recentActivity: [],
        featureFlags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: true,
          checkoutEnabled: true,
          platformBillingEnabled: true,
          proAiEnabled: false,
        },
        crmSummary: {
          dueTodayCount: 0,
          overdueCount: 0,
          snoozedCount: 0,
          pendingAnalysisCount: 0,
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
      },
      pricingData: {
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: true,
          checkoutEnabled: true,
          platformBillingEnabled: true,
          proAiEnabled: false,
        },
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
      },
      publicFunnel: buildPublicFunnelStateForTests(
        {},
        {
          founder: {
            workspaceId: "workspace-1",
            workspaceName: "Factory Lab",
            subscriptionStatus: "trial",
          },
        },
      ),
    });

    expect(viewModel.billingGuidance.title).toBe("This workspace can start checkout immediately.");
    expect(viewModel.billingGuidance.operatorCard.title).toContain(
      "pricing visible, signup live, self-serve on, and checkout on",
    );
    expect(viewModel.billingGuidance.detail).toContain("billing visibility");
    expect(viewModel.billingReadiness.summary).toContain("deployment verification");
    expect(viewModel.controlTower.title).toContain("Factory Lab");
    expect(viewModel.canStartCheckout).toBe(true);
  });
});
