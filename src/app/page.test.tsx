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

import Home from "./page";

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
    availabilityMode: "waitlist",
    checkoutVisible: false,
    flags: {
      inviteOnlyBeta: true,
      publicWaitlist: true,
      publicSignupEnabled: false,
      selfServeProvisioningEnabled: false,
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
    journeyMode: "waitlist",
    metrics: {
      productCount: 5,
      waitlistCount: 7,
      workspaceCount: 3,
    },
    plans: [],
    pricingAction: null,
    pricingVisible: false,
    primaryAction: {
      href: "/waitlist",
      label: "Request invite",
      kind: "waitlist",
    },
    readiness: {
      environment: "development",
      productionSafe: true,
      publicPlans: [],
      publicPlanIdsMissingCheckoutPrices: [],
      firebaseReadyForSelfServe: false,
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
    signupAvailable: false,
    signupIntent: null,
    summary: {
      eyebrow: "Invite Beta",
      title: "Access stays operator-controlled while the stack hardens.",
      detail:
        "Invite tokens remain the active entrypoint because public signup is still closed in this environment.",
      tone: "amber",
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

    expect(html).toContain("Access stays operator-controlled while the stack hardens.");
    expect(html).toContain("Request invite");
    expect(html).toContain("Workspaces");
    expect(html).toContain(">3<");
  });
});
