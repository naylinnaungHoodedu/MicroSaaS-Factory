import Link from "next/link";
import type { Metadata } from "next";

import { buildPublicPageMetadata } from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { PublicHeroPanel, PublicInfoCard, PublicJourneyRail } from "@/components/public-ui";
import { Section } from "@/components/ui";
import { loginAction } from "@/lib/server/actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Founder Login",
  description:
    "Sign in to a MicroSaaS Factory founder workspace with invite access or Firebase when enabled.",
  path: "/login",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolved = await searchParams;
  const funnel = await getPublicFunnelState();
  const selfServeEnabled = funnel.availabilityMode === "self_serve";
  const signupIntentEnabled = funnel.availabilityMode === "signup_intent";

  return (
    <PublicSiteShell mainClassName="page-shell py-10">
      <PublicHeroPanel
        state={funnel}
        auxiliary={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Login posture
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {funnel.auth.firebaseEnabled
                  ? "Invite tokens and Firebase both remain available."
                  : signupIntentEnabled
                    ? "Public signup is open for operator review, but founder access still starts with an invite."
                    : "Invite tokens remain the active login contract."}
              </p>
            </div>
            <p className="leading-7 text-slate-300">
              {selfServeEnabled
                ? "Self-serve founders can return here after workspace provisioning, while existing invite links still remain valid."
                : signupIntentEnabled
                  ? "New founders can submit pricing-backed signup intent publicly, but workspace access remains operator-issued until a real invite or self-serve activation exists."
                : "The login page stays aligned with the invite-beta workflow until public self-serve activation is truly ready."}
            </p>
          </div>
        }
      >
        <PublicJourneyRail state={funnel} />
      </PublicHeroPanel>

      <Section
        eyebrow="Founder Access"
        title={selfServeEnabled ? "Sign in or reopen your founder workspace." : "Sign in with your beta invite."}
        description={
          selfServeEnabled
            ? "Invite access still works, and self-serve founders can also sign in here once their workspace has been provisioned."
            : signupIntentEnabled
              ? "Public signup intent is visible, but founder workspace access is still issued deliberately through invites or existing provisioned identities."
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
            funnel.auth.firebaseEnabled
              ? "grid gap-8 lg:grid-cols-[0.75fr_1fr_1fr]"
              : "grid gap-8 lg:grid-cols-[0.8fr_1fr]"
          }
        >
          <PublicInfoCard
            eyebrow="Authentication Mode"
            title={
              selfServeEnabled
                ? "Invite access and self-serve founder return paths now share one login surface."
                : signupIntentEnabled
                  ? "Signup is public, but founder login remains invite-led until activation is approved."
                : "Invite-based access remains the current founder contract."
            }
            detail={
              selfServeEnabled
                ? "Firebase is the primary path for self-serve provisioning and repeat founder access, while manual invite-token entry still remains available."
                : signupIntentEnabled
                  ? "Operator-reviewed signup can capture demand publicly, but workspace creation still completes through invite issuance or an existing provisioned identity."
                : "Workspace creation still requires an issued invite, even when Firebase sign-in is active in this environment."
            }
          >
            <p className="text-sm leading-7 text-slate-300">
              {funnel.auth.firebaseEnabled
                ? selfServeEnabled
                  ? "Firebase Google and email-link sign-in are available for both self-serve and invite-based founders."
                  : "Firebase Google and email-link sign-in are available for already-provisioned founders."
                : "Firebase sign-in is not configured in this environment, so invite-token access remains the only founder login path."}
            </p>
            {funnel.auth.firebaseError ? (
              <p className="mt-3 text-sm leading-7 text-amber-100">
                Firebase is partially configured but not ready: {funnel.auth.firebaseError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={funnel.primaryAction.href} className="button-primary">
                {funnel.primaryAction.label}
              </Link>
              <Link href="/" className="button-secondary">
                Back home
              </Link>
            </div>
          </PublicInfoCard>

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
              <input
                name="email"
                type="email"
                required
                placeholder="founder@company.com"
                autoComplete="email"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Invite token</span>
              <input
                name="token"
                required
                placeholder="Paste your invite token"
                autoComplete="off"
              />
            </label>
            <button type="submit" className="button-primary">
              Enter workspace
            </button>
          </form>

          {funnel.auth.firebaseEnabled ? (
            <FirebaseLoginPanel
              enabled={funnel.auth.firebaseEnabled}
              testMode={Boolean(funnel.auth.firebaseTestMode)}
              redirectTo="/login"
              mode="login"
            />
          ) : null}
        </div>
      </Section>
    </PublicSiteShell>
  );
}
