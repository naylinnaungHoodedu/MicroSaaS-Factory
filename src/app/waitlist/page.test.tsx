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

vi.mock("@/lib/server/public-actions", () => ({
  submitWaitlistAction: vi.fn(),
  initialWaitlistActionState: {
    status: "idle",
  },
}));

vi.mock("@/lib/server/funnel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/funnel")>();
  return {
    ...actual,
    getPublicFunnelState: getPublicFunnelStateMock,
  };
});

import { buildPublicFunnelStateForTests } from "@/test/public-funnel-state";

import WaitlistPage, { generateMetadata as generateWaitlistMetadata } from "./page";

describe("/waitlist page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("renders the waitlist as a secondary path beside public signup", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const html = renderToStaticMarkup(
      await WaitlistPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Use the reviewed intake lane when context should come before direct signup.");
    expect(html).toContain("Open signup instead");
    expect(html).toContain("Waitlist is secondary when signup is already open.");
    expect(html).toContain("Reviewed intake");
    expect(html).toContain("Waitlist questions founders should not have to guess at.");
    expect(html).toContain("Terms");
    expect(html).toContain("Privacy");
  });

  it("exports canonical waitlist metadata", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const waitlistMetadata = await generateWaitlistMetadata();

    expect(waitlistMetadata.alternates?.canonical).toBe("/waitlist");
    expect(waitlistMetadata.description).toContain("reviewed intake");
  });
});
