import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRuntimeHealthSnapshotMock } = vi.hoisted(() => ({
  getRuntimeHealthSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/server/runtime-config", () => ({
  getRuntimeHealthSnapshot: getRuntimeHealthSnapshotMock,
}));

import { GET } from "./route";

describe("GET /api/healthz", () => {
  beforeEach(() => {
    getRuntimeHealthSnapshotMock.mockReset();
  });

  it("returns 200 when the staged rollout is production-safe", async () => {
    getRuntimeHealthSnapshotMock.mockResolvedValue({
      ok: true,
      generatedAt: "2026-04-20T00:00:00.000Z",
      appUrl: "https://microsaasfactory.io",
      guidance: {
        summary: "Repo-controlled launch work still needs self-serve activation, stripe checkout, and automation scheduling. External verification remains required after deploy.",
        nextStep:
          "Finish the remaining Firebase, Stripe, or runtime setup, deploy the build, verify /api/healthz, then run verify-public-edge.ps1 with launch expectations.",
        repoControlledIssues: [
          "Self-serve activation: Firebase client and admin readiness still block self-serve activation.",
        ],
        externalVerification: [
          "Verify /api/healthz returns selfServeReady=true and checkoutReady=true after deploy.",
          "Confirm http://microsaasfactory.io returns HTTP 301 to HTTPS before long HSTS.",
          "Exercise live Stripe checkout successfully before leaving checkoutEnabled=true.",
          "Confirm SPF, DKIM, DMARC, and CAA records for the active sender domain.",
        ],
      },
      readiness: {
        pricingReady: true,
        signupIntentReady: true,
        checkoutReady: false,
        selfServeReady: false,
        automationReady: true,
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      generatedAt: "2026-04-20T00:00:00.000Z",
      appUrl: "https://microsaasfactory.io",
      guidance: {
        summary: "Repo-controlled launch work still needs self-serve activation, stripe checkout, and automation scheduling. External verification remains required after deploy.",
        nextStep:
          "Finish the remaining Firebase, Stripe, or runtime setup, deploy the build, verify /api/healthz, then run verify-public-edge.ps1 with launch expectations.",
        repoControlledIssues: [
          "Self-serve activation: Firebase client and admin readiness still block self-serve activation.",
        ],
        externalVerification: [
          "Verify /api/healthz returns selfServeReady=true and checkoutReady=true after deploy.",
          "Confirm http://microsaasfactory.io returns HTTP 301 to HTTPS before long HSTS.",
          "Exercise live Stripe checkout successfully before leaving checkoutEnabled=true.",
          "Confirm SPF, DKIM, DMARC, and CAA records for the active sender domain.",
        ],
      },
      readiness: {
        pricingReady: true,
        signupIntentReady: true,
        checkoutReady: false,
        selfServeReady: false,
        automationReady: true,
      },
    });
  });

  it("returns 503 when the runtime snapshot has blocking issues", async () => {
    getRuntimeHealthSnapshotMock.mockResolvedValue({
      ok: false,
      generatedAt: "2026-04-20T00:00:00.000Z",
      appUrl: "https://microsaasfactory.io",
      guidance: {
        summary: "Repo-controlled launch work still needs public pricing, signup intent, self-serve activation, stripe checkout, and automation scheduling. External verification remains required after deploy.",
        nextStep:
          "Finish the remaining Firebase, Stripe, or runtime setup, deploy the build, verify /api/healthz, then run verify-public-edge.ps1 with launch expectations.",
        repoControlledIssues: [
          "Public pricing: No visible public plans are available for public pricing.",
        ],
        externalVerification: [
          "Verify /api/healthz returns selfServeReady=true and checkoutReady=true after deploy.",
          "Confirm http://microsaasfactory.io returns HTTP 301 to HTTPS before long HSTS.",
          "Exercise live Stripe checkout successfully before leaving checkoutEnabled=true.",
          "Confirm SPF, DKIM, DMARC, and CAA records for the active sender domain.",
        ],
      },
      readiness: {
        pricingReady: false,
        signupIntentReady: false,
        checkoutReady: false,
        selfServeReady: false,
        automationReady: false,
      },
    });

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      generatedAt: "2026-04-20T00:00:00.000Z",
      appUrl: "https://microsaasfactory.io",
      guidance: {
        summary: "Repo-controlled launch work still needs public pricing, signup intent, self-serve activation, stripe checkout, and automation scheduling. External verification remains required after deploy.",
        nextStep:
          "Finish the remaining Firebase, Stripe, or runtime setup, deploy the build, verify /api/healthz, then run verify-public-edge.ps1 with launch expectations.",
        repoControlledIssues: [
          "Public pricing: No visible public plans are available for public pricing.",
        ],
        externalVerification: [
          "Verify /api/healthz returns selfServeReady=true and checkoutReady=true after deploy.",
          "Confirm http://microsaasfactory.io returns HTTP 301 to HTTPS before long HSTS.",
          "Exercise live Stripe checkout successfully before leaving checkoutEnabled=true.",
          "Confirm SPF, DKIM, DMARC, and CAA records for the active sender domain.",
        ],
      },
      readiness: {
        pricingReady: false,
        signupIntentReady: false,
        checkoutReady: false,
        selfServeReady: false,
        automationReady: false,
      },
    });
  });

  it("returns 503 with an error payload when the health check throws", async () => {
    getRuntimeHealthSnapshotMock.mockRejectedValue(new Error("Firestore unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Firestore unavailable",
    });
  });
});
