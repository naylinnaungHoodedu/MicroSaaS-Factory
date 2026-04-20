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

vi.mock("@/lib/server/funnel", () => ({
  getPublicFunnelState: getPublicFunnelStateMock,
}));

import Home, { metadata as homeMetadata } from "./page";

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
    journeyMode: "waitlist",
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
      href: "/pricing",
      label: "See pricing",
      kind: "pricing",
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

describe("/ page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("renders the unified public funnel CTA and metrics", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildFunnelState());

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Capture founder demand now, provision deliberately later.");
    expect(html).toContain("Start signup");
    expect(html).toContain("See pricing");
    expect(html).toContain("Workspaces");
    expect(html).toContain(">3<");
  });

  it("exports canonical public metadata for the homepage", () => {
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeMetadata.openGraph?.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/og.png",
        }),
      ]),
    );
  });
});
