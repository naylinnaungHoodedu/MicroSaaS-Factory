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

import LoginPage from "./page";

function buildFunnelState(overrides: Partial<PublicFunnelState> = {}) {
  return {
    activationDetail: "Firebase activation is ready for self-serve workspace provisioning.",
    activationReady: true,
    auth: {
      firebaseEnabled: true,
      firebaseTestMode: false,
      inviteTokenEnabled: true,
      firebaseClientConfigured: true,
      firebaseAdminConfigured: true,
      firebaseProjectId: "demo-project",
      firebaseError: null,
    },
    availabilityMode: "self_serve",
    checkoutVisible: false,
    flags: {
      inviteOnlyBeta: true,
      publicWaitlist: true,
      publicSignupEnabled: true,
      selfServeProvisioningEnabled: true,
      checkoutEnabled: false,
      platformBillingEnabled: false,
      proAiEnabled: false,
    },
    founder: {
      loggedIn: false,
      subscriptionStatus: null,
      hasActiveSubscription: false,
      canStartCheckout: false,
    },
    journeyMode: "self_serve",
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
    pricingAction: null,
    pricingVisible: false,
    primaryAction: {
      href: "/signup",
      label: "Create workspace",
      kind: "signup",
    },
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
    secondaryAction: {
      href: "/login",
      label: "Founder login",
      kind: "login",
    },
    signupAvailable: true,
    signupIntent: null,
    summary: {
      eyebrow: "Live Self-Serve",
      title: "Choose a lane, verify identity, and open a founder workspace.",
      detail:
        "Pricing, signup, and Firebase activation are aligned for self-serve founders in this environment.",
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

    expect(html).toContain("Sign in or reopen your founder workspace.");
    expect(html).toContain("Create workspace");
    expect(html).toContain("Firebase Panel");
  });
});
