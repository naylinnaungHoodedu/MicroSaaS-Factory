export type PendingEmailLinkState = {
  email: string;
  mode?: "invite" | "signup" | "login";
  inviteToken?: string;
  signupIntentId?: string;
  redirectTo?: string;
};

export function buildFirebaseSessionExchangeInput(input: {
  mode: "invite" | "signup" | "login";
  idToken: string;
  inviteToken?: string;
  signupIntentId?: string;
  pendingState?: PendingEmailLinkState | null;
}) {
  const pendingStateMatchesMode = input.pendingState?.mode === input.mode;

  return {
    idToken: input.idToken,
    inviteToken:
      input.mode === "invite"
        ? input.inviteToken ??
          (pendingStateMatchesMode ? input.pendingState?.inviteToken : undefined)
        : undefined,
    signupIntentId:
      input.mode === "signup"
        ? input.signupIntentId ??
          (pendingStateMatchesMode ? input.pendingState?.signupIntentId : undefined)
        : undefined,
  };
}
