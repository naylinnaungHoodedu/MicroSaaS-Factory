import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildPublicPageMetadata } from "@/app/public-metadata";
import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { PublicHeroPanel, PublicInfoCard, PublicJourneyRail } from "@/components/public-ui";
import { Section } from "@/components/ui";
import { createSignupIntentAction } from "@/lib/server/actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Signup",
  description:
    "Create a founder workspace or record signup intent based on the current MicroSaaS Factory activation posture.",
  path: "/signup",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string; intent?: string }>;
}) {
  const resolved = await searchParams;
  const funnel = await getPublicFunnelState({ signupIntentId: resolved.intent });

  if (!funnel.signupAvailable || funnel.plans.length === 0) {
    redirect("/waitlist");
  }

  const defaultPlanId = funnel.plans[0]?.id ?? "";
  const signupIntent = funnel.signupIntent;
  const selfServeEnabled = funnel.availabilityMode === "self_serve";

  return (
    <main className="page-shell py-10">
      <PublicHeroPanel
        state={funnel}
        auxiliary={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Activation posture
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {selfServeEnabled
                  ? funnel.activationReady
                    ? "Identity verification can activate the workspace immediately."
                    : "Signup is visible, but activation still depends on Firebase readiness."
                  : "Signup records the founder and workspace before operator provisioning."}
              </p>
            </div>
            <p className="leading-7 text-slate-300">{funnel.activationDetail}</p>
          </div>
        }
      >
        <PublicJourneyRail state={funnel} />
      </PublicHeroPanel>

      <Section
        eyebrow="Signup"
        title={selfServeEnabled ? "Create your founder workspace" : "Register a founder intent"}
        description={
          selfServeEnabled
            ? "Public signup now provisions a real founder workspace. Complete the plan and identity step here, then activate the workspace with Firebase."
            : "This path captures public demand without skipping operator control. Submit the target workspace and plan, and the operator can convert it into an invite or later open self-serve activation."
        }
      >
        {resolved.submitted && selfServeEnabled && signupIntent ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Signup details saved for {signupIntent.workspaceName}. Continue with Firebase below to activate the founder workspace.
          </div>
        ) : null}
        {resolved.submitted && !selfServeEnabled ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Your signup intent has been recorded. Workspace activation still stays behind operator review until self-serve provisioning is enabled.
          </div>
        ) : null}
        {resolved.error === "submit_failed" ? (
          <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            Signup submission failed. Check the email, workspace name, and selected plan.
          </div>
        ) : null}
        {selfServeEnabled && !funnel.auth.firebaseEnabled ? (
          <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            Self-serve workspace activation is enabled, but Firebase sign-in is not configured for this environment yet. Operators need to finish Firebase setup before public provisioning is usable.
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr]">
          <form action={createSignupIntentAction} className="space-y-5">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Founder name</span>
              <input
                name="founderName"
                required
                placeholder="Founder name"
                defaultValue={signupIntent?.founderName ?? ""}
                autoComplete="name"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Founder email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="founder@company.com"
                defaultValue={signupIntent?.email ?? ""}
                autoComplete="email"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Workspace name</span>
              <input
                name="workspaceName"
                required
                placeholder="Factory Lab"
                defaultValue={signupIntent?.workspaceName ?? ""}
                autoComplete="organization"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Plan</span>
              <select
                name="planId"
                defaultValue={signupIntent?.planId ?? defaultPlanId}
                required
              >
                {funnel.plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="button-primary">
              {selfServeEnabled ? "Save details and continue" : "Submit signup intent"}
            </button>
          </form>

          {selfServeEnabled ? (
            <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6 text-sm leading-7 text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                Activation
              </p>
              {signupIntent ? (
                <>
                  <p>
                    Workspace setup is staged for <strong>{signupIntent.workspaceName}</strong>.
                    Use the same founder email, <strong>{signupIntent.email}</strong>, in the Firebase step below.
                  </p>
                  {signupIntent.status === "invited" ? (
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                      This signup has been converted into an invite-based activation. Use the invite
                      link from the operator or sign in from the founder login page.
                    </div>
                  ) : funnel.auth.firebaseEnabled ? (
                    <FirebaseLoginPanel
                      enabled={funnel.auth.firebaseEnabled}
                      testMode={Boolean(funnel.auth.firebaseTestMode)}
                      signupIntentId={signupIntent.id}
                      prefilledEmail={signupIntent.email}
                      emailLocked
                      redirectTo={`/signup?intent=${signupIntent.id}`}
                      mode="signup"
                    />
                  ) : null}
                </>
              ) : (
                <p>
                  Complete the form first, then use Firebase to activate the workspace
                  immediately.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/pricing" className="button-secondary">
                  Back to pricing
                </Link>
                <Link href="/login" className="button-secondary">
                  Existing founder login
                </Link>
              </div>
            </div>
          ) : (
            <PublicInfoCard
              eyebrow="Current Mode"
              title="Signup is public, but provisioning is still deliberate."
              detail="This form records the founder, workspace, and plan choice while keeping real workspace activation behind operator review."
            >
              <div className="flex flex-wrap gap-3">
                <Link href="/pricing" className="button-secondary">
                  Back to pricing
                </Link>
                <Link href="/waitlist" className="button-secondary">
                  Request invite instead
                </Link>
              </div>
            </PublicInfoCard>
          )}
        </div>
      </Section>
    </main>
  );
}
