import { describe, expect, it } from "vitest";

import { derivePublicFunnelState, type PublicFunnelSource } from "@/lib/server/funnel";

function buildSource(overrides: Partial<PublicFunnelSource>) {
  return {
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
      checkoutEnabled: true,
      platformBillingEnabled: true,
      proAiEnabled: false,
    },
    founder: null,
    metrics: {
      productCount: 5,
      waitlistCount: 7,
      workspaceCount: 3,
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
      environment: "production",
      productionSafe: true,
      publicPlans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: ["Single founder workspace"],
        },
      ],
      publicPlanIdsMissingCheckoutPrices: [],
      pricingReady: true,
      signupIntentReady: true,
      firebaseReadyForSelfServe: true,
      selfServeReady: true,
      checkoutReady: true,
      automationReady: true,
      checks: [
        {
          id: "self_serve",
          label: "Self-serve activation",
          status: "ready",
          detail: "Firebase activation is ready for public self-serve provisioning.",
          blocking: false,
        },
        {
          id: "checkout",
          label: "Stripe checkout",
          status: "ready",
          detail: "Checkout is configured with app URL and Stripe pricing for the public plan catalog.",
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
  it("derives full self-serve mode with the all-on launch target", () => {
    const state = derivePublicFunnelState(buildSource({}));

    expect(state.availabilityMode).toBe("self_serve");
    expect(state.activationReady).toBe(true);
    expect(state.checkoutVisible).toBe(true);
    expect(state.primaryAction.label).toBe("Start founder workspace");
    expect(state.launch.badge).toBe("Full Self-Serve Launch");
    expect(state.launch.targetFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flag: "selfServeProvisioningEnabled",
          target: true,
        }),
        expect.objectContaining({
          flag: "checkoutEnabled",
          target: true,
        }),
      ]),
    );
  });

  it("derives guided-entry mode when public signup is on but self-serve is off", () => {
    const state = derivePublicFunnelState(
      buildSource({
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
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: false,
          checkoutEnabled: false,
          platformBillingEnabled: true,
          proAiEnabled: false,
        },
        readiness: {
          environment: "production",
          productionSafe: true,
          publicPlans: [
            {
              id: "growth",
              name: "Growth",
              hidden: false,
              monthlyPrice: 99,
              annualPrice: 990,
              features: ["Single founder workspace"],
            },
          ],
          publicPlanIdsMissingCheckoutPrices: [],
          pricingReady: true,
          signupIntentReady: true,
          firebaseReadyForSelfServe: false,
          selfServeReady: false,
          checkoutReady: false,
          automationReady: true,
          checks: [
            {
              id: "self_serve",
              label: "Self-serve activation",
              status: "warning",
              detail: "Firebase client and admin readiness still block self-serve activation.",
              blocking: false,
            },
            {
              id: "checkout",
              label: "Stripe checkout",
              status: "warning",
              detail: "Stripe checkout still has unresolved runtime blockers.",
              blocking: false,
            },
          ],
          blockingIssues: [],
        },
      }),
    );

    expect(state.availabilityMode).toBe("signup_intent");
    expect(state.primaryAction.label).toBe("Start founder workspace");
    expect(state.summary.title).toBe(
      "Start the founder workspace with clear pricing, guided signup, and a visible next step.",
    );
    expect(state.surfaces.signup.sectionTitle).toBe("Register founder intent");
  });

  it("marks checkout as available for eligible founders", () => {
    const state = derivePublicFunnelState(
      buildSource({
        founder: {
          workspaceId: "workspace-1",
          workspaceName: "Factory Lab",
          subscriptionStatus: "trial",
        },
      }),
    );

    expect(state.founder.canStartCheckout).toBe(true);
    expect(state.surfaces.billing.title).toBe(
      "This workspace can start checkout immediately.",
    );
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
    expect(state.summary.title).toBe("Factory Lab is ready for the next founder move.");
  });
});
