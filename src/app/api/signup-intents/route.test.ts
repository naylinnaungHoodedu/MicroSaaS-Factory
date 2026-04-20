import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSignupIntentMock } = vi.hoisted(() => ({
  createSignupIntentMock: vi.fn(),
}));

vi.mock("@/lib/server/services", () => ({
  createSignupIntent: createSignupIntentMock,
}));

import { POST } from "./route";

describe("POST /api/signup-intents", () => {
  beforeEach(() => {
    createSignupIntentMock.mockReset();
  });

  it("creates a signup intent when public signup is enabled", async () => {
    createSignupIntentMock.mockResolvedValue({
      id: "intent-1",
      email: "founder@example.com",
    });

    const response = await POST(
      new Request("http://localhost/api/signup-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founderName: "Founder Name",
          email: "founder@example.com",
          workspaceName: "Factory Lab",
          planId: "beta-invite",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createSignupIntentMock).toHaveBeenCalledWith({
      founderName: "Founder Name",
      email: "founder@example.com",
      workspaceName: "Factory Lab",
      planId: "beta-invite",
    });
    expect(await response.json()).toEqual({
      signupIntent: {
        id: "intent-1",
        email: "founder@example.com",
      },
    });
  });

  it("returns 403 when public signup is disabled", async () => {
    createSignupIntentMock.mockRejectedValue(new Error("Public signup is disabled."));

    const response = await POST(
      new Request("http://localhost/api/signup-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founderName: "Founder Name",
          email: "founder@example.com",
          workspaceName: "Factory Lab",
          planId: "beta-invite",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Public signup is disabled.",
    });
  });
});
