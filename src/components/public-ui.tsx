import Link from "next/link";
import type { ReactNode } from "react";

import type { PublicFunnelAction, PublicFunnelState } from "@/lib/server/funnel";
import { cn } from "@/lib/utils";

function toneClasses(tone: PublicFunnelState["summary"]["tone"]) {
  if (tone === "emerald") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "cyan") {
    return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100";
  }

  return "border-amber-400/30 bg-amber-500/10 text-amber-100";
}

function actionClasses(action: PublicFunnelAction, variant: "primary" | "secondary") {
  if (variant === "primary") {
    return "button-primary";
  }

  return action.kind === "pricing" ? "button-secondary" : "button-secondary";
}

export function PublicHeroPanel({
  state,
  auxiliary,
  children,
}: {
  state: Pick<
    PublicFunnelState,
    "pricingAction" | "primaryAction" | "secondaryAction" | "summary"
  >;
  auxiliary?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(140deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-6 py-8 shadow-2xl shadow-black/20 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-4xl">
          <div
            className={cn(
              "inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]",
              toneClasses(state.summary.tone),
            )}
          >
            {state.summary.eyebrow}
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
            {state.summary.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            {state.summary.detail}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={state.primaryAction.href} className={actionClasses(state.primaryAction, "primary")}>
              {state.primaryAction.label}
            </Link>
            <Link href={state.secondaryAction.href} className={actionClasses(state.secondaryAction, "secondary")}>
              {state.secondaryAction.label}
            </Link>
            {state.pricingAction &&
            state.pricingAction.href !== state.secondaryAction.href ? (
              <Link href={state.pricingAction.href} className="button-secondary">
                {state.pricingAction.label}
              </Link>
            ) : null}
          </div>
        </div>
        {auxiliary ? (
          <div className="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
            {auxiliary}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}

export function PublicJourneyRail({
  state,
}: {
  state: Pick<PublicFunnelState, "activationReady" | "availabilityMode" | "journeyMode">;
}) {
  const currentStep =
    state.journeyMode === "returning_founder"
      ? 4
      : state.availabilityMode === "waitlist"
        ? 1
        : state.availabilityMode === "signup_intent"
          ? 2
          : state.activationReady
            ? 3
            : 2;
  const steps = [
    {
      id: "discover",
      label: "Discover",
      detail: "Understand the founder operating system and public access mode.",
    },
    {
      id: "plan",
      label: "Choose",
      detail: "Pick the lane and record the workspace intent when public signup is open.",
    },
    {
      id: "activate",
      label: "Activate",
      detail: "Verify identity with Firebase when self-serve activation is truly ready.",
    },
    {
      id: "operate",
      label: "Operate",
      detail: "Enter the founder workspace, then upgrade through pricing when eligible.",
    },
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const active = currentStep >= index + 1;

        return (
          <div
            key={step.id}
            className={cn(
              "rounded-[1.4rem] border px-4 py-4 text-sm",
              active
                ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-slate-950/40 text-slate-400",
            )}
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Step {index + 1}
            </p>
            <p className="mt-2 font-semibold">{step.label}</p>
            <p className="mt-2 leading-6">{step.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

export function PublicInfoCard({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{detail}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
