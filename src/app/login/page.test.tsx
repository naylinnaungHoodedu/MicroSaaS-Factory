import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicFunnelState } from "@/lib/server/funnel";

const { getPublicFunnelStateMock } = vi.hoisted(() => ({
  getPublicFunnelStateMock: vi.fn(),
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

vi.mock("@/lib/server/actions", () => ({
  loginAction: vi.fn(),
}));

vi.mock("@/components/firebase-login-panel", () => ({
  FirebaseLoginPanel: () => <div>Firebase Panel</div>,
}));

vi.mock("@/lib/server/funnel", () => ({
  getPublicFunnelState: getPublicFunnelStateMock,
}));

import LoginPage, { metadata as loginMetadata } from "./page";

function buildFunnelState(overrides: Partial<PublicFunnelState> = {}) {
  return {
    activationDetail: "Activation follows the current operator-controlled invite or signup-intent flow.",
    activationReady: false,
    auth: {
      firebaseEnabled: false,
      firebaseTestMode: false,
      inviteTokenEnabled: true,
      firebaseClientConfigured: false,
      firebaseAdminConfigured: false,
      firebaseProjectId: null,
      firebaseError: null,
    },
    availabilityMode: "signup_intent",
    checkoutVisible: false,
    flags: {
      inviteOnlyBeta: true,
      publicWaitlist: true,
      publicSignupEnabled: true,
      selfServeProvisioningEnabled: false,
      checkoutEnabled: false,
      platformBillingEnabled: true,
      proAiEnabled: false,
    },
    founder: {
      loggedIn: false,
      subscriptionStatus: null,
      hasActiveSubscription: false,
      canStartCheckout: false,
    },
    journeyMode: "signup_intent",
    metrics: {
      productCount: 0,
      waitlistCount: 0,
      workspaceCount: 0,
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
    pricingAction: {
      href: "/pricing",
      label: "See pricing",
      kind: "pricing",
    },
    pricingVisible: true,
    primaryAction: {
      href: "/signup",
      label: "Start signup",
      kind: "signup",
    },
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
          features: ["Single founder workspace"],
        },
      ],
      publicPlanIdsMissingCheckoutPrices: [],
      pricingReady: true,
      signupIntentReady: true,
      firebaseReadyForSelfServe: false,
      selfServeReady: false,
      checkoutReady: false,
      automationReady: false,
      checks: [],
      blockingIssues: [],
    },
    secondaryAction: {
      href: "/login",
      label: "Founder login",
      kind: "login",
    },
    signupAvailable: true,
    signupIntent: null,
    summary: {
      eyebrow: "Guided Signup",
      title: "Capture founder demand now, provision deliberately later.",
      detail:
        "Public signup is collecting the founder, workspace, and plan choice without skipping operator review.",
      tone: "cyan",
    },
    waitlistOpen: true,
    ...overrides,
  } satisfies PublicFunnelState;
}

describe("/login page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("renders login copy from the unified funnel state", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildFunnelState());

    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Sign in with your beta invite.");
    expect(html).toContain("Public signup is open for operator review");
    expect(html).not.toContain("Firebase Panel");
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain("Terms");
    expect(html).toContain("Privacy");
  });

  it("exports canonical login metadata", () => {
    expect(loginMetadata.alternates?.canonical).toBe("/login");
    expect(loginMetadata.description).toContain("founder workspace");
  });
});
