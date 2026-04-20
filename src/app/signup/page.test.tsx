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
  createSignupIntentAction: vi.fn(),
}));

vi.mock("@/components/firebase-login-panel", () => ({
  FirebaseLoginPanel: () => <div>Firebase Panel</div>,
}));

vi.mock("@/lib/server/funnel", () => ({
  getPublicFunnelState: getPublicFunnelStateMock,
}));

import SignupPage from "./page";

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
    availabilityMode: "signup_intent",
    checkoutVisible: false,
    flags: {
      inviteOnlyBeta: true,
      publicWaitlist: true,
      publicSignupEnabled: true,
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
    pricingAction: null,
    pricingVisible: false,
    primaryAction: {
      href: "/signup",
      label: "Start signup",
      kind: "signup",
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

describe("/signup page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
    redirectMock.mockReset();
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`REDIRECT:${target}`);
    });
  });

  it("redirects to the waitlist when signup is unavailable", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildFunnelState({
        availabilityMode: "waitlist",
        plans: [],
        signupAvailable: false,
      }),
    );

    await expect(
      SignupPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("REDIRECT:/waitlist");
  });

  it("renders the queue-based signup form when self-serve is disabled", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildFunnelState());

    const html = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({ submitted: "1" }),
      }),
    );

    expect(html).toContain("Register a founder intent");
    expect(html).toContain("Your signup intent has been recorded.");
    expect(html).toContain("Submit signup intent");
  });

  it("renders the self-serve activation lane when provisioning is enabled", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildFunnelState({
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
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: true,
          checkoutEnabled: false,
          platformBillingEnabled: false,
          proAiEnabled: false,
        },
        journeyMode: "self_serve",
        primaryAction: {
          href: "/signup",
          label: "Create workspace",
          kind: "signup",
        },
        signupIntent: {
          id: "intent-1",
          founderName: "Founder Name",
          email: "founder@example.com",
          workspaceName: "Factory Lab",
          planId: "growth",
          status: "pending_activation",
          createdAt: "2026-04-17T00:00:00.000Z",
        },
        summary: {
          eyebrow: "Live Self-Serve",
          title: "Choose a lane, verify identity, and open a founder workspace.",
          detail:
            "Pricing, signup, and Firebase activation are aligned for self-serve founders in this environment.",
          tone: "cyan",
        },
      }),
    );

    const html = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({ submitted: "1", intent: "intent-1" }),
      }),
    );

    expect(html).toContain("Create your founder workspace");
    expect(html).toContain("Signup details saved for Factory Lab.");
    expect(html).toContain("Firebase Panel");
  });

  it("shows the Firebase configuration warning when self-serve is enabled without auth", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildFunnelState({
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
        availabilityMode: "self_serve",
        flags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: true,
          selfServeProvisioningEnabled: true,
          checkoutEnabled: false,
          platformBillingEnabled: false,
          proAiEnabled: false,
        },
        journeyMode: "self_serve",
        primaryAction: {
          href: "/signup",
          label: "Create workspace",
          kind: "signup",
        },
      }),
    );

    const html = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Self-serve workspace activation is enabled");
  });
});
