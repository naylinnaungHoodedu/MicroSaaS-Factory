import {
  derivePublicFunnelState,
  type PublicFunnelSource,
  type PublicFunnelState,
} from "@/lib/server/funnel";

function buildSource(overrides: Partial<PublicFunnelSource> = {}): PublicFunnelSource {
  return {
    auth: {
      firebaseEnabled: true,
      firebaseTestMode: true,
      inviteTokenEnabled: true,
      firebaseClientConfigured: true,
      firebaseAdminConfigured: true,
      firebaseProjectId: "test-project",
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
        features: [
          "Single-founder workspace",
          "Self-serve signup, Firebase activation, and founder re-entry",
          "Research, spec, launch gate, and portfolio views",
          "GitHub, Cloud Run, Stripe, and Resend connection lanes",
        ],
      },
    ],
    readiness: {
      environment: "development",
      productionSafe: true,
      publicPlans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: [
            "Single-founder workspace",
            "Self-serve signup, Firebase activation, and founder re-entry",
            "Research, spec, launch gate, and portfolio views",
            "GitHub, Cloud Run, Stripe, and Resend connection lanes",
          ],
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
          id: "pricing",
          label: "Public pricing",
          status: "ready",
          detail: "Visible public plans are available for plan comparison and billing entry.",
          blocking: true,
        },
        {
          id: "signup_intent",
          label: "Signup intent",
          status: "ready",
          detail: "Public signup is available from the current plan catalog.",
          blocking: true,
        },
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
          detail: "Checkout is configured for the visible public plan catalog.",
          blocking: false,
        },
      ],
      blockingIssues: [],
    },
    signupIntent: null,
    ...overrides,
  };
}

export function buildPublicFunnelStateForTests(
  overrides: Partial<PublicFunnelState> = {},
  sourceOverrides: Partial<PublicFunnelSource> = {},
): PublicFunnelState {
  return {
    ...derivePublicFunnelState(buildSource(sourceOverrides)),
    ...overrides,
  };
}
