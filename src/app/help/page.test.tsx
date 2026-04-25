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

import HelpPage, { generateMetadata as generateHelpMetadata } from "./page";

describe("/help page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("renders public Help Center guidance with launch-aware recovery content", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const html = renderToStaticMarkup(await HelpPage());

    expect(html).toContain("Operational guidance for every founder using MicroSaaS Factory.");
    expect(html).toContain("Public guide");
    expect(html).toContain("Read this first");
    expect(html).toContain("Preserve the same founder email");
    expect(html).toContain("Quick start");
    expect(html).toContain("What each area is for");
    expect(html).toContain("How MicroSaaS Factory behaves end to end");
    expect(html).toContain("What the processing and readiness states mean");
    expect(html).toContain("Common issues and the fastest recovery path");
    expect(html).toContain("Checkout buttons are not visible.");
    expect(html).toContain('href="/help"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("exports canonical Help Center metadata", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const metadata = await generateHelpMetadata();

    expect(metadata.alternates?.canonical).toBe("/help");
    expect(metadata.description).toContain("Operational Help Center");
  });
});
