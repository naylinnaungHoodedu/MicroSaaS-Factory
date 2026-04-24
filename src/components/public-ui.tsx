import Link from "next/link";
import type { ReactNode } from "react";

import type {
  PublicComparisonRow,
  PublicCtaBlock,
  PublicFaqItem,
  PublicMarketingCard,
} from "@/lib/public-content";
import type {
  PublicFunnelAction,
  PublicFunnelState,
  PublicLaunchBlocker,
  PublicTrustCard,
} from "@/lib/server/funnel";
import { cn } from "@/lib/utils";

export type PublicSignalItem = {
  detail: string;
  label: string;
  tone?: "amber" | "cyan" | "emerald";
  value: string;
};

function toneClasses(tone: PublicFunnelState["summary"]["tone"]) {
  if (tone === "emerald") {
    return "border-emerald-400/35 bg-emerald-500/12 text-emerald-100";
  }

  if (tone === "cyan") {
    return "border-cyan-300/35 bg-cyan-400/12 text-cyan-100";
  }

  return "border-amber-400/35 bg-amber-500/12 text-amber-100";
}

function actionClasses(_action: PublicFunnelAction, variant: "primary" | "secondary") {
  return variant === "primary" ? "button-primary" : "button-secondary";
}

function signalToneClasses(tone: PublicSignalItem["tone"] = "cyan") {
  if (tone === "emerald") {
    return "border-emerald-400/28 bg-emerald-500/10";
  }

  if (tone === "amber") {
    return "border-amber-400/28 bg-amber-500/10";
  }

  return "border-cyan-300/28 bg-cyan-400/10";
}

function blockerToneClasses(status: PublicLaunchBlocker["status"]) {
  if (status === "ready") {
    return "border-emerald-400/32 bg-emerald-500/12 text-emerald-100";
  }

  if (status === "manual") {
    return "border-cyan-300/32 bg-cyan-400/12 text-cyan-100";
  }

  return "border-amber-400/32 bg-amber-500/12 text-amber-100";
}

function blockerStatusLabel(status: PublicLaunchBlocker["status"]) {
  if (status === "ready") {
    return "live";
  }

  if (status === "manual") {
    return "review";
  }

  return "staged";
}

export function PublicSignalStrip({
  items,
}: {
  items: PublicSignalItem[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className={cn(
            "surface-data rounded-[1.5rem] border p-5 shadow-lg shadow-black/10",
            signalToneClasses(item.tone),
          )}
        >
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300/75">
            {item.label}
          </p>
          <p className="mt-4 text-xl font-semibold tracking-tight text-white">{item.value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200/88">{item.detail}</p>
        </article>
      ))}
    </div>
  );
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
    <section className="surface-hero relative overflow-hidden px-6 py-8 shadow-2xl shadow-black/25 md:px-10 md:py-10">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="max-w-4xl">
          <div
            className={cn(
              "inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]",
              toneClasses(state.summary.tone),
            )}
          >
            {state.summary.eyebrow}
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
            {state.summary.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            {state.summary.detail}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={state.primaryAction.href}
              className={actionClasses(state.primaryAction, "primary")}
            >
              {state.primaryAction.label}
            </Link>
            <Link
              href={state.secondaryAction.href}
              className={actionClasses(state.secondaryAction, "secondary")}
            >
              {state.secondaryAction.label}
            </Link>
            {state.pricingAction && state.pricingAction.href !== state.secondaryAction.href ? (
              <Link href={state.pricingAction.href} className="button-secondary">
                {state.pricingAction.label}
              </Link>
            ) : null}
          </div>
        </div>
        {auxiliary ? (
          <div className="surface-action rounded-[1.7rem] p-5 text-sm text-slate-300 shadow-xl shadow-black/15">
            {auxiliary}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
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
      label: "Understand the lane",
      detail: "See what the product does, who it fits, and what is live right now.",
    },
    {
      id: "plan",
      label: "Choose the path",
      detail: "Pick pricing, signup, or reviewed intake without losing the same founder context.",
    },
    {
      id: "activate",
      label: "Open the workspace",
      detail: "Use the active identity path without duplicating the workspace or resetting the journey.",
    },
    {
      id: "operate",
      label: "Run with signal",
      detail: "Operate research, validation, launch, and billing from one accountable surface.",
    },
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const active = currentStep >= index + 1;
        const current = currentStep === index + 1;

        return (
          <article
            key={step.id}
            className={cn(
              "surface-data rounded-[1.45rem] border px-4 py-4 text-sm shadow-lg shadow-black/10",
              active
                ? "border-cyan-300/34 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-slate-950/40 text-slate-400",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Step {index + 1}
              </p>
              {current ? (
                <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  current
                </span>
              ) : null}
            </div>
            <p className="mt-3 font-semibold">{step.label}</p>
            <p className="mt-2 leading-6">{step.detail}</p>
          </article>
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
    <article className="surface-proof rounded-[1.7rem] p-6 shadow-lg shadow-black/10">
      <p className="eyebrow text-cyan-300/80">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{detail}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}

export function PublicTrustGrid({
  cards,
}: {
  cards: PublicTrustCard[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.label}
          className="surface-data rounded-[1.5rem] p-5 shadow-lg shadow-black/10"
        >
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{card.value}</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{card.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function PublicLaunchBoard({
  blockers,
  detail,
  title,
}: {
  blockers: PublicLaunchBlocker[];
  detail: string;
  title: string;
}) {
  return (
    <section className="surface-readiness overflow-hidden p-6 shadow-2xl shadow-black/20 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <div className="space-y-3">
          <p className="eyebrow text-cyan-300/80">Launch readiness</p>
          <h3 className="text-2xl font-semibold tracking-tight text-white">{title}</h3>
          <p className="text-sm leading-7 copy-soft">{detail}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {blockers.map((blocker) => (
            <article
              key={blocker.id}
              className="surface-data rounded-[1.35rem] border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {blocker.label}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    blockerToneClasses(blocker.status),
                  )}
                >
                  {blockerStatusLabel(blocker.status)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 copy-soft">{blocker.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicEvidenceGrid({
  cards,
  columns = 3,
}: {
  cards: PublicMarketingCard[];
  columns?: 2 | 3;
}) {
  return (
    <div className={cn("grid gap-4", columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
      {cards.map((card) => (
        <article
          key={card.title}
          className="surface-proof rounded-[1.6rem] p-6 shadow-lg shadow-black/10"
        >
          <h3 className="text-xl font-semibold tracking-tight text-white">{card.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{card.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function PublicComparisonTable({
  rows,
}: {
  rows: PublicComparisonRow[];
}) {
  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <article
          key={row.capability}
          className="surface-proof rounded-[1.7rem] p-5 shadow-lg shadow-black/10"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {row.capability}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.3rem] border border-cyan-300/20 bg-cyan-400/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Today
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-100">{row.current}</p>
            </div>
            <div className="rounded-[1.3rem] border border-emerald-300/20 bg-emerald-400/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                When fully open
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-100">{row.target}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PublicFaqList({
  items,
}: {
  items: PublicFaqItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <details
          key={item.question}
          className="surface-proof group rounded-[1.6rem] p-5 shadow-lg shadow-black/10"
        >
          <summary className="list-none pr-8 text-lg font-semibold tracking-tight text-white">
            {item.question}
          </summary>
          <p className="mt-4 text-sm leading-7 text-slate-300">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function PublicClosingCta({
  block,
  primaryAction,
  secondaryAction,
}: {
  block: PublicCtaBlock;
  primaryAction: PublicFunnelAction;
  secondaryAction: PublicFunnelAction;
}) {
  return (
    <section className="surface-action overflow-hidden p-6 shadow-2xl shadow-black/20 md:p-8">
      <p className="eyebrow text-cyan-100/80">{block.eyebrow}</p>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h3 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {block.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-cyan-50/90 md:text-base">{block.detail}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={primaryAction.href} className="button-primary">
            {primaryAction.label}
          </Link>
          <Link href={secondaryAction.href} className="button-secondary">
            {secondaryAction.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
