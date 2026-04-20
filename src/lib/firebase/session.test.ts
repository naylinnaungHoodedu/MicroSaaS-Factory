import { describe, expect, it } from "vitest";

import {
  buildFirebaseSessionExchangeInput,
  type PendingEmailLinkState,
} from "@/lib/firebase/session";

describe("buildFirebaseSessionExchangeInput", () => {
  it("includes an explicit signup intent id for self-serve Firebase sign-in", () => {
    expect(
      buildFirebaseSessionExchangeInput({
        mode: "signup",
        idToken: "token-1",
        signupIntentId: "intent-1",
      }),
    ).toEqual({
      idToken: "token-1",
      inviteToken: undefined,
      signupIntentId: "intent-1",
    });
  });

  it("falls back to the pending email-link signup intent id when resuming sign-in", () => {
    const pendingState: PendingEmailLinkState = {
      email: "founder@example.com",
      mode: "signup",
      signupIntentId: "intent-2",
      redirectTo: "/signup?intent=intent-2",
    };

    expect(
      buildFirebaseSessionExchangeInput({
        mode: "signup",
        idToken: "token-2",
        pendingState,
      }),
    ).toEqual({
      idToken: "token-2",
      inviteToken: undefined,
      signupIntentId: "intent-2",
    });
  });

  it("prefers explicit invite and signup values over persisted pending state", () => {
    const pendingState: PendingEmailLinkState = {
      email: "founder@example.com",
      mode: "signup",
      inviteToken: "invite-from-storage",
      signupIntentId: "intent-from-storage",
    };

    expect(
      buildFirebaseSessionExchangeInput({
        mode: "signup",
        idToken: "token-3",
        inviteToken: "invite-explicit",
        signupIntentId: "intent-explicit",
        pendingState,
      }),
    ).toEqual({
      idToken: "token-3",
      inviteToken: undefined,
      signupIntentId: "intent-explicit",
    });
  });

  it("does not leak identifiers from a different pending auth mode", () => {
    const pendingState: PendingEmailLinkState = {
      email: "founder@example.com",
      mode: "invite",
      inviteToken: "invite-1",
    };

    expect(
      buildFirebaseSessionExchangeInput({
        mode: "signup",
        idToken: "token-4",
        pendingState,
      }),
    ).toEqual({
      idToken: "token-4",
      inviteToken: undefined,
      signupIntentId: undefined,
    });
  });
});
