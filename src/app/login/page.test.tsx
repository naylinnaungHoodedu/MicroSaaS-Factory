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

vi.mock("@/lib/server/actions", () => ({
  loginAction: vi.fn(),
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

import LoginPage, { generateMetadata as generateLoginMetadata } from "./page";

describe("/login page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("renders Firebase re-entry plus invite-token fallback", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Return to your founder workspace.");
    expect(html).toContain("Recovery posture stays visible, not buried.");
    expect(html).toContain("Firebase Panel");
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain("Recovery model");
    expect(html).toContain("Founder recovery should feel coherent across the whole public surface.");
    expect(html).toContain("Terms");
    expect(html).toContain("Privacy");
  });

  it("renders the invite-led fallback message when Firebase is unavailable", async () => {
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
        },
      ),
    );

    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Sign in with your invite.");
    expect(html).not.toContain("Firebase Panel");
    expect(html).toContain("invite-token access remains the supported founder return path");
  });

  it("exports canonical login metadata", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const loginMetadata = await generateLoginMetadata();

    expect(loginMetadata.alternates?.canonical).toBe("/login");
    expect(loginMetadata.description).toContain("fastest available sign-in path");
  });
});
