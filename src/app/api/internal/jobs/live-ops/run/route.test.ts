import { beforeEach, describe, expect, it, vi } from "vitest";

const { runLiveOpsAutomationMock } = vi.hoisted(() => ({
  runLiveOpsAutomationMock: vi.fn(),
}));

vi.mock("@/lib/server/services", () => ({
  runLiveOpsAutomation: runLiveOpsAutomationMock,
}));

import { POST } from "./route";

describe("POST /api/internal/jobs/live-ops/run", () => {
  beforeEach(() => {
    runLiveOpsAutomationMock.mockReset();
    process.env.INTERNAL_AUTOMATION_KEY = "microsaas-automation";
  });

  it("rejects requests without the automation bearer token", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/jobs/live-ops/run", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Unauthorized.",
    });
  });

  it("runs the unified live ops automation job when authorized", async () => {
    runLiveOpsAutomationMock.mockResolvedValue({
      analyzedSessionCount: 1,
      sentDigestCount: 1,
      targetedIntegrationCount: 2,
      refreshedIntegrationCount: 2,
      failedIntegrationCount: 0,
      refreshesByProvider: {
        github: 1,
        gcp: 1,
        stripe: 0,
        resend: 0,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/internal/jobs/live-ops/run", {
        method: "POST",
        headers: {
          Authorization: "Bearer microsaas-automation",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(runLiveOpsAutomationMock).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      result: {
        analyzedSessionCount: 1,
        sentDigestCount: 1,
        targetedIntegrationCount: 2,
        refreshedIntegrationCount: 2,
        failedIntegrationCount: 0,
        refreshesByProvider: {
          github: 1,
          gcp: 1,
          stripe: 0,
          resend: 0,
        },
      },
    });
  });
});
