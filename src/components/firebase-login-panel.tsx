"use client";

import { startTransition, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
} from "firebase/auth";

import { getFirebaseAuthClient } from "@/lib/firebase/client";
import {
  buildFirebaseSessionExchangeInput,
  type PendingEmailLinkState,
} from "@/lib/firebase/session";

const EMAIL_STORAGE_KEY = "msf-email-link";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readPendingEmailLinkState() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(EMAIL_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingEmailLinkState;

    if (typeof parsed.email === "string") {
      return parsed;
    }
  } catch {
    return { email: normalizeEmail(raw) } satisfies PendingEmailLinkState;
  }

  return null;
}

function writePendingEmailLinkState(state: PendingEmailLinkState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(state));
}

function clearPendingEmailLinkState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(EMAIL_STORAGE_KEY);
}

async function exchangeFirebaseSession(input: {
  idToken: string;
  inviteToken?: string;
  signupIntentId?: string;
}) {
  const response = await fetch("/api/auth/firebase/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? "Firebase sign-in failed.");
  }
}

export function FirebaseLoginPanel({
  enabled,
  testMode = false,
  inviteToken,
  signupIntentId,
  prefilledEmail,
  emailLocked = false,
  redirectTo = "/login",
  mode = "login",
}: {
  enabled: boolean;
  testMode?: boolean;
  inviteToken?: string;
  signupIntentId?: string;
  prefilledEmail?: string;
  emailLocked?: boolean;
  redirectTo?: string;
  mode?: "login" | "invite" | "signup";
}) {
  const normalizedPrefilledEmail = prefilledEmail ? normalizeEmail(prefilledEmail) : "";
  const [email, setEmail] = useState(normalizedPrefilledEmail);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isInviteMode = mode === "invite";
  const isSignupMode = mode === "signup";

  useEffect(() => {
    if (normalizedPrefilledEmail) {
      setEmail(normalizedPrefilledEmail);
    }
  }, [normalizedPrefilledEmail]);

  useEffect(() => {
    if (!enabled || testMode || typeof window === "undefined") {
      return;
    }

    const auth = getFirebaseAuthClient();

    if (!isSignInWithEmailLink(auth, window.location.href)) {
      return;
    }

    const pendingState = readPendingEmailLinkState();
    const resolvedEmail =
      pendingState?.email || normalizedPrefilledEmail || (email ? normalizeEmail(email) : "");

    if (!resolvedEmail) {
      setError("Open the sign-in link on the same device or request a new email link.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Completing email-link sign-in...");
    void signInWithEmailLink(auth, resolvedEmail, window.location.href)
      .then((credential) => credential.user.getIdToken())
      .then(async (idToken) => {
        await exchangeFirebaseSession(
          buildFirebaseSessionExchangeInput({
            mode,
            idToken,
            inviteToken,
            signupIntentId,
            pendingState,
          }),
        );
        clearPendingEmailLinkState();
        window.location.assign("/app");
      })
      .catch((nextError: unknown) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Email-link sign-in could not be completed.",
        );
        setStatus(null);
      })
      .finally(() => {
        setBusy(false);
      });
  }, [email, enabled, inviteToken, mode, normalizedPrefilledEmail, signupIntentId, testMode]);

  async function handleGoogleSignIn() {
    setBusy(true);
    setError(null);
    setStatus("Opening Google sign-in...");

    try {
      const auth = getFirebaseAuthClient();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      await exchangeFirebaseSession(
        buildFirebaseSessionExchangeInput({
          mode,
          idToken,
          inviteToken,
          signupIntentId,
        }),
      );
      clearPendingEmailLinkState();
      window.location.assign("/app");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Google sign-in failed.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailLinkRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = normalizeEmail(emailLocked ? normalizedPrefilledEmail : email);

    if (!nextEmail) {
      setError("Founder email is required.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Sending sign-in link...");

    try {
      const auth = getFirebaseAuthClient();
      await sendSignInLinkToEmail(auth, nextEmail, {
        url: `${window.location.origin}${redirectTo}`,
        handleCodeInApp: true,
      });
      writePendingEmailLinkState({
        email: nextEmail,
        mode,
        inviteToken,
        signupIntentId,
        redirectTo,
      });
      setStatus(
        isInviteMode
          ? "Sign-in link sent. Reopen it from the invited inbox to complete workspace access."
          : isSignupMode
            ? "Sign-in link sent. Reopen it from the same founder email to activate the workspace."
            : "Sign-in link sent. Open it from the inbox for this founder email.",
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Email-link sign-in failed.",
      );
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return null;
  }

  async function completeTestModeSignIn(providerId: string) {
    const nextEmail = normalizeEmail(emailLocked ? normalizedPrefilledEmail : email);

    if (!nextEmail) {
      setError("Founder email is required.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Completing sign-in...");

    try {
      await exchangeFirebaseSession({
        idToken: `test:${nextEmail}:${nextEmail.split("@")[0]}:${providerId}`,
        inviteToken,
        signupIntentId,
      });
      clearPendingEmailLinkState();
      window.location.assign("/app");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Sign-in failed.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/5 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
          {isInviteMode ? "Recommended Path" : "Firebase Sign-In"}
        </p>
        <h3 className="mt-3 text-xl font-semibold text-white">
          {isInviteMode
            ? "Continue with Firebase"
            : isSignupMode
              ? "Activate the workspace with Firebase"
              : "Sign in with Google or email link"}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {isInviteMode
            ? "Use the invited founder email on this page. Firebase sign-in validates this exact invite before opening the workspace."
            : isSignupMode
              ? "Use the same founder email from the signup step. Firebase sign-in creates or reopens the founder workspace immediately."
              : "Invite-based access and self-serve provisioning both use Firebase when it is available. Existing founders can sign in directly once their workspace email is provisioned."}
        </p>
      </div>

      {status ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        className="button-primary w-full"
        onClick={() => {
          startTransition(() => {
            void (testMode ? completeTestModeSignIn("google.com") : handleGoogleSignIn());
          });
        }}
        disabled={busy}
      >
        {busy ? "Working..." : testMode ? "Continue with Test Google" : "Continue with Google"}
      </button>

      <form onSubmit={(event) => void handleEmailLinkRequest(event)} className="space-y-4">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">
            {emailLocked ? "Invited founder email" : "Founder email"}
          </span>
          <input
            value={email}
            onChange={(event) => {
              if (!emailLocked) {
                setEmail(event.target.value);
              }
            }}
            type="email"
            required
            placeholder="founder@company.com"
            readOnly={emailLocked}
          />
        </label>
        {testMode ? (
          <button
            type="button"
            className="button-secondary w-full"
            disabled={busy}
            onClick={() => {
              startTransition(() => {
                void completeTestModeSignIn("emailLink");
              });
            }}
          >
            Continue with Test Email Link
          </button>
        ) : (
          <button type="submit" className="button-secondary w-full" disabled={busy}>
            Send email sign-in link
          </button>
        )}
      </form>
    </div>
  );
}
