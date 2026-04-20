import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthModeInfoMock, getPublicPricingDataMock, getSignupIntentByIdMock, redirectMock } =
  vi.hoisted(() => ({
    getAuthModeInfoMock: vi.fn(),
    getPublicPricingDataMock: vi.fn(),
    getSignupIntentByIdMock: vi.fn(),
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

vi.mock("@/lib/server/auth-mode", () => ({
  getAuthModeInfo: getAuthModeInfoMock,
}));

vi.mock("@/lib/server/services", () => ({
  getPublicPricingData: getPublicPricingDataMock,
  getSignupIntentById: getSignupIntentByIdMock,
}));

import SignupPage from "./page";

describe("/signup page", () => {
  beforeEach(() => {
    getPublicPricingDataMock.mockReset();
    getAuthModeInfoMock.mockReset();
    getSignupIntentByIdMock.mockReset();
    redirectMock.mockReset();
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`REDIRECT:${target}`);
    });
    getAuthModeInfoMock.mockReturnValue({
      firebaseEnabled: false,
      firebaseTestMode: false,
    });
    getSignupIntentByIdMock.mockResolvedValue(null);
  });

  it("redirects to the waitlist when public signup is hidden", async () => {
    getPublicPricingDataMock.mockResolvedValue({
      flags: {
        publicSignupEnabled: false,
        selfServeProvisioningEnabled: false,
      },
      plans: [],
    });

    await expect(
      SignupPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("REDIRECT:/waitlist");
  });

  it("renders the signup form when public signup is enabled", async () => {
    getPublicPricingDataMock.mockResolvedValue({
      flags: {
        publicSignupEnabled: true,
        selfServeProvisioningEnabled: false,
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
    getPublicPricingDataMock.mockResolvedValue({
      flags: {
        publicSignupEnabled: true,
        selfServeProvisioningEnabled: true,
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
    getAuthModeInfoMock.mockReturnValue({
      firebaseEnabled: true,
      firebaseTestMode: false,
    });
    getSignupIntentByIdMock.mockResolvedValue({
      id: "intent-1",
      founderName: "Founder Name",
      email: "founder@example.com",
      workspaceName: "Factory Lab",
      planId: "beta-invite",
      status: "pending_activation",
      createdAt: "2026-04-17T00:00:00.000Z",
    });

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
    getPublicPricingDataMock.mockResolvedValue({
      flags: {
        publicSignupEnabled: true,
        selfServeProvisioningEnabled: true,
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

    const html = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Self-serve workspace activation is enabled");
  });
});
