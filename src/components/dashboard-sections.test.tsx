import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardBillingSection } from "@/components/dashboard-sections";

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
  archiveProductAction: vi.fn(),
  cloneProductAction: vi.fn(),
  restoreProductAction: vi.fn(),
}));

describe("DashboardBillingSection", () => {
  it("renders the public commercialization posture beside founder billing guidance", () => {
    const html = renderToStaticMarkup(
      <DashboardBillingSection
        viewModel={{
          activeProductCount: 0,
          archivedProductCount: 0,
          canStartCheckout: false,
          passedGates: 0,
          pricingData: {
            flags: {
              inviteOnlyBeta: true,
              publicWaitlist: true,
              publicSignupEnabled: true,
              selfServeProvisioningEnabled: false,
              checkoutEnabled: false,
              platformBillingEnabled: true,
              proAiEnabled: false,
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
          },
          publicFunnel: {
            summary: {
              eyebrow: "Guided Signup",
              title:
                "Start the founder workspace with clear pricing, guided signup, and a visible next step.",
              detail:
                "Founders can evaluate the lane, stage the workspace, and know what happens next before self-serve and checkout are fully opened.",
              tone: "cyan",
            },
          },
          readyProducts: 0,
          subscription: {
            id: "subscription-1",
            workspaceId: "workspace-1",
            planId: "growth",
            status: "beta",
            source: "invite",
            createdAt: "2026-04-22T00:00:00.000Z",
            updatedAt: "2026-04-22T00:00:00.000Z",
          },
          totalMrr: 0,
          billingGuidance: {
            title: "Compare plans now and move into billing when the workspace becomes eligible.",
            detail:
              "Public pricing is visible, and billing opens once both workspace eligibility and runtime readiness are aligned.",
            nextStep:
              "Use the pricing cards below as a reference, then return here when the workspace is ready to upgrade.",
            operatorCard: {
              eyebrow: "Launch Target",
              title:
                "Target posture: pricing visible, signup live, self-serve on, and checkout on once runtime and verification are green.",
              detail:
                "Full self-serve launch still needs firebase readiness, stripe readiness, and the manual edge and DNS confirmations.",
            },
          },
          billingReadiness: {
            summary:
              "Repo-controlled launch work still needs self-serve activation and stripe checkout. External verification remains required after deploy.",
            repoControlledIssues: [
              "Self-serve activation: Firebase client and admin readiness still block self-serve activation.",
            ],
            workspaceItems: [
              "Self-serve activation stays staged while the identity and provisioning path are still being finalized.",
            ],
            externalChecks: [
              "Confirm http://microsaasfactory.io returns HTTP 301 to HTTPS before long HSTS.",
            ],
          },
          controlTower: {
            title: "Factory Lab control tower",
            detail:
              "See portfolio health, commercial posture, and the next operating move from one workspace summary.",
            focusItems: [
              "Open the first product lane.",
              "Turn raw founder context into structured research and validation evidence.",
              "Use the workspace as the operating home instead of scattered notes and side tools.",
            ],
            nextAction:
              "Open the first product lane and turn founder context into trackable operating evidence.",
          },
        } as never}
      />,
    );

    expect(html).toContain("Guided Signup");
    expect(html).toContain(
      "Start the founder workspace with clear pricing, guided signup, and a visible next step.",
    );
    expect(html).toContain("Launch Target");
    expect(html).toContain("Growth");
    expect(html).toContain("Workspace launch guidance");
    expect(html).toContain("External verification");
  });
});
