import Link from "next/link";

import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { Section } from "@/components/ui";
import { getAuthModeInfo } from "@/lib/server/auth-mode";
import { loginAction } from "@/lib/server/actions";
import { getPublicPricingData } from "@/lib/server/services";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolved = await searchParams;
  const auth = getAuthModeInfo();
  const { flags } = await getPublicPricingData();
  const selfServeEnabled = flags.publicSignupEnabled && flags.selfServeProvisioningEnabled;

  return (
    <main className="page-shell py-10">
      <Section
        eyebrow="Founder Access"
        title={selfServeEnabled ? "Sign in or reopen your founder workspace." : "Sign in with your beta invite."}
        description={
          selfServeEnabled
            ? "Invite access still works, and self-serve founders can also sign in here once their workspace has been provisioned."
            : "Invite-only access remains the gate. If your invite email includes a direct invite link, that is the recommended entrypoint. This page keeps Firebase and invite-token login equally available."
        }
      >
        {resolved.error === "invalid_invite" ? (
          <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            The invite email or token is invalid for this workspace.
          </div>
        ) : null}
        <div
          className={
            auth.firebaseEnabled
              ? "grid gap-8 lg:grid-cols-[0.75fr_1fr_1fr]"
              : "grid gap-8 lg:grid-cols-[0.8fr_1fr]"
          }
        >
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6 text-sm leading-7 text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Authentication Mode</p>
            <p className="mt-3">
              {selfServeEnabled
                ? "Invite and self-serve founder access are both available. Firebase is the primary path for self-serve provisioning and returning founder login."
                : "Invite-only founder access is enabled. Workspace creation still requires an issued invite, even when Firebase sign-in is active."}
            </p>
            <p className="mt-3">
              {auth.firebaseEnabled
                ? selfServeEnabled
                  ? "Firebase Google and email-link sign-in are available for both self-serve and invite-based founders. Direct invite links remain the recommended path when an invite already exists."
                  : "Firebase Google and email-link sign-in are available for founders whose invite email has already been issued. Direct invite links remain the recommended path."
                : "Firebase sign-in is not configured in this environment, so invite-token access remains the only founder login path."}
            </p>
            {auth.firebaseError ? (
              <p className="mt-3 text-amber-100">
                Firebase is partially configured but not ready: {auth.firebaseError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={selfServeEnabled ? "/signup" : "/waitlist"} className="button-primary">
                {selfServeEnabled ? "Create workspace" : "Request invite"}
              </Link>
              <Link href="/" className="button-secondary">
                Back home
              </Link>
            </div>
          </div>

          <form action={loginAction} className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Invite Token</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Use your invite token</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                This manual path stays available even when Firebase is enabled.
              </p>
            </div>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Invite email</span>
              <input name="email" type="email" required placeholder="founder@company.com" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Invite token</span>
              <input name="token" required placeholder="Paste your invite token" />
            </label>
            <button type="submit" className="button-primary">
              Enter workspace
            </button>
          </form>

          {auth.firebaseEnabled ? (
            <FirebaseLoginPanel
              enabled={auth.firebaseEnabled}
              testMode={Boolean(auth.firebaseTestMode)}
              redirectTo="/login"
              mode="login"
            />
          ) : null}
        </div>
      </Section>
    </main>
  );
}
