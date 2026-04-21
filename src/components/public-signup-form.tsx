"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { PublicInfoCard } from "@/components/public-ui";
import type { SignupActionState } from "@/lib/server/public-actions";
import type { PlatformPlan, SignupIntent } from "@/lib/types";

type SignupIntentSummary = Pick<
  SignupIntent,
  "email" | "founderName" | "id" | "planId" | "status" | "workspaceName"
>;

function SignupSubmitButton({
  selfServeEnabled,
}: {
  selfServeEnabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="button-primary" disabled={pending}>
      {pending
        ? selfServeEnabled
          ? "Saving details..."
          : "Submitting signup intent..."
        : selfServeEnabled
          ? "Save details and continue"
          : "Submit signup intent"}
    </button>
  );
}

function SignupFormFields({
  defaultPlanId,
  plans,
  selfServeEnabled,
}: {
  defaultPlanId: string;
  plans: PlatformPlan[];
  selfServeEnabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <fieldset disabled={pending} className="space-y-5">
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Founder name</span>
        <input name="founderName" required placeholder="Founder name" autoComplete="name" />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Founder email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="founder@company.com"
          autoComplete="email"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Workspace name</span>
        <input
          name="workspaceName"
          required
          placeholder="Factory Lab"
          autoComplete="organization"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Plan</span>
        <select name="planId" defaultValue={defaultPlanId} required>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </label>
      <SignupSubmitButton selfServeEnabled={selfServeEnabled} />
    </fieldset>
  );
}

function SignupIntentSummaryCard({
  signupIntent,
  title,
}: {
  signupIntent: SignupIntentSummary;
  title: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Signup summary</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <dl className="mt-5 grid gap-4 text-sm text-slate-200 md:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Founder</dt>
          <dd className="mt-2">{signupIntent.founderName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</dt>
          <dd className="mt-2">{signupIntent.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace</dt>
          <dd className="mt-2">{signupIntent.workspaceName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan ID</dt>
          <dd className="mt-2">{signupIntent.planId}</dd>
        </div>
      </dl>
    </div>
  );
}

export function PublicSignupForm({
  action,
  defaultPlanId,
  firebaseEnabled,
  firebaseTestMode,
  initialSignupIntent,
  initialState,
  plans,
  selfServeEnabled,
}: {
  action: (
    state: SignupActionState,
    formData: FormData,
  ) => Promise<SignupActionState>;
  defaultPlanId: string;
  firebaseEnabled: boolean;
  firebaseTestMode: boolean;
  initialSignupIntent: SignupIntentSummary | null;
  initialState: SignupActionState;
  plans: PlatformPlan[];
  selfServeEnabled: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const activeSignupIntent =
    state.status === "success" ? state.signupIntent : initialSignupIntent;
  const workspaceExistsIntent =
    state.status === "workspace_exists" ? state.signupIntent : null;
  const showEditableForm = !activeSignupIntent && state.status !== "workspace_exists";

  return (
    <>
      {state.status === "success" ? (
        <div
          aria-live="polite"
          className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100"
        >
          {state.message}
        </div>
      ) : null}
      {state.status === "error" ? (
        <div
          aria-live="polite"
          className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {state.message}
        </div>
      ) : null}
      {state.status === "workspace_exists" ? (
        <div
          aria-live="polite"
          className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr]">
        <div className="space-y-5">
          {showEditableForm ? (
            <form action={formAction} className="space-y-5">
              <SignupFormFields
                defaultPlanId={defaultPlanId}
                plans={plans}
                selfServeEnabled={selfServeEnabled}
              />
            </form>
          ) : activeSignupIntent ? (
            <SignupIntentSummaryCard
              signupIntent={activeSignupIntent}
              title={
                selfServeEnabled
                  ? "Workspace details are staged for activation."
                  : "Founder intent is now queued for operator review."
              }
            />
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">
                Existing workspace
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                Reopen the founder workspace from login.
              </p>
              <p className="mt-3 leading-7 text-slate-300">
                A founder account already exists for this email, so this public signup form
                will not create another workspace.
              </p>
            </div>
          )}

          {state.status === "workspace_exists" && workspaceExistsIntent ? (
            <SignupIntentSummaryCard
              signupIntent={workspaceExistsIntent}
              title="The existing founder record is already in the system."
            />
          ) : null}
        </div>

        {selfServeEnabled ? (
          <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6 text-sm leading-7 text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Activation</p>
            {state.status === "workspace_exists" ? (
              <>
                <p>
                  {state.workspaceName
                    ? `${state.workspaceName} already has a founder access path.`
                    : "This founder email already maps to an existing workspace."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href={state.loginHref} className="button-primary">
                    Open founder login
                  </Link>
                  <Link href="/pricing" className="button-secondary">
                    Back to pricing
                  </Link>
                </div>
              </>
            ) : activeSignupIntent ? (
              <>
                <p>
                  Workspace setup is staged for <strong>{activeSignupIntent.workspaceName}</strong>.
                  Use the same founder email, <strong>{activeSignupIntent.email}</strong>, in the
                  Firebase step below.
                </p>
                {activeSignupIntent.status === "invited" ? (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                    This signup has been converted into an invite-based activation. Use the invite
                    link from the operator or sign in from the founder login page.
                  </div>
                ) : firebaseEnabled ? (
                  <FirebaseLoginPanel
                    enabled={firebaseEnabled}
                    testMode={firebaseTestMode}
                    signupIntentId={activeSignupIntent.id}
                    prefilledEmail={activeSignupIntent.email}
                    emailLocked
                    redirectTo={`/signup?intent=${activeSignupIntent.id}`}
                    mode="signup"
                  />
                ) : (
                  <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Firebase still needs to be configured before public self-serve activation can
                    complete.
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Link href="/pricing" className="button-secondary">
                    Back to pricing
                  </Link>
                  <Link href="/login" className="button-secondary">
                    Existing founder login
                  </Link>
                </div>
              </>
            ) : (
              <p>
                Complete the form first, then use Firebase to activate the workspace
                immediately.
              </p>
            )}
          </div>
        ) : (
          <PublicInfoCard
            eyebrow="Current Mode"
            title={
              state.status === "workspace_exists"
                ? "This founder should reopen the existing workspace."
                : "Signup is public, but provisioning is still deliberate."
            }
            detail={
              state.status === "workspace_exists"
                ? "The founder email already maps to an existing workspace, so login is the correct return path."
                : "This form records the founder, workspace, and plan choice while keeping real workspace activation behind operator review."
            }
          >
            <div className="flex flex-wrap gap-3">
              <Link href="/pricing" className="button-secondary">
                Back to pricing
              </Link>
              <Link
                href={state.status === "workspace_exists" ? state.loginHref : "/waitlist"}
                className="button-secondary"
              >
                {state.status === "workspace_exists" ? "Founder login" : "Request invite instead"}
              </Link>
            </div>
          </PublicInfoCard>
        )}
      </div>
    </>
  );
}
