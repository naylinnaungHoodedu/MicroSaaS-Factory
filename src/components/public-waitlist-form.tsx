"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import type { WaitlistActionState } from "@/lib/server/public-actions";

function WaitlistSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="button-primary w-full sm:w-auto" disabled={pending}>
      {pending ? "Joining the waitlist..." : "Join the waitlist"}
    </button>
  );
}

function WaitlistField({
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

function WaitlistFormFields() {
  const { pending } = useFormStatus();

  return (
    <fieldset disabled={pending} className="space-y-5">
      <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
        Use this lane when reviewed intake should happen before direct signup or when the founder needs a more guided activation path.
      </div>

      <WaitlistField
        label="Name"
        hint="Use the name that should appear on the eventual founder record or invite."
      >
        <input name="name" required placeholder="Founder name" autoComplete="name" />
      </WaitlistField>

      <WaitlistField
        label="Email"
        hint="This email should match the founder identity you would eventually use for signup or invite recovery."
      >
        <input
          name="email"
          type="email"
          required
          placeholder="founder@company.com"
          autoComplete="email"
        />
      </WaitlistField>

      <WaitlistField
        label="Current bottleneck"
        hint="The strongest submissions explain where founder attention is currently being wasted."
      >
        <textarea
          name="challenge"
          required
          rows={5}
          placeholder="Where does your current research to validation to launch workflow break down?"
        />
      </WaitlistField>

      <WaitlistField
        label="Current stack"
        hint="Include anything already running so reviewed intake can tell whether guided signup or invite is the better next step."
      >
        <textarea
          name="notes"
          rows={4}
          placeholder="GitHub repos, Cloud Run, Firestore, Stripe, Resend, Firebase, or anything else already in flight."
        />
      </WaitlistField>

      <WaitlistSubmitButton />
    </fieldset>
  );
}

export function PublicWaitlistForm({
  action,
  initialState,
}: {
  action: (
    state: WaitlistActionState,
    formData: FormData,
  ) => Promise<WaitlistActionState>;
  initialState: WaitlistActionState;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div className="rounded-[1.7rem] border border-emerald-400/25 bg-emerald-500/10 p-6 text-sm text-emerald-100">
        <p className="eyebrow text-emerald-200/90">Request recorded</p>
        <p className="mt-3 leading-7">{state.message}</p>
        <dl className="mt-5 grid gap-4 text-sm text-emerald-50 md:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Founder</dt>
            <dd className="mt-2">{state.request.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Email</dt>
            <dd className="mt-2">{state.request.email}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
              Bottleneck
            </dt>
            <dd className="mt-2 whitespace-pre-wrap">{state.request.challenge}</dd>
          </div>
          {state.request.notes ? (
            <div className="md:col-span-2">
              <dt className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Stack</dt>
              <dd className="mt-2 whitespace-pre-wrap">{state.request.notes}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  }

  return (
    <>
      {state.status === "error" ? (
        <div
          aria-live="polite"
          className="mb-6 rounded-[1.35rem] border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {state.message}
        </div>
      ) : null}
      <div className="glass-panel rounded-[1.8rem] p-6 shadow-lg shadow-black/10">
        <div className="mb-6">
          <p className="eyebrow text-cyan-300/80">Reviewed intake</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Give the review path enough context to choose the right next step.
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            A strong waitlist request explains the real bottleneck, the stack already in
            motion, and why deliberate review should happen before direct activation.
          </p>
        </div>
        <form ref={formRef} action={formAction} className="space-y-5">
          <WaitlistFormFields />
        </form>
      </div>
    </>
  );
}
