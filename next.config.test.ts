import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("next.config launch hardening", () => {
  it("disables the Next.js power header and applies global security headers", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);

    const routes = await nextConfig.headers?.();

    expect(routes).toHaveLength(1);
    expect(routes?.[0]?.source).toBe("/:path*");

    const headerMap = new Map(routes?.[0]?.headers.map((header) => [header.key, header.value]));

    expect(headerMap.get("Strict-Transport-Security")).toBe("max-age=86400");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Permissions-Policy")).toContain("camera=()");
    expect(headerMap.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
    expect(headerMap.get("Content-Security-Policy")).toContain(
      "https://js.stripe.com",
    );
    expect(headerMap.has("Content-Security-Policy-Report-Only")).toBe(false);
  });
});
