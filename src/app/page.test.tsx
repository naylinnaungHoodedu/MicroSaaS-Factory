import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/server/funnel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/funnel")>();
  return {
    ...actual,
    getPublicFunnelState: getPublicFunnelStateMock,
  };
});

import { buildPublicFunnelStateForTests } from "@/test/public-funnel-state";

import Home, { generateMetadata as generateHomeMetadata } from "./page";

describe("/ page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("renders the shared public navigation and product-proof landing content", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("MicroSaaS Factory");
    expect(html).toContain("Overview");
    expect(html).toContain("Pricing");
    expect(html).toContain("Get started");
    expect(html).toContain("Validate faster, ship with more signal, and keep revenue decisions in the same workspace.");
    expect(html).toContain("Built for founders who already have signal and want a tighter operating rhythm.");
    expect(html).toContain("One operating rhythm from market signal to live revenue.");
    expect(html).toContain("What gets materially better once the workspace is live.");
    expect(html).toContain("Readiness stays attached to the public promise.");
    expect(html).toContain("Questions founders should be able to answer before they commit.");
    expect(html).toContain("Start founder workspace");
    expect(html).toContain("Founder login");
    expect(html).toContain("Terms");
    expect(html).toContain("Privacy");
  });

  it("renders the guided-entry CTA when self-serve is not enabled", async () => {
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
        },
      ),
    );

    const html = renderToStaticMarkup(await Home());

    expect(html).toContain("Start founder workspace");
    expect(html).toContain("Built for founders who already have signal and want a tighter operating rhythm.");
    expect(html).toContain("Readiness stays prominent on purpose.");
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).toContain(
      '"description":"Founder operating system for solo technical founders with public pricing, guided signup, launch control, and one workspace from first signal to revenue."',
    );
  });

  it("generates canonical public metadata for the homepage from funnel state", async () => {
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

    const homeMetadata = await generateHomeMetadata();

    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeMetadata.description).toContain("public pricing, guided signup");
    expect(homeMetadata.openGraph?.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/og.png",
        }),
      ]),
    );
  });
});
