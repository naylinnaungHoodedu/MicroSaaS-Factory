import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicFunnelState } from "@/lib/server/funnel";

const { getPublicFunnelStateMock, redirectMock } = vi.hoisted(() => ({
  getPublicFunnelStateMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
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
  startPlatformCheckoutAction: vi.fn(),
}));

vi.mock("@/lib/server/funnel", () => ({
  getPublicFunnelState: getPublicFunnelStateMock,
}));

import PricingPage, { metadata as pricingMetadata } from "./page";

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

describe("/pricing page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
    redirectMock.mockReset();
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`REDIRECT:${target}`);
    });
  });

  it("redirects to home when pricing is hidden", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildFunnelState({
        checkoutVisible: false,
        plans: [],
        pricingVisible: false,
      }),
    );

    await expect(PricingPage()).rejects.toThrow("REDIRECT:/");
  });

  it("renders pricing content when pricing is visible", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildFunnelState());

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain("Choose the MicroSaaS Factory lane");
    expect(html).toContain("Growth");
    expect(html).toContain("Start signup");
    expect(html).not.toContain("Start monthly checkout");
  });

  it("renders checkout buttons for eligible founder workspaces", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildFunnelState({
        checkoutVisible: true,
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: false,
          checkoutEnabled: true,
          platformBillingEnabled: true,
          proAiEnabled: false,
        },
        founder: {
          loggedIn: true,
          workspaceId: "workspace-1",
          workspaceName: "Factory Lab",
          subscriptionStatus: "trial",
          hasActiveSubscription: false,
          canStartCheckout: true,
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
          checkoutReady: true,
          automationReady: false,
          checks: [],
          blockingIssues: [],
        },
      }),
    );

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain("Start monthly checkout");
    expect(html).toContain("Start annual checkout");
  });

  it("exports canonical pricing metadata", () => {
    expect(pricingMetadata.alternates?.canonical).toBe("/pricing");
    expect(pricingMetadata.description).toContain("billing posture");
  });
});
