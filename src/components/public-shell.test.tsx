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

import { PublicSiteFooter } from "@/components/public-shell";

describe("PublicSiteFooter", () => {
  it("renders the shared public launch navigation links", () => {
    const html = renderToStaticMarkup(<PublicSiteFooter />);

    expect(html).toContain('href="/pricing"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/waitlist"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
  });
});
