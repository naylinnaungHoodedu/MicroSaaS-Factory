import { describe, expect, it } from "vitest";

import { derivePublicFunnelState, type PublicFunnelSource } from "@/lib/server/funnel";

function buildSource(overrides: Partial<PublicFunnelSource>) {
  return {
    auth: {
      firebaseEnabled: false,
      firebaseTestMode: false,
      inviteTokenEnabled: true,
      firebaseClientConfigured: false,
      firebaseAdminConfigured: false,
      firebaseProjectId: null,
      firebaseError: null,
    },
    flags: {
      inviteOnlyBeta: true,
      publicWaitlist: true,
      publicSignupEnabled: false,
      selfServeProvisioningEnabled: false,
      checkoutEnabled: false,
      platformBillingEnabled: false,
      proAiEnabled: false,
    },
    founder: null,
    metrics: {
      productCount: 0,
      waitlistCount: 0,
      workspaceCount: 0,
    },
    plans: [],
    readiness: {
      environment: "development",
      productionSafe: true,
      publicPlans: [],
      publicPlanIdsMissingCheckoutPrices: [],
      firebaseReadyForSelfServe: false,
      checkoutReady: false,
      automationReady: false,
      checks: [
        {
          id: "firebase",
          label: "Firebase Auth",
          status: "warning",
          detail: "Firebase client and admin configuration are incomplete.",
          blocking: false,
        },
      ],
      blockingIssues: [],
    },
    signupIntent: null,
    ...overrides,
  };
}

describe("derivePublicFunnelState", () => {
  it("derives waitlist-only mode", () => {
    const state = derivePublicFunnelState(buildSource({}));

    expect(state.availabilityMode).toBe("waitlist");
    expect(state.primaryAction.label).toBe("Request invite");
  });

  it("derives signup-intent mode", () => {
    const state = derivePublicFunnelState(
      buildSource({
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: false,
          checkoutEnabled: false,
          platformBillingEnabled: false,
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
      }),
    );

    expect(state.availabilityMode).toBe("signup_intent");
    expect(state.signupAvailable).toBe(true);
    expect(state.primaryAction.label).toBe("Start signup");
  });

  it("derives self-serve-ready mode", () => {
    const state = derivePublicFunnelState(
      buildSource({
        auth: {
          firebaseEnabled: true,
          firebaseTestMode: false,
          inviteTokenEnabled: true,
          firebaseClientConfigured: true,
          firebaseAdminConfigured: true,
          firebaseProjectId: "demo-project",
          firebaseError: null,
        },
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: true,
          checkoutEnabled: false,
          platformBillingEnabled: false,
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
        readiness: {
          environment: "development",
          productionSafe: true,
          publicPlans: [],
          publicPlanIdsMissingCheckoutPrices: [],
          firebaseReadyForSelfServe: true,
          checkoutReady: false,
          automationReady: false,
          checks: [],
          blockingIssues: [],
        },
      }),
    );

    expect(state.availabilityMode).toBe("self_serve");
    expect(state.activationReady).toBe(true);
    expect(state.primaryAction.label).toBe("Create workspace");
  });

  it("keeps pricing visible without checkout", () => {
    const state = derivePublicFunnelState(
      buildSource({
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: false,
          checkoutEnabled: false,
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
      }),
    );

    expect(state.pricingVisible).toBe(true);
    expect(state.checkoutVisible).toBe(false);
  });

  it("marks checkout as available for eligible founders", () => {
    const state = derivePublicFunnelState(
      buildSource({
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: true,
          checkoutEnabled: true,
          platformBillingEnabled: true,
          proAiEnabled: false,
        },
        founder: {
          workspaceId: "workspace-1",
          workspaceName: "Factory Lab",
          subscriptionStatus: "trial",
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
      }),
    );

    expect(state.checkoutVisible).toBe(true);
    expect(state.founder.canStartCheckout).toBe(true);
  });

  it("switches the journey into returning-founder mode", () => {
    const state = derivePublicFunnelState(
      buildSource({
        founder: {
          workspaceId: "workspace-1",
          workspaceName: "Factory Lab",
          subscriptionStatus: "active",
        },
      }),
    );

    expect(state.journeyMode).toBe("returning_founder");
    expect(state.primaryAction.label).toBe("Open workspace");
  });
});
