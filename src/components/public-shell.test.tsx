import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

import { buildPublicFunnelStateForTests } from "@/test/public-funnel-state";

import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-shell";

describe("public shell", () => {
  it("renders the shared public header navigation and CTA links", () => {
    const html = renderToStaticMarkup(
      <PublicSiteHeader state={buildPublicFunnelStateForTests()} />,
    );

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/signup"');
    expect(html).toContain('href="/waitlist"');
    expect(html).toContain('href="/login"');
    expect(html).toContain("Start founder workspace");
    expect(html).toContain("See pricing");
    expect(html).toContain("Solo founder operating system");
    expect(html).toContain("Get started");
  });

  it("renders footer posture copy from the shared funnel footer state", () => {
    const html = renderToStaticMarkup(
      <PublicSiteFooter state={buildPublicFunnelStateForTests()} />,
    );

    expect(html).toContain("Founder operating system with live self-serve activation");
    expect(html).toContain("launch self-serve live");
    expect(html).toContain("pricing visible");
    expect(html).toContain("checkout visible");
    expect(html).toContain("access firebase + fallback");
  });
});
