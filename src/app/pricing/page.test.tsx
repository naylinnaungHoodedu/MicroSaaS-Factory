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

vi.mock("@/lib/server/actions", () => ({
  startPlatformCheckoutAction: vi.fn(),
}));

vi.mock("@/lib/server/funnel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/funnel")>();
  return {
    ...actual,
    getPublicFunnelState: getPublicFunnelStateMock,
  };
});

import { buildPublicFunnelStateForTests } from "@/test/public-funnel-state";

import PricingPage, { generateMetadata as generatePricingMetadata } from "./page";

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
      buildPublicFunnelStateForTests({
        plans: [],
        pricingVisible: false,
      }),
    );

    await expect(PricingPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/",
    );
  });

  it("renders the pricing surface with workspace-aware billing guidance", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const html = renderToStaticMarkup(
      await PricingPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Choose the Growth lane without losing sight of the workspace path.");
    expect(html).toContain("Growth");
    expect(html).toContain("Billing posture stays attached to launch readiness.");
    expect(html).toContain("Commercial posture");
    expect(html).toContain("What founders can do now versus what the launch target unlocks later.");
    expect(html).toContain("Pricing questions that should be answered before checkout opens.");
    expect(html).toContain("Compare the public plan and choose the lane that matches the founder workspace.");
    expect(html).not.toContain("Start monthly checkout");
  });

  it("renders checkout buttons for eligible founder workspaces", async () => {
    getPublicFunnelStateMock.mockResolvedValue(
      buildPublicFunnelStateForTests(
        {},
        {
          founder: {
            workspaceId: "workspace-1",
            workspaceName: "Factory Lab",
            subscriptionStatus: "trial",
          },
        },
      ),
    );

    const html = renderToStaticMarkup(
      await PricingPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Start monthly checkout");
    expect(html).toContain("Start annual checkout");
  });

  it("renders cancelled and error return-state messaging", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const cancelledHtml = renderToStaticMarkup(
      await PricingPage({
        searchParams: Promise.resolve({ billing: "cancelled" }),
      }),
    );
    const errorHtml = renderToStaticMarkup(
      await PricingPage({
        searchParams: Promise.resolve({
          billing: "error",
          reason: "Checkout could not be started from this pricing page.",
        }),
      }),
    );

    expect(cancelledHtml).toContain("Checkout was canceled before completion.");
    expect(errorHtml).toContain("Checkout could not be started from this pricing page.");
  });

  it("exports canonical pricing metadata", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const pricingMetadata = await generatePricingMetadata();

    expect(pricingMetadata.alternates?.canonical).toBe("/pricing");
    expect(pricingMetadata.description).toContain("workspace-aware billing");
  });
});
