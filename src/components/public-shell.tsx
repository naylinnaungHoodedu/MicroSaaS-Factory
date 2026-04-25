import Link from "next/link";
import type { ReactNode } from "react";

import type { PublicFunnelAction, PublicFunnelState } from "@/lib/server/funnel";
import { cn } from "@/lib/utils";

const PUBLIC_PRIMARY_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/help", label: "Help" },
  { href: "/pricing", label: "Pricing" },
  { href: "/signup", label: "Get started" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/login", label: "Founder login" },
] as const;

const PUBLIC_FOOTER_LINKS = [
  { href: "/help", label: "Help" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Founder login" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

type PublicShellState = Pick<
  PublicFunnelState,
  | "activationReady"
  | "auth"
  | "availabilityMode"
  | "checkoutVisible"
  | "founder"
  | "launch"
  | "metrics"
  | "pricingVisible"
  | "primaryAction"
  | "secondaryAction"
  | "signupAvailable"
  | "summary"
  | "waitlistOpen"
> & {
  surfaces?: PublicFunnelState["surfaces"];
};

function getHeaderStatus(state?: PublicShellState) {
  if (!state) {
    return "One surface for a solo founder from early signal to recurring revenue.";
  }

  if (state.founder.loggedIn) {
    return "Your workspace is already live and ready for the next move.";
  }

  if (state.availabilityMode === "self_serve") {
    return state.activationReady
      ? "Public signup and founder return are both live in this environment."
      : "Signup is open now while the final activation step stays staged.";
  }

  if (state.availabilityMode === "signup_intent") {
    return "Pricing and guided signup are public while full self-serve still stays staged.";
  }

  return "Reviewed entry stays available when direct signup is not the right first step.";
}

function getFooterDetail(state?: PublicShellState) {
  if (state?.surfaces?.footer.detail) {
    return state.surfaces.footer.detail;
  }

  if (!state) {
    return "Founder operating system for solo technical founders with public pricing, guided signup, and readiness-aware activation.";
  }

  if (state.availabilityMode === "self_serve") {
    return state.activationReady
      ? "Founder operating system with live activation, connected ops, and workspace-aware billing controls."
      : "Founder operating system with public pricing and workspace staging while activation finishes verification.";
  }

  if (state.availabilityMode === "signup_intent") {
    return "Founder operating system with public pricing, guided signup, and readiness-aware activation.";
  }

  return "Founder operating system with reviewed entry, staged access, and connected operating controls.";
}

function getFooterSignals(state?: PublicShellState) {
  if (state?.surfaces?.footer.signals?.length) {
    return state.surfaces.footer.signals;
  }

  if (!state) {
    return [];
  }

  const availabilityLabel =
    state.availabilityMode === "self_serve"
      ? state.activationReady
        ? "self-serve live"
        : "guided self-serve"
      : state.availabilityMode === "signup_intent"
        ? "guided signup"
        : "reviewed entry";

  return [
    `launch ${availabilityLabel}`,
    `pricing ${state.pricingVisible ? "visible" : "hidden"}`,
    `checkout ${state.checkoutVisible ? "visible" : "controlled"}`,
    `access ${state.auth.firebaseEnabled ? "firebase + fallback" : "invite-led"}`,
  ];
}

function buildHeaderLinks(state?: PublicShellState) {
  return PUBLIC_PRIMARY_LINKS.filter((item) => {
    if (item.href === "/pricing") {
      return state?.pricingVisible ?? true;
    }

    if (item.href === "/signup") {
      return state?.signupAvailable ?? true;
    }

    if (item.href === "/waitlist") {
      return state?.waitlistOpen ?? true;
    }

    return true;
  });
}

function ActionLinks({
  primaryAction,
  secondaryAction,
  className,
}: {
  primaryAction?: PublicFunnelAction;
  secondaryAction?: PublicFunnelAction;
  className?: string;
}) {
  if (!primaryAction && !secondaryAction) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {secondaryAction ? (
        <Link href={secondaryAction.href} className="button-secondary">
          {secondaryAction.label}
        </Link>
      ) : null}
      {primaryAction ? (
        <Link href={primaryAction.href} className="button-primary">
          {primaryAction.label}
        </Link>
      ) : null}
    </div>
  );
}

export function PublicSiteHeader({
  state,
}: {
  state?: PublicShellState;
}) {
  const links = buildHeaderLinks(state);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/78 backdrop-blur-xl">
      <div className="border-b border-white/8 bg-white/[0.03]">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 font-semibold uppercase tracking-[0.24em] text-cyan-100">
              {state?.summary.eyebrow ?? "Founder Operating System"}
            </span>
            <span className="text-slate-300/90">{getHeaderStatus(state)}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {state?.availabilityMode === "self_serve"
                ? state.activationReady
                  ? "self-serve live"
                  : "self-serve staged"
                : state?.availabilityMode === "signup_intent"
                  ? "guided signup"
                  : "reviewed entry"}
            </span>
            {state?.pricingVisible ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                pricing live
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {state?.checkoutVisible ? "checkout visible" : "checkout controlled"}
            </span>
          </div>
        </div>
      </div>

      <div className="page-shell py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/" className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300/90">
              MicroSaaS Factory
            </Link>
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Solo founder operating system
              </span>
              {state ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {state.metrics.workspaceCount} workspaces
                </span>
              ) : null}
            </div>
          </div>

          <nav className="hidden flex-wrap items-center gap-2 lg:flex">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <ActionLinks
            primaryAction={state?.primaryAction}
            secondaryAction={state?.secondaryAction}
            className="hidden lg:flex"
          />

          <details className="group relative lg:hidden">
            <summary className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
              Menu
            </summary>
            <div className="absolute right-4 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/10 bg-slate-950/96 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="grid gap-2">
                {links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <ActionLinks
                primaryAction={state?.primaryAction}
                secondaryAction={state?.secondaryAction}
                className="mt-4"
              />
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function PublicSiteFooter({
  state,
}: {
  state?: PublicShellState;
}) {
  const signals = getFooterSignals(state);

  return (
    <footer className="border-t border-white/10 bg-slate-950/40">
      <div className="page-shell flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="eyebrow text-cyan-300/80">MicroSaaS Factory</p>
          <p className="max-w-2xl text-sm leading-7 text-slate-400">{getFooterDetail(state)}</p>
          {signals.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {signals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400"
                >
                  {signal}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <nav className="flex flex-wrap gap-3">
          {PUBLIC_FOOTER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function PublicSiteShell({
  children,
  footerState,
  mainClassName,
}: {
  children: ReactNode;
  footerState?: PublicShellState;
  mainClassName?: string;
}) {
  return (
    <>
      <PublicSiteHeader state={footerState} />
      <main className={cn("flex-1", mainClassName)}>{children}</main>
      <PublicSiteFooter state={footerState} />
    </>
  );
}
