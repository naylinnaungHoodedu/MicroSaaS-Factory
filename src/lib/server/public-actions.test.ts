import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createSignupIntentMock,
  createWaitlistRequestMock,
  getPublicFunnelStateMock,
  readDatabaseMock,
} = vi.hoisted(() => ({
  createSignupIntentMock: vi.fn(),
  createWaitlistRequestMock: vi.fn(),
  getPublicFunnelStateMock: vi.fn(),
  readDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/server/services", () => ({
  createSignupIntent: createSignupIntentMock,
  createWaitlistRequest: createWaitlistRequestMock,
}));

vi.mock("@/lib/server/funnel", () => ({
  getPublicFunnelState: getPublicFunnelStateMock,
}));

vi.mock("@/lib/server/db", () => ({
  readDatabase: readDatabaseMock,
}));

import {
  EXISTING_WORKSPACE_MESSAGE,
  createSignupIntentAction,
  initialSignupActionState,
  initialWaitlistActionState,
  submitWaitlistAction,
} from "@/lib/server/public-actions";

describe("public server actions", () => {
  beforeEach(() => {
    createSignupIntentMock.mockReset();
    createWaitlistRequestMock.mockReset();
    getPublicFunnelStateMock.mockReset();
    readDatabaseMock.mockReset();
  });

  it("returns a success state for waitlist submissions", async () => {
    createWaitlistRequestMock.mockResolvedValue({
      name: "Founder Name",
      email: "founder@example.com",
      challenge: "Workflow drag",
      notes: "GitHub, GCP",
    });

    const formData = new FormData();
    formData.set("name", "Founder Name");
    formData.set("email", "founder@example.com");
    formData.set("challenge", "Workflow drag");
    formData.set("notes", "GitHub, GCP");

    const result = await submitWaitlistAction(initialWaitlistActionState, formData);

    expect(result).toEqual({
      status: "success",
      message:
        "Your request has been recorded. Return to the overview or wait for an invite.",
      request: {
        name: "Founder Name",
        email: "founder@example.com",
        challenge: "Workflow drag",
        notes: "GitHub, GCP",
      },
    });
  });

  it("returns a guided-signup success state when self-serve is disabled", async () => {
    createSignupIntentMock.mockResolvedValue({
      id: "intent-1",
      founderName: "Founder Name",
      email: "founder@example.com",
      workspaceName: "Factory Lab",
      planId: "growth",
      status: "pending_activation",
    });
    getPublicFunnelStateMock.mockResolvedValue({
      availabilityMode: "signup_intent",
    });

    const formData = new FormData();
    formData.set("founderName", "Founder Name");
    formData.set("email", "founder@example.com");
    formData.set("workspaceName", "Factory Lab");
    formData.set("planId", "growth");

    const result = await createSignupIntentAction(initialSignupActionState, formData);

    expect(result).toEqual({
      status: "success",
      mode: "signup_intent",
      message:
        "Your signup intent has been recorded. Workspace activation still stays behind operator review until self-serve provisioning is enabled.",
      signupIntent: {
        id: "intent-1",
        founderName: "Founder Name",
        email: "founder@example.com",
        workspaceName: "Factory Lab",
        planId: "growth",
        status: "pending_activation",
      },
    });
  });

  it("returns a self-serve success state when provisioning is live", async () => {
    createSignupIntentMock.mockResolvedValue({
      id: "intent-2",
      founderName: "Founder Name",
      email: "founder@example.com",
      workspaceName: "Factory Lab",
      planId: "growth",
      status: "pending_activation",
    });
    getPublicFunnelStateMock.mockResolvedValue({
      availabilityMode: "self_serve",
    });

    const formData = new FormData();
    formData.set("founderName", "Founder Name");
    formData.set("email", "founder@example.com");
    formData.set("workspaceName", "Factory Lab");
    formData.set("planId", "growth");

    const result = await createSignupIntentAction(initialSignupActionState, formData);

    expect(result).toEqual({
      status: "success",
      mode: "self_serve",
      message:
        "Signup details saved for Factory Lab. Continue with Firebase to activate the workspace.",
      signupIntent: {
        id: "intent-2",
        founderName: "Founder Name",
        email: "founder@example.com",
        workspaceName: "Factory Lab",
        planId: "growth",
        status: "pending_activation",
      },
    });
  });

  it("returns a workspace-exists state for an already provisioned founder", async () => {
    createSignupIntentMock.mockRejectedValue(new Error(EXISTING_WORKSPACE_MESSAGE));
    readDatabaseMock.mockResolvedValue({
      users: [
        {
          id: "user-1",
          email: "founder@example.com",
          workspaceId: "workspace-1",
        },
      ],
      workspaces: [
        {
          id: "workspace-1",
          name: "Existing Lab",
          ownerUserId: "user-1",
        },
      ],
      signupIntents: [],
    });

    const formData = new FormData();
    formData.set("founderName", "Founder Name");
    formData.set("email", "founder@example.com");
    formData.set("workspaceName", "Factory Lab");
    formData.set("planId", "growth");

    const result = await createSignupIntentAction(initialSignupActionState, formData);

    expect(result).toEqual({
      status: "workspace_exists",
      loginHref: "/login",
      message: EXISTING_WORKSPACE_MESSAGE,
      signupIntent: null,
      workspaceName: "Existing Lab",
    });
  });

  it("returns an error state when signup is disabled or invalid", async () => {
    createSignupIntentMock.mockRejectedValue(new Error("Public signup is disabled."));

    const formData = new FormData();
    formData.set("founderName", "Founder Name");
    formData.set("email", "founder@example.com");
    formData.set("workspaceName", "Factory Lab");
    formData.set("planId", "growth");

    const result = await createSignupIntentAction(initialSignupActionState, formData);

    expect(result).toEqual({
      status: "error",
      message: "Public signup is disabled.",
    });
  });
});
