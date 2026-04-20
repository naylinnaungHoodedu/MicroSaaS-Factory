import { beforeEach, describe, expect, it, vi } from "vitest";

const { handleGithubWebhookMock, verifyGithubWebhookSignatureMock } = vi.hoisted(() => ({
  handleGithubWebhookMock: vi.fn(),
  verifyGithubWebhookSignatureMock: vi.fn(),
}));

vi.mock("@/lib/server/integrations", () => ({
  verifyGithubWebhookSignature: verifyGithubWebhookSignatureMock,
}));

vi.mock("@/lib/server/services", () => ({
  handleGithubWebhook: handleGithubWebhookMock,
}));

import { POST } from "./route";

describe("POST /api/webhooks/github", () => {
  beforeEach(() => {
    handleGithubWebhookMock.mockReset();
    verifyGithubWebhookSignatureMock.mockReset();
  });

  it("rejects invalid signatures", async () => {
    verifyGithubWebhookSignatureMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=invalid",
        },
        body: JSON.stringify({ action: "push" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Invalid signature",
    });
  });

  it("accepts valid signatures", async () => {
    verifyGithubWebhookSignatureMock.mockReturnValue(true);
    handleGithubWebhookMock.mockResolvedValue({
      received: true,
      eventName: "push",
      matchedConnectionCount: 1,
      refreshedCount: 1,
      failedCount: 0,
    });

    const response = await POST(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=valid",
          "x-github-event": "push",
        },
        body: JSON.stringify({ action: "push" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(handleGithubWebhookMock).toHaveBeenCalledWith('{"action":"push"}', "push");
    expect(await response.json()).toEqual({
      received: true,
      eventName: "push",
      matchedConnectionCount: 1,
      refreshedCount: 1,
      failedCount: 0,
    });
  });
});
