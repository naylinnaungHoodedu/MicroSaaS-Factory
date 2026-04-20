import Link from "next/link";
import { redirect } from "next/navigation";

import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { Section } from "@/components/ui";
import { createSignupIntentAction } from "@/lib/server/actions";
import { getAuthModeInfo } from "@/lib/server/auth-mode";
import { getPublicPricingData, getSignupIntentById } from "@/lib/server/services";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string; intent?: string }>;
}) {
  const { flags, plans } = await getPublicPricingData();
  const resolved = await searchParams;
  const auth = getAuthModeInfo();

  if (!flags.publicSignupEnabled) {
    redirect("/waitlist");
  }

  const defaultPlanId = plans[0]?.id ?? "";
  const signupIntent = await getSignupIntentById(resolved.intent);
  const selfServeEnabled = flags.selfServeProvisioningEnabled;

  return (
    <main className="page-shell py-10">
      <Section
        eyebrow="Signup"
        title={selfServeEnabled ? "Create your founder workspace" : "Register a founder intent"}
        description={
          selfServeEnabled
            ? "Public signup now provisions a real founder workspace. Complete the plan and identity step here, then activate the workspace with Firebase."
            : "This milestone captures self-serve demand without skipping the invite gate. Submit the target workspace and plan, and the operator can convert it into an invite from the admin console."
        }
      >
        {resolved.submitted && selfServeEnabled && signupIntent ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Signup details saved for {signupIntent.workspaceName}. Continue with Firebase below to activate the founder workspace.
          </div>
        ) : null}
        {resolved.submitted && !selfServeEnabled ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Your signup intent has been recorded. Public checkout is still disabled, so the next step remains admin-issued invite access.
          </div>
        ) : null}
        {resolved.error === "submit_failed" ? (
          <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            Signup submission failed. Check the email, workspace name, and selected plan.
          </div>
        ) : null}
        {selfServeEnabled && !auth.firebaseEnabled ? (
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
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Workspace name</span>
              <input
                name="workspaceName"
                required
                placeholder="Factory Lab"
                defaultValue={signupIntent?.workspaceName ?? ""}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Plan</span>
              <select
                name="planId"
                defaultValue={signupIntent?.planId ?? defaultPlanId}
                required
              >
                {plans.map((plan) => (
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
                  ) : auth.firebaseEnabled ? (
                    <FirebaseLoginPanel
                      enabled={auth.firebaseEnabled}
                      testMode={Boolean(auth.firebaseTestMode)}
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
            <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6 text-sm leading-7 text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Current mode</p>
              <p>
                Public signup is enabled, but live checkout is still hidden. This form records the operator-ready input needed for later billing and provisioning work.
              </p>
              <p>
                Workspace creation still happens through the existing invite flow after admin review.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/pricing" className="button-secondary">
                  Back to pricing
                </Link>
                <Link href="/waitlist" className="button-secondary">
                  Request invite instead
                </Link>
              </div>
            </div>
          )}
        </div>
      </Section>
    </main>
  );
}
