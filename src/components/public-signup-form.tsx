"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { PublicInfoCard } from "@/components/public-ui";
import type { PublicFunnelDetailCard } from "@/lib/server/funnel";
import type { SignupActionState } from "@/lib/server/public-actions";
import type { PlatformPlan, SignupIntent } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type SignupIntentSummary = Pick<
  SignupIntent,
  "email" | "founderName" | "id" | "planId" | "status" | "workspaceName"
>;

function PlanContextCard({
  plan,
}: {
  plan?: PlatformPlan;
}) {
  if (!plan) {
    return null;
  }

  return (
    <div className="glass-panel rounded-[1.7rem] p-6 shadow-lg shadow-black/10">
      <p className="eyebrow text-cyan-200">Plan context</p>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-white">{plan.name}</h3>
          <p className="mt-3 text-sm leading-7 text-cyan-50">
            {formatCurrency(plan.monthlyPrice)} monthly / {formatCurrency(plan.annualPrice)} annual
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-cyan-300/20 bg-slate-950/35 px-4 py-3 text-sm text-cyan-50">
          The commercial lane is staged here first so activation and billing never detach from the workspace.
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {plan.features.slice(0, 4).map((feature) => (
          <p
            key={feature}
            className="rounded-[1.15rem] border border-cyan-300/20 bg-slate-950/35 px-4 py-3 text-sm text-slate-100"
          >
            {feature}
          </p>
        ))}
      </div>
    </div>
  );
}

function SignupActionChecklist({
  title,
  items,
}: {
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-white/5 p-5">
      <p className="eyebrow text-slate-400">{title}</p>
      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div
            key={item}
            className="rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-200"
          >
            <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-[11px] font-semibold text-cyan-100">
              {index + 1}
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignupSubmitButton({
  selfServeEnabled,
}: {
  selfServeEnabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="button-primary w-full sm:w-auto" disabled={pending}>
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

function SignupField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      {children}
      <span className="field-hint">{hint}</span>
    </label>
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
    <fieldset disabled={pending} className="space-y-6">
      <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
        {selfServeEnabled
          ? "These details stage the real founder workspace first. Activation continues from the same route once the environment is ready."
          : "These details create the reusable onboarding record the reviewed access flow can invite or reopen later."}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SignupField
          label="Founder name"
          hint="Use the founder name you want reflected inside the workspace and future recovery emails."
        >
          <input name="founderName" required placeholder="Founder name" autoComplete="name" />
        </SignupField>

        <SignupField
          label="Founder email"
          hint="This email becomes the recovery anchor for signup, activation, and founder login."
        >
          <input
            name="email"
            type="email"
            required
            placeholder="founder@company.com"
            autoComplete="email"
          />
        </SignupField>

        <SignupField
          label="Workspace name"
          hint="Choose the workspace name you expect to keep. Duplicate accounts recover the existing workspace instead of creating another one."
        >
          <input
            name="workspaceName"
            required
            placeholder="Factory Lab"
            autoComplete="organization"
          />
        </SignupField>

        <SignupField
          label="Plan"
          hint="Plan choice keeps the commercial path attached to the workspace even while activation or checkout are still staged."
        >
          <select name="planId" defaultValue={defaultPlanId} required>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {`${plan.name} / ${formatCurrency(plan.monthlyPrice)} per month`}
              </option>
            ))}
          </select>
        </SignupField>
      </div>

      <div className="flex flex-wrap gap-3">
        <SignupSubmitButton selfServeEnabled={selfServeEnabled} />
        <Link href="/pricing" className="button-secondary">
          Back to pricing
        </Link>
      </div>
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
    <div className="glass-panel rounded-[1.7rem] p-6 shadow-lg shadow-black/10">
      <p className="eyebrow text-cyan-300/80">Signup summary</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h3>
      <dl className="mt-5 grid gap-4 text-sm text-slate-200 md:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Founder</dt>
          <dd className="mt-2">{signupIntent.founderName}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Email</dt>
          <dd className="mt-2">{signupIntent.email}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Workspace</dt>
          <dd className="mt-2">{signupIntent.workspaceName}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Plan ID</dt>
          <dd className="mt-2">{signupIntent.planId}</dd>
        </div>
      </dl>
    </div>
  );
}

function StatusBanner({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
        : "border-rose-400/25 bg-rose-500/10 text-rose-100";

  return (
    <div aria-live="polite" className={`rounded-[1.35rem] border p-4 text-sm ${toneClasses}`}>
      {children}
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
  modeCard,
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
  modeCard: PublicFunnelDetailCard;
  plans: PlatformPlan[];
  selfServeEnabled: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const activeSignupIntent =
    state.status === "success" ? state.signupIntent : initialSignupIntent;
  const workspaceExistsIntent =
    state.status === "workspace_exists" ? state.signupIntent : null;
  const showEditableForm = !activeSignupIntent && state.status !== "workspace_exists";
  const selectedPlan = plans.find((plan) => plan.id === defaultPlanId) ?? plans[0];

  return (
    <>
      {state.status === "success" ? <StatusBanner tone="success">{state.message}</StatusBanner> : null}
      {state.status === "error" ? <StatusBanner tone="error">{state.message}</StatusBanner> : null}
      {state.status === "workspace_exists" ? (
        <StatusBanner tone="warning">{state.message}</StatusBanner>
      ) : null}

      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_0.84fr]">
        <div className="space-y-5">
          <PlanContextCard plan={selectedPlan} />

          {showEditableForm ? (
            <div className="glass-panel rounded-[1.8rem] p-6 shadow-lg shadow-black/10">
              <div className="mb-6">
                <p className="eyebrow text-cyan-300/80">Founder details</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {selfServeEnabled
                    ? "Stage the workspace before activation."
                    : "Record the founder intent clearly."}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {selfServeEnabled
                    ? "The goal is a clean handoff into activation and billing readiness, not a vague lead form."
                    : "The goal is a reviewable onboarding record that can convert into invite or later self-serve without losing context."}
                </p>
              </div>
              <form action={formAction} className="space-y-5">
                <SignupFormFields
                  defaultPlanId={defaultPlanId}
                  plans={plans}
                  selfServeEnabled={selfServeEnabled}
                />
              </form>
            </div>
          ) : activeSignupIntent ? (
            <SignupIntentSummaryCard
              signupIntent={activeSignupIntent}
              title={
                selfServeEnabled
                  ? "Workspace details are staged for activation."
                  : "Founder intent is now queued for reviewed intake."
              }
            />
          ) : (
            <div className="glass-panel rounded-[1.7rem] p-6 text-sm shadow-lg shadow-black/10">
              <p className="eyebrow text-amber-300/80">Existing workspace</p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-white">
                Reopen the founder workspace from login.
              </p>
              <p className="mt-3 leading-7 text-slate-300">
                A founder account already exists for this email, so this public signup form
                will not create another workspace.
              </p>
              <p className="mt-3 leading-7 text-slate-400">
                This preserves billing, recovery, and workspace ownership instead of silently provisioning a duplicate record.
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
          <div className="glass-panel space-y-5 rounded-[1.8rem] p-6 text-sm leading-7 text-slate-300 shadow-lg shadow-black/10">
            <div>
              <p className="eyebrow text-cyan-300/80">Activation lane</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Keep the next step explicit.
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Once founder details are staged, activation should continue from the same route with the same workspace and the same commercial context.
              </p>
            </div>

            <SignupActionChecklist
              title="What happens next"
              items={[
                "Stage the workspace with the founder email, workspace name, and Growth plan.",
                "Verify the same founder identity with Firebase when self-serve is ready.",
                "Enter the workspace and move into billing when checkout becomes eligible.",
              ]}
            />

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
                  activation step below.
                </p>
                <p className="text-slate-400">
                  The commercial path does not change here. The founder keeps the same workspace, plan context, and recovery email while activation completes.
                </p>
                {activeSignupIntent.status === "invited" ? (
                  <div className="rounded-[1.3rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                    This signup has been converted into an invite-based activation. Use the invite
                    link from the reviewed access flow or sign in from the founder login page.
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
                  <div className="rounded-[1.3rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
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
              <p>Complete the form first, then use Firebase to activate the workspace immediately.</p>
            )}
          </div>
        ) : (
          <PublicInfoCard
            eyebrow={modeCard.eyebrow}
            title={
              state.status === "workspace_exists"
                ? "This founder should reopen the existing workspace."
                : modeCard.title
            }
            detail={
              state.status === "workspace_exists"
                ? "The founder email already maps to an existing workspace, so login is the correct return path."
                : modeCard.detail
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
