import { beforeEach, describe, expect, it, vi } from "vitest";

const { runValidationCrmJobMock } = vi.hoisted(() => ({
  runValidationCrmJobMock: vi.fn(),
}));

vi.mock("@/lib/server/services", () => ({
  runValidationCrmJob: runValidationCrmJobMock,
}));

import { POST } from "./route";

describe("POST /api/internal/jobs/validation-crm/run", () => {
  beforeEach(() => {
    runValidationCrmJobMock.mockReset();
    process.env.INTERNAL_AUTOMATION_KEY = "microsaas-automation";
  });

  it("rejects requests without the automation bearer token", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/jobs/validation-crm/run", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Unauthorized.",
    });
    expect(runValidationCrmJobMock).not.toHaveBeenCalled();
  });

  it("runs the CRM job when the bearer token matches", async () => {
    runValidationCrmJobMock.mockResolvedValue({
      analyzedSessionCount: 1,
      sentDigestCount: 1,
    });

    const response = await POST(
      new Request("http://localhost/api/internal/jobs/validation-crm/run", {
        method: "POST",
        headers: {
          Authorization: "Bearer microsaas-automation",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(runValidationCrmJobMock).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      result: {
        analyzedSessionCount: 1,
        sentDigestCount: 1,
      },
    });
  });
});
