"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import type { WaitlistActionState } from "@/lib/server/public-actions";

function WaitlistSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="button-primary" disabled={pending}>
      {pending ? "Joining the waitlist..." : "Join the waitlist"}
    </button>
  );
}

function WaitlistFormFields() {
  const { pending } = useFormStatus();

  return (
    <fieldset disabled={pending} className="space-y-5">
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Name</span>
        <input name="name" required placeholder="Founder name" autoComplete="name" />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="founder@company.com"
          autoComplete="email"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Current bottleneck</span>
        <textarea
          name="challenge"
          required
          rows={5}
          placeholder="Where does your current research -> validation -> launch workflow break down?"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Current stack</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="GitHub repos, Cloud Run, Firestore, Stripe, Resend, Firebase, or anything else already in flight."
        />
      </label>
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
      <div className="rounded-[1.5rem] border border-emerald-400/25 bg-emerald-500/10 p-6 text-sm text-emerald-100">
        <p className="font-semibold uppercase tracking-[0.2em]">Request recorded</p>
        <p className="mt-3 leading-7">{state.message}</p>
        <dl className="mt-5 grid gap-4 text-sm text-emerald-50 md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Founder</dt>
            <dd className="mt-2">{state.request.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Email</dt>
            <dd className="mt-2">{state.request.email}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">
              Bottleneck
            </dt>
            <dd className="mt-2 whitespace-pre-wrap">{state.request.challenge}</dd>
          </div>
          {state.request.notes ? (
            <div className="md:col-span-2">
              <dt className="text-xs uppercase tracking-[0.18em] text-emerald-200/80">Stack</dt>
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
          className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {state.message}
        </div>
      ) : null}
      <form ref={formRef} action={formAction} className="space-y-5">
        <WaitlistFormFields />
      </form>
    </>
  );
}
