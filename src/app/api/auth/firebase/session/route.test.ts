import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthModeInfoMock,
  verifyFirebaseIdTokenMock,
  activateSelfServeSignupWithFirebaseIdentityMock,
  completeInviteWithFirebaseIdentityMock,
  loginWithFirebaseIdentityMock,
  createFounderSessionRecordMock,
  getSessionCookieDescriptorMock,
} = vi.hoisted(() => ({
  getAuthModeInfoMock: vi.fn(),
  verifyFirebaseIdTokenMock: vi.fn(),
  activateSelfServeSignupWithFirebaseIdentityMock: vi.fn(),
  completeInviteWithFirebaseIdentityMock: vi.fn(),
  loginWithFirebaseIdentityMock: vi.fn(),
  createFounderSessionRecordMock: vi.fn(),
  getSessionCookieDescriptorMock: vi.fn(),
}));

vi.mock("@/lib/server/auth-mode", () => ({
  getAuthModeInfo: getAuthModeInfoMock,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  verifyFirebaseIdToken: verifyFirebaseIdTokenMock,
}));

vi.mock("@/lib/server/services", () => ({
  activateSelfServeSignupWithFirebaseIdentity: activateSelfServeSignupWithFirebaseIdentityMock,
  completeInviteWithFirebaseIdentity: completeInviteWithFirebaseIdentityMock,
  loginWithFirebaseIdentity: loginWithFirebaseIdentityMock,
}));

vi.mock("@/lib/server/auth", () => ({
  createFounderSessionRecord: createFounderSessionRecordMock,
  getSessionCookieDescriptor: getSessionCookieDescriptorMock,
}));

import { POST } from "./route";

describe("POST /api/auth/firebase/session", () => {
  beforeEach(() => {
    getAuthModeInfoMock.mockReset();
    verifyFirebaseIdTokenMock.mockReset();
    activateSelfServeSignupWithFirebaseIdentityMock.mockReset();
    completeInviteWithFirebaseIdentityMock.mockReset();
    loginWithFirebaseIdentityMock.mockReset();
    createFounderSessionRecordMock.mockReset();
    getSessionCookieDescriptorMock.mockReset();

    getAuthModeInfoMock.mockReturnValue({
      inviteTokenEnabled: true,
      firebaseClientConfigured: true,
      firebaseAdminConfigured: true,
      firebaseEnabled: true,
      firebaseProjectId: "demo-project",
      firebaseError: null,
    });
    verifyFirebaseIdTokenMock.mockResolvedValue({
      email: "founder@example.com",
      email_verified: true,
      name: "Founder Name",
      firebase: {
        sign_in_provider: "google.com",
      },
    });
    completeInviteWithFirebaseIdentityMock.mockResolvedValue({
      id: "user-1",
      email: "founder@example.com",
      name: "Founder Name",
    });
    activateSelfServeSignupWithFirebaseIdentityMock.mockResolvedValue({
      id: "user-1",
      email: "founder@example.com",
      name: "Founder Name",
    });
    loginWithFirebaseIdentityMock.mockResolvedValue({
      id: "user-1",
      email: "founder@example.com",
      name: "Founder Name",
    });
    createFounderSessionRecordMock.mockResolvedValue({
      id: "session-1",
    });
    getSessionCookieDescriptorMock.mockReturnValue({
      name: "msf_session",
      value: "session-1",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    });
  });

  it("returns 503 when Firebase sign-in is disabled", async () => {
    getAuthModeInfoMock.mockReturnValue({
      firebaseEnabled: false,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "token" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Firebase sign-in is not configured for this environment.",
    });
  });

  it("returns 400 when the Firebase ID token is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Firebase ID token is required.",
    });
    expect(verifyFirebaseIdTokenMock).not.toHaveBeenCalled();
  });

  it("returns the invite mismatch error for invite-scoped Firebase sign-in", async () => {
    completeInviteWithFirebaseIdentityMock.mockRejectedValue(
      new Error("Invite email does not match."),
    );

    const response = await POST(
      new Request("http://localhost/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "token",
          inviteToken: "invite-token",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invite email does not match.",
    });
    expect(completeInviteWithFirebaseIdentityMock).toHaveBeenCalledWith({
      token: "invite-token",
      email: "founder@example.com",
      name: "Founder Name",
      providerId: "google.com",
    });
  });

  it("rejects Firebase accounts without a verified email", async () => {
    verifyFirebaseIdTokenMock.mockResolvedValue({
      email: "founder@example.com",
      email_verified: false,
      name: "Founder Name",
      firebase: {
        sign_in_provider: "google.com",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "token",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Firebase account must have a verified email address.",
    });
    expect(loginWithFirebaseIdentityMock).not.toHaveBeenCalled();
  });

  it("uses the non-invite Firebase login path when no invite token is provided", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "token",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(loginWithFirebaseIdentityMock).toHaveBeenCalledWith({
      email: "founder@example.com",
      name: "Founder Name",
      providerId: "google.com",
    });
    expect(activateSelfServeSignupWithFirebaseIdentityMock).not.toHaveBeenCalled();
    expect(completeInviteWithFirebaseIdentityMock).not.toHaveBeenCalled();
  });

  it("provisions a self-serve workspace when a signup intent id is provided", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "token",
          signupIntentId: "intent-1",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(activateSelfServeSignupWithFirebaseIdentityMock).toHaveBeenCalledWith({
      signupIntentId: "intent-1",
      email: "founder@example.com",
      name: "Founder Name",
      providerId: "google.com",
    });
    expect(loginWithFirebaseIdentityMock).not.toHaveBeenCalled();
  });

  it("creates a local founder session cookie for successful invite-scoped Firebase sign-in", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "token",
          inviteToken: "invite-token",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      user: {
        email: "founder@example.com",
        name: "Founder Name",
      },
    });
    expect(completeInviteWithFirebaseIdentityMock).toHaveBeenCalledWith({
      token: "invite-token",
      email: "founder@example.com",
      name: "Founder Name",
      providerId: "google.com",
    });
    expect(loginWithFirebaseIdentityMock).not.toHaveBeenCalled();
    expect(createFounderSessionRecordMock).toHaveBeenCalledWith("user-1");
    expect(response.headers.get("set-cookie")).toContain("msf_session=session-1");
  });
});
