import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicFunnelStateMock } = vi.hoisted(() => ({
  getPublicFunnelStateMock: vi.fn(),
}));

vi.mock("@/lib/server/funnel", () => ({
  getPublicFunnelState: getPublicFunnelStateMock,
}));

import manifest from "./manifest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("metadata routes", () => {
  beforeEach(() => {
    getPublicFunnelStateMock.mockReset();
  });

  it("returns a robots policy that excludes private surfaces", () => {
    const route = robots();

    expect(route.sitemap).toContain("/sitemap.xml");
    expect(route.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          disallow: expect.arrayContaining(["/admin", "/app", "/api"]),
        }),
      ]),
    );
  });

  it("returns a manifest with og and apple-safe icons", () => {
    const route = manifest();

    expect(route.name).toBe("MicroSaaS Factory");
    expect(route.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon-192.png" }),
        expect.objectContaining({ src: "/icon-512.png" }),
        expect.objectContaining({ src: "/apple-touch-icon.png" }),
      ]),
    );
  });

  it("builds a sitemap from the current public funnel state", async () => {
    getPublicFunnelStateMock.mockResolvedValue({
      waitlistOpen: true,
      pricingVisible: true,
      signupAvailable: true,
    });

    const route = await sitemap();
    const urls = route.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://microsaasfactory.io/",
        "https://microsaasfactory.io/login",
        "https://microsaasfactory.io/terms",
        "https://microsaasfactory.io/privacy",
        "https://microsaasfactory.io/waitlist",
        "https://microsaasfactory.io/pricing",
        "https://microsaasfactory.io/signup",
      ]),
    );
  });
});
