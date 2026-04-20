import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicPricingDataMock, redirectMock } = vi.hoisted(() => ({
  getPublicPricingDataMock: vi.fn(),
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

vi.mock("@/lib/server/services", () => ({
  getPublicPricingData: getPublicPricingDataMock,
}));

import PricingPage from "./page";

describe("/pricing page", () => {
  beforeEach(() => {
    getPublicPricingDataMock.mockReset();
    redirectMock.mockReset();
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`REDIRECT:${target}`);
    });
  });

  it("redirects to home when platform billing is hidden", async () => {
    getPublicPricingDataMock.mockResolvedValue({
      flags: {
        platformBillingEnabled: false,
      },
      plans: [],
    });

    await expect(PricingPage()).rejects.toThrow("REDIRECT:/");
  });

  it("renders pricing content when platform billing is enabled", async () => {
    getPublicPricingDataMock.mockResolvedValue({
      flags: {
        platformBillingEnabled: true,
        publicSignupEnabled: true,
      },
      plans: [
        {
          id: "beta-invite",
          name: "Invite Beta",
          hidden: true,
          monthlyPrice: 49,
          annualPrice: 490,
          features: ["Single founder workspace"],
        },
      ],
    });

    const html = renderToStaticMarkup(await PricingPage());

    expect(html).toContain("Choose the MicroSaaS Factory lane");
    expect(html).toContain("Invite Beta");
    expect(html).toContain("Continue to signup");
  });
});
