import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/server/public-actions", () => ({
  createSignupIntentAction: vi.fn(),
  initialSignupActionState: {
    status: "idle",
  },
}));

vi.mock("@/components/firebase-login-panel", () => ({
  FirebaseLoginPanel: () => <div>Firebase Panel</div>,
}));

vi.mock("@/lib/server/funnel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/funnel")>();
  return {
    ...actual,
    getPublicFunnelState: getPublicFunnelStateMock,
  };
});

import { buildPublicFunnelStateForTests } from "@/test/public-funnel-state";

import SignupPage, { generateMetadata as generateSignupMetadata } from "./page";

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
      buildPublicFunnelStateForTests(
        {
          availabilityMode: "waitlist",
          plans: [],
          signupAvailable: false,
        },
        {
          flags: {
            inviteOnlyBeta: true,
            publicWaitlist: true,
            publicSignupEnabled: false,
            selfServeProvisioningEnabled: false,
            checkoutEnabled: false,
            platformBillingEnabled: false,
            proAiEnabled: false,
          },
          plans: [],
        },
      ),
    );

    await expect(SignupPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/waitlist",
    );
  });

  it("renders the self-serve signup form and activation lane", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildPublicFunnelStateForTests({
        signupIntent: {
          id: "intent-1",
          founderName: "Founder Name",
          email: "founder@example.com",
          workspaceName: "Factory Lab",
          planId: "growth",
          status: "pending_activation",
          createdAt: "2026-04-22T00:00:00.000Z",
        },
      }),
    );

    const html = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({ intent: "intent-1" }),
      }),
    );

    expect(html).toContain("Create your founder workspace");
    expect(html).toContain("Workspace details are staged for activation.");
    expect(html).toContain("Firebase Panel");
    expect(html).toContain("Use the real founder email");
    expect(html).toContain("Plan context");
    expect(html).toContain("Signup should explain the next step before the founder commits.");
  });

  it("renders the staged signup path when self-serve is disabled", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildPublicFunnelStateForTests(
        {},
        {
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
            environment: "development",
            productionSafe: true,
            publicPlans: [
              {
                id: "growth",
                name: "Growth",
                hidden: false,
                monthlyPrice: 99,
                annualPrice: 990,
                features: ["Single-founder workspace"],
              },
            ],
            publicPlanIdsMissingCheckoutPrices: [],
            pricingReady: true,
            signupIntentReady: true,
            firebaseReadyForSelfServe: false,
            selfServeReady: false,
            checkoutReady: false,
            automationReady: false,
            checks: [
              {
                id: "self_serve",
                label: "Self-serve activation",
                status: "warning",
                detail: "Firebase client and admin readiness still block self-serve activation.",
                blocking: false,
              },
            ],
            blockingIssues: [],
          },
        },
      ),
    );

    const html = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Register founder intent");
    expect(html).toContain("Submit signup intent");
    expect(html).toContain("This environment stages the founder workspace first");
    expect(html).toContain("Record the founder intent clearly.");
  });

  it("exports canonical signup metadata", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const signupMetadata = await generateSignupMetadata();

    expect(signupMetadata.alternates?.canonical).toBe("/signup");
    expect(signupMetadata.description).toContain("guided signup");
  });
});
