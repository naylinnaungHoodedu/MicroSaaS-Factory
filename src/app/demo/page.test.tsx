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

import DemoPage, { generateMetadata as generateDemoMetadata } from "./page";

describe("/demo page", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("renders the public read-only demo with launch-aware context and CTAs", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const html = renderToStaticMarkup(await DemoPage());

    expect(html).toContain("Public Demo Center");
    expect(html).toContain("Demo the MicroSaaS Factory loop from signal to live revenue.");
    expect(html).toContain("Understand the lane before you create or reopen a workspace.");
    expect(html).toContain("Choose the commercial path");
    expect(html).toContain("Operating model");
    expect(html).toContain("Six surfaces, one founder operating loop.");
    expect(html).toContain("Signal");
    expect(html).toContain("Validate");
    expect(html).toContain("Spec");
    expect(html).toContain("Build");
    expect(html).toContain("Launch");
    expect(html).toContain("Operate");
    expect(html).toContain("The public demo reflects what the launch funnel can safely do today.");
    expect(html).toContain("One operating rhythm from market signal to live revenue.");
    expect(html).toContain("What the demo proves");
    expect(html).toContain("Does the Demo tab create or mutate workspace data?");
    expect(html).toContain("Why does Demo link back to existing surfaces?");
    expect(html).toContain("Start founder workspace");
    expect(html).toContain("Founder login");
    expect(html).toContain('href="/demo"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("exports canonical Demo metadata", async () => {
    getPublicFunnelStateMock.mockResolvedValue(buildPublicFunnelStateForTests());

    const metadata = await generateDemoMetadata();

    expect(metadata.alternates?.canonical).toBe("/demo");
    expect(metadata.description).toContain("Read-only MicroSaaS Factory demo");
  });
});
