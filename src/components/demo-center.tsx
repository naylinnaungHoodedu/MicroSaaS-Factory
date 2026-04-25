import Link from "next/link";

import {
  DEMO_ANCHORS,
  DEMO_FAQ,
  DEMO_OPERATING_MODEL_CARDS,
  DEMO_PROOF_CARDS,
  DEMO_PRIORITY_PATHS,
  DEMO_TOUR_STEPS,
  DEMO_WORKFLOW_SPINE,
  type DemoTourStep,
} from "@/lib/demo-content";

import { PublicFaqList } from "@/components/public-ui";
import { Section, StatCard } from "@/components/ui";

type DemoAction = {
  href: string;
  label: string;
};

type DemoMode = "public" | "workspace";

export type PublicDemoContext = {
  activationLabel: string;
  checkoutLabel: string;
  planLabel: string;
  pricingLabel: string;
  primaryAction: DemoAction;
  readinessItems: Array<{
    detail: string;
    label: string;
    status: string;
  }>;
  secondaryAction: DemoAction;
  signupLabel: string;
};

export type WorkspaceDemoContext = {
  activeProductCount: number;
  archivedProductCount: number;
  billingStatus: string;
  checkoutLabel: string;
  crmAttentionCount: number;
  founderEmail: string;
  nextAction: string;
  passedGatesLabel: string;
  pricingLabel: string;
  productLinks: Array<{
    href: string;
    name: string;
    readiness: string;
    stage: string;
    summary: string;
  }>;
  readyProductsLabel: string;
  totalMrrLabel: string;
  totalProductCount: number;
  workspaceName: string;
};

function resolveDemoHref(mode: DemoMode, href?: string) {
  if (!href) {
    return undefined;
  }

  if (mode === "public" && href.startsWith("/app")) {
    return "/signup";
  }

  return href;
}

function DemoBadge({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "amber" | "cyan" | "default" | "emerald";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : tone === "amber"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : tone === "cyan"
          ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-white/5 text-slate-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function DemoSignalTile({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail?: string;
  label: string;
  tone?: "amber" | "cyan" | "default" | "emerald";
  value: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300/24 bg-emerald-500/10"
      : tone === "amber"
        ? "border-amber-300/24 bg-amber-500/10"
        : tone === "cyan"
          ? "border-cyan-300/24 bg-cyan-400/10"
          : "border-white/10 bg-slate-950/45";

  return (
    <div className={`rounded-[1.15rem] border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p> : null}
    </div>
  );
}

function HeroSignals({
  publicContext,
  workspaceContext,
}: {
  publicContext?: PublicDemoContext;
  workspaceContext?: WorkspaceDemoContext;
}) {
  if (workspaceContext) {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <DemoSignalTile label="Mode" value="Workspace demo" tone="cyan" />
        <DemoSignalTile
          label="Products"
          value={String(workspaceContext.activeProductCount)}
          detail={`${workspaceContext.archivedProductCount} archived`}
        />
        <DemoSignalTile
          label="CRM attention"
          value={String(workspaceContext.crmAttentionCount)}
          detail="Due today, overdue, and pending analysis"
          tone={workspaceContext.crmAttentionCount > 0 ? "amber" : "emerald"}
        />
        <DemoSignalTile
          label="Checkout"
          value={workspaceContext.checkoutLabel}
          detail={`Pricing ${workspaceContext.pricingLabel.toLowerCase()}`}
          tone={workspaceContext.checkoutLabel.toLowerCase().includes("visible") ? "emerald" : "amber"}
        />
      </div>
    );
  }

  if (!publicContext) {
    return null;
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <DemoSignalTile label="Mode" value="Public demo" tone="cyan" />
      <DemoSignalTile label="Plan" value={publicContext.planLabel} detail={publicContext.pricingLabel} />
      <DemoSignalTile
        label="Signup"
        value={publicContext.signupLabel}
        tone={publicContext.signupLabel.toLowerCase().includes("open") ? "emerald" : "amber"}
      />
      <DemoSignalTile
        label="Checkout"
        value={publicContext.checkoutLabel}
        detail={`Activation ${publicContext.activationLabel.toLowerCase()}`}
        tone={publicContext.checkoutLabel.toLowerCase().includes("visible") ? "emerald" : "amber"}
      />
    </div>
  );
}

function DemoActionLink({
  href,
  label,
  variant = "secondary",
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link href={href} className={variant === "primary" ? "button-primary" : "button-secondary"}>
      {label}
    </Link>
  );
}

function DemoAnchorNav() {
  return (
    <nav
      aria-label="Demo sections"
      className="mt-8 overflow-x-auto rounded-[1.2rem] border border-white/10 bg-slate-950/45 p-2"
    >
      <div className="flex min-w-max gap-2">
        {DEMO_ANCHORS.map((anchor) => (
          <a
            key={anchor.href}
            href={anchor.href}
            className="rounded-[0.85rem] border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-cyan-300/35 hover:text-cyan-100"
          >
            {anchor.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function PriorityPath({
  mode,
}: {
  mode: DemoMode;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {DEMO_PRIORITY_PATHS[mode].map((item, index) => {
        const href = resolveDemoHref(mode, item.href);

        return (
          <article
            key={item.label}
            className="surface-data rounded-[1.25rem] border border-white/10 p-4 shadow-lg shadow-black/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Priority {index + 1}
                </p>
                <h3 className="mt-2 text-base font-semibold text-white">{item.label}</h3>
              </div>
              <DemoBadge tone={index === 0 ? "cyan" : "default"}>{item.signal}</DemoBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</p>
            {href ? (
              <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-cyan-100">
                Open path
              </Link>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function OperatingModelPanel() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {DEMO_OPERATING_MODEL_CARDS.map((card) => (
        <article
          key={card.label}
          className="surface-proof rounded-[1.25rem] border border-white/10 p-4 shadow-lg shadow-black/10"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {card.label}
          </p>
          <p className="mt-3 text-lg font-semibold text-white">{card.value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{card.detail}</p>
        </article>
      ))}
    </div>
  );
}

function DemoStepCard({
  index,
  mode,
  step,
}: {
  index: number;
  mode: DemoMode;
  step: DemoTourStep;
}) {
  const href = resolveDemoHref(mode, step.href);

  return (
    <article className="surface-proof rounded-[1.55rem] p-5 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Step {index + 1}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{step.title}</h3>
        </div>
        <DemoBadge tone={step.metricTone}>{step.metricLabel}</DemoBadge>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">{step.detail}</p>
      <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-slate-950/45 p-4">
        <p className="text-2xl font-semibold tracking-tight text-white">{step.metricValue}</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">{step.metricDetail}</p>
      </div>
      <div className="mt-5 grid gap-2">
        {step.proofPoints.map((point) => (
          <div
            key={point}
            className="rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
          >
            {point}
          </div>
        ))}
      </div>
      {href ? (
        <Link href={href} className="mt-5 inline-flex text-sm font-semibold text-cyan-100">
          Open this surface
        </Link>
      ) : null}
    </article>
  );
}

function PublicReadinessPanel({
  context,
}: {
  context: PublicDemoContext;
}) {
  return (
    <Section
      eyebrow="Live posture"
      title="The public demo reflects what the launch funnel can safely do today."
      description="Demo keeps the staged and live parts of the product visible so founders can evaluate the operating loop without guessing about activation or checkout."
      className="scroll-mt-28"
    >
      <div id="demo-readiness" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {context.readinessItems.map((item) => (
          <article
            key={item.label}
            className="surface-data rounded-[1.25rem] border border-white/10 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {item.label}
              </p>
              <DemoBadge
                tone={
                  item.status === "ready"
                    ? "emerald"
                    : item.status === "manual"
                      ? "cyan"
                      : "amber"
                }
              >
                {item.status}
              </DemoBadge>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function WorkspaceSnapshotPanel({
  context,
}: {
  context: WorkspaceDemoContext;
}) {
  return (
    <Section
      eyebrow="Workspace snapshot"
      title="The authenticated demo reads the current workspace without changing it."
      description="Use this snapshot to connect the read-only tour to the founder workspace, CRM pressure, launch gates, billing posture, and current product lanes."
      className="scroll-mt-28"
    >
      <div id="demo-readiness" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total products"
          value={String(context.totalProductCount)}
          detail="Active and archived lanes in this workspace"
          tone="accent"
        />
        <StatCard
          label="Passed gates"
          value={context.passedGatesLabel}
          detail="Active products currently passing launch review"
          tone="success"
        />
        <StatCard
          label="Ready for next"
          value={context.readyProductsLabel}
          detail="Active products calm enough for the next lane"
          tone="warning"
        />
        <StatCard
          label="MRR"
          value={context.totalMrrLabel}
          detail={`Billing status ${context.billingStatus}`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="surface-proof rounded-[1.45rem] p-5 shadow-lg shadow-black/10">
          <p className="eyebrow text-cyan-300/80">Next founder move</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{context.nextAction}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <DemoActionLink href="/app" label="Open dashboard" variant="primary" />
            <DemoActionLink href="/app/crm" label="Open CRM" />
          </div>
        </div>

        <div className="grid gap-3">
          {context.productLinks.length > 0 ? (
            context.productLinks.map((product) => (
              <article
                key={product.href}
                className="surface-data rounded-[1.25rem] border border-white/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {product.stage}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{product.name}</h3>
                  </div>
                  <DemoBadge tone={product.readiness === "Launch gate passed" ? "emerald" : "amber"}>
                    {product.readiness}
                  </DemoBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{product.summary}</p>
                <Link href={product.href} className="mt-4 inline-flex text-sm font-semibold text-cyan-100">
                  Open lane
                </Link>
              </article>
            ))
          ) : (
            <div className="surface-data rounded-[1.25rem] border border-white/10 p-5">
              <p className="text-lg font-semibold text-white">No product lanes yet</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Create the first product lane from the dashboard, then return to Demo to see
                workspace-specific signals in this read-only tour.
              </p>
              <div className="mt-5">
                <DemoActionLink href="/app" label="Open dashboard" variant="primary" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function ProofPanel() {
  return (
    <Section
      eyebrow="What the demo proves"
      title="The product story stays attached to operating evidence."
      description="Demo is intentionally read-only: it shows the workflow, current posture, and expected operating rhythm without creating hidden state."
      className="scroll-mt-28"
    >
      <div id="demo-operating-proof" className="grid gap-4 lg:grid-cols-3">
        {DEMO_PROOF_CARDS.map((card) => (
          <article
            key={card.title}
            className="surface-proof rounded-[1.45rem] p-5 shadow-lg shadow-black/10"
          >
            <DemoBadge tone="cyan">{card.signal}</DemoBadge>
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{card.detail}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function WorkflowSpinePanel({
  mode,
}: {
  mode: DemoMode;
}) {
  return (
    <Section
      eyebrow="Workflow spine"
      title="One operating rhythm from market signal to live revenue."
      description="The Demo tab follows the same public product story: market signal, customer validation, scope control, connected operations, launch truth, and ongoing portfolio discipline stay in one loop."
      className="scroll-mt-28"
    >
      <div id="demo-workflow-spine" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DEMO_WORKFLOW_SPINE.map((item, index) => {
          const href = resolveDemoHref(mode, item.href);

          return (
            <article
              key={item.label}
              className="surface-data rounded-[1.35rem] border border-white/10 p-5 shadow-lg shadow-black/10"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Step {index + 1}
                </p>
                {index === 0 ? <DemoBadge tone="cyan">Start</DemoBadge> : null}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{item.label}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</p>
              {href ? (
                <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-cyan-100">
                  Open related surface
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </Section>
  );
}

export function DemoCenter({
  mode,
  publicContext,
  workspaceContext,
}: {
  mode: DemoMode;
  publicContext?: PublicDemoContext;
  workspaceContext?: WorkspaceDemoContext;
}) {
  const isWorkspace = mode === "workspace";
  const primaryAction = isWorkspace
    ? { href: "/app", label: "Open dashboard" }
    : publicContext?.primaryAction;
  const secondaryAction = isWorkspace
    ? { href: "/app/crm", label: "Open CRM" }
    : publicContext?.secondaryAction;

  return (
    <div className="space-y-8">
      <section className="surface-hero relative overflow-hidden p-6 shadow-2xl shadow-black/25 md:p-8">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2">
              <DemoBadge tone="cyan">
                {isWorkspace ? "Workspace Demo Center" : "Public Demo Center"}
              </DemoBadge>
              <DemoBadge>{isWorkspace ? "Read-only workspace tour" : "Read-only product tour"}</DemoBadge>
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              {isWorkspace
                ? "Demo the operating loop with current workspace signals."
                : "Demo the MicroSaaS Factory loop from signal to live revenue."}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              {isWorkspace && workspaceContext
                ? `Use this read-only walkthrough to connect ${workspaceContext.workspaceName} to the same signal, validation, build, launch, and revenue rhythm shown on the public site.`
                : "Walk through the founder workflow before creating a workspace: understand the lane, choose the path, inspect readiness, validate demand, connect operations, and keep the portfolio calm enough to compound."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {primaryAction ? (
                <DemoActionLink
                  href={primaryAction.href}
                  label={primaryAction.label}
                  variant="primary"
                />
              ) : null}
              {secondaryAction ? (
                <DemoActionLink href={secondaryAction.href} label={secondaryAction.label} />
              ) : null}
              <DemoActionLink
                href={isWorkspace ? "/pricing" : "/login"}
                label={isWorkspace ? "Review pricing" : "Founder login"}
              />
            </div>

            <div className="mt-7 rounded-[1.35rem] border border-white/10 bg-slate-950/38 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                Read this first
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {isWorkspace
                  ? "The workspace demo is a safe operating map: read the current signals, open the lane with the clearest gap, and use CRM plus launch posture before changing scope."
                  : "The public demo is the product map before signup: see the operating loop, understand what is live or staged, and use the current route contract without hitting an auth-only dead end."}
              </p>
            </div>
          </div>

          <aside className="surface-action rounded-[1.55rem] p-5 shadow-xl shadow-black/15">
            <p className="eyebrow text-cyan-100/80">
              {isWorkspace ? "Current context" : "Launch-aware context"}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {isWorkspace && workspaceContext
                ? workspaceContext.workspaceName
                : publicContext?.planLabel ?? "Growth"}
            </p>
            <p className="mt-3 text-sm leading-7 text-cyan-50/90">
              {isWorkspace && workspaceContext
                ? `${workspaceContext.founderEmail} can use this page as a safe walkthrough before moving into dashboard, CRM, launch, or billing surfaces.`
                : "Public visitors can inspect the operating rhythm while signup, checkout, and activation stay tied to the current launch posture."}
            </p>
            <HeroSignals publicContext={publicContext} workspaceContext={workspaceContext} />
          </aside>
        </div>

        <DemoAnchorNav />
      </section>

      <Section
        eyebrow="Quick start"
        title={isWorkspace ? "Start with the workspace signals already in view." : "Understand the lane before you create or reopen a workspace."}
        description={
          isWorkspace
            ? "The fastest Demo path starts with the current dashboard, CRM pressure, product lanes, and checkout posture instead of a separate sample workspace."
            : "The public Demo path follows the live site: understand the lane, choose the commercial route, and preserve the same founder identity through signup and recovery."
        }
        className="scroll-mt-28"
      >
        <div id="demo-quick-start" className="space-y-5">
          <PriorityPath mode={mode} />
          <OperatingModelPanel />
        </div>
      </Section>

      <Section
        eyebrow="Guided demo"
        title="Six surfaces, one founder operating loop."
        description="Each step is intentionally tied to an existing MicroSaaS Factory surface, so the demo explains how the product works without adding a separate sample workspace or fake data layer."
        className="scroll-mt-28"
      >
        <div id="demo-guided-tour" className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {DEMO_TOUR_STEPS.map((step, index) => (
            <DemoStepCard key={step.title} index={index} mode={mode} step={step} />
          ))}
        </div>
      </Section>

      {isWorkspace && workspaceContext ? (
        <WorkspaceSnapshotPanel context={workspaceContext} />
      ) : publicContext ? (
        <PublicReadinessPanel context={publicContext} />
      ) : null}

      <WorkflowSpinePanel mode={mode} />

      <ProofPanel />

      <Section
        eyebrow="FAQ"
        title="Demo questions founders should not have to infer."
        description="The Demo tab is a product tour and context bridge, not a new request-demo workflow or hidden mutation path."
        className="scroll-mt-28"
      >
        <div id="demo-faq">
          <PublicFaqList items={DEMO_FAQ} />
        </div>
      </Section>
    </div>
  );
}
