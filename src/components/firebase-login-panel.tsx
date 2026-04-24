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

function StatusMessage({
  tone,
  message,
}: {
  tone: "error" | "info";
  message: string;
}) {
  const toneClasses =
    tone === "error"
      ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
      : "border-cyan-300/20 bg-cyan-500/10 text-cyan-100";

  return <div className={`rounded-[1.25rem] border p-4 text-sm ${toneClasses}`}>{message}</div>;
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
    <div className="glass-panel space-y-5 rounded-[1.8rem] p-6 shadow-lg shadow-black/10">
      <div>
        <p className="eyebrow text-cyan-300/80">
          {isInviteMode ? "Recommended path" : "Firebase sign-in"}
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          {isInviteMode
            ? "Continue with Firebase"
            : isSignupMode
              ? "Activate the workspace with Firebase"
              : "Return with Google or email link"}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          {isInviteMode
            ? "Use the invited founder email on this page. Firebase sign-in validates this exact invite before opening the workspace."
            : isSignupMode
              ? "Use the same founder email from the signup step. Firebase sign-in creates or reopens the founder workspace immediately."
              : "Firebase is the fastest return path for provisioned founders. Invite-token recovery still remains available when a deliberate fallback is needed."}
        </p>
      </div>

      {status ? <StatusMessage tone="info" message={status} /> : null}
      {error ? <StatusMessage tone="error" message={error} /> : null}

      <div className="grid gap-3">
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

        <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Google is the fastest return path. Email link stays available for founders who need a quieter recovery flow tied to the same workspace email.
        </div>
      </div>

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
          <span className="field-hint">
            {emailLocked
              ? "This email is locked so activation stays tied to the staged founder identity."
              : "Use the same founder email already associated with the workspace you want to open."}
          </span>
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
