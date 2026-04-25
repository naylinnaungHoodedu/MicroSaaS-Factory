import Link from "next/link";

import {
  HELP_ANCHORS,
  HELP_AREAS,
  HELP_FAQ,
  HELP_PRIORITY_PATHS,
  HELP_STATUS_GROUPS,
  HELP_TROUBLESHOOTING,
  HELP_WORKFLOW_STEPS,
  type HelpArea,
} from "@/lib/help-content";

import { Section, StatCard } from "@/components/ui";

type HelpAction = {
  href: string;
  label: string;
};

type HelpMode = "public" | "workspace";

export type PublicHelpContext = {
  accessLabel: string;
  activationLabel: string;
  checkoutLabel: string;
  planLabel: string;
  pricingLabel: string;
  primaryAction: HelpAction;
  readinessItems: Array<{
    detail: string;
    label: string;
    status: string;
  }>;
  secondaryAction: HelpAction;
};

export type WorkspaceHelpContext = {
  activeProductCount: number;
  archivedProductCount: number;
  billingStatus: string;
  checkoutLabel: string;
  crmDueTodayCount: number;
  crmOverdueCount: number;
  crmPendingAnalysisCount: number;
  crmSnoozedCount: number;
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

function resolveHref(mode: HelpMode, href?: string) {
  if (!href) {
    return undefined;
  }

  if (mode === "public" && href.startsWith("/app")) {
    return "/login";
  }

  return href;
}

function HelpBadge({
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

function HelpLink({
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

function HelpSignalTile({
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
    <div className={`rounded-[1.1rem] border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p> : null}
    </div>
  );
}

function PriorityPath({
  mode,
}: {
  mode: HelpMode;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {HELP_PRIORITY_PATHS[mode].map((item, index) => {
        const href = resolveHref(mode, item.href);

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
              <HelpBadge tone={index === 0 ? "cyan" : "default"}>{item.signal}</HelpBadge>
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

function HeroSignals({
  publicContext,
  workspaceContext,
}: {
  publicContext?: PublicHelpContext;
  workspaceContext?: WorkspaceHelpContext;
}) {
  if (workspaceContext) {
    const crmAttention = workspaceContext.crmOverdueCount + workspaceContext.crmDueTodayCount;

    return (
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <HelpSignalTile label="Mode" value="Workspace guide" tone="cyan" />
        <HelpSignalTile
          label="Products"
          value={String(workspaceContext.activeProductCount)}
          detail={`${workspaceContext.archivedProductCount} archived`}
        />
        <HelpSignalTile
          label="CRM attention"
          value={String(crmAttention)}
          detail="Due today plus overdue"
          tone={crmAttention > 0 ? "amber" : "emerald"}
        />
        <HelpSignalTile
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
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <HelpSignalTile label="Mode" value="Public guide" tone="cyan" />
      <HelpSignalTile label="Access" value={publicContext.accessLabel} />
      <HelpSignalTile
        label="Activation"
        value={publicContext.activationLabel}
        tone={publicContext.activationLabel.toLowerCase().includes("ready") ? "emerald" : "amber"}
      />
      <HelpSignalTile
        label="Checkout"
        value={publicContext.checkoutLabel}
        tone={publicContext.checkoutLabel.toLowerCase().includes("visible") ? "emerald" : "amber"}
      />
    </div>
  );
}

function HelpAnchorNav() {
  return (
    <nav
      aria-label="Help sections"
      className="mt-8 overflow-x-auto rounded-[1.2rem] border border-white/10 bg-slate-950/45 p-2"
    >
      <div className="flex min-w-max gap-2">
        {HELP_ANCHORS.map((anchor) => (
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

function AreaCard({
  area,
  mode,
}: {
  area: HelpArea;
  mode: HelpMode;
}) {
  const href = resolveHref(mode, area.href);

  return (
    <article className="surface-proof rounded-[1.35rem] p-5 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-cyan-300/80">Workspace area</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{area.title}</h3>
        </div>
        {href ? (
          <Link
            href={href}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-300/35 hover:text-cyan-100"
          >
            Open
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Capabilities
          </p>
          <ul className="mt-3 space-y-2">
            {area.capabilities.map((item) => (
              <li
                key={item}
                className="border-l border-white/10 pl-3 text-sm leading-6 text-slate-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Recommended next steps
          </p>
          <ol className="mt-3 space-y-2">
            {area.recommendedSteps.map((item) => (
              <li
                key={item}
                className="border-l border-cyan-300/20 pl-3 text-sm leading-6 text-slate-200"
              >
                {item}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </article>
  );
}

function PublicSnapshot({
  context,
}: {
  context: PublicHelpContext;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Current plan"
        value={context.planLabel}
        detail="The public commercial lane founders can evaluate before workspace activation."
        tone="accent"
      />
      <StatCard
        label="Pricing"
        value={context.pricingLabel}
        detail="Pricing visibility stays tied to public launch posture."
      />
      <StatCard
        label="Activation"
        value={context.activationLabel}
        detail="Signup can be live while final activation remains readiness-gated."
        tone={context.activationLabel.toLowerCase().includes("ready") ? "success" : "warning"}
      />
      <StatCard
        label="Checkout"
        value={context.checkoutLabel}
        detail="Checkout stays visible only when billing readiness and workspace eligibility align."
        tone={context.checkoutLabel.toLowerCase().includes("visible") ? "success" : "warning"}
      />
    </div>
  );
}

function WorkspaceSnapshot({
  context,
}: {
  context: WorkspaceHelpContext;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active products"
        value={String(context.activeProductCount)}
        detail={`${context.archivedProductCount} archived, ${context.totalProductCount} total lanes.`}
        tone="accent"
      />
      <StatCard
        label="Passed gates"
        value={context.passedGatesLabel}
        detail="Products currently passing their latest launch gate."
        tone="success"
      />
      <StatCard
        label="Ready for next"
        value={context.readyProductsLabel}
        detail="Lanes stable enough to support factory compounding."
        tone="warning"
      />
      <StatCard
        label="Portfolio MRR"
        value={context.totalMrrLabel}
        detail={`Billing status: ${context.billingStatus}. Checkout is ${context.checkoutLabel.toLowerCase()}.`}
      />
    </div>
  );
}

function WorkspaceCrmSnapshot({
  context,
}: {
  context: WorkspaceHelpContext;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard label="Due today" value={String(context.crmDueTodayCount)} detail="Tasks ready for action." />
      <StatCard
        label="Overdue"
        value={String(context.crmOverdueCount)}
        detail="Past-due validation work."
        tone="warning"
      />
      <StatCard label="Snoozed" value={String(context.crmSnoozedCount)} detail="Deferred follow-ups." />
      <StatCard
        label="Pending analysis"
        value={String(context.crmPendingAnalysisCount)}
        detail="Queued transcript intelligence."
        tone="accent"
      />
    </div>
  );
}

function WorkspaceProductMap({
  context,
}: {
  context: WorkspaceHelpContext;
}) {
  if (context.productLinks.length === 0) {
    return (
      <div className="surface-empty px-6 py-8 text-center shadow-inner shadow-black/10">
        <p className="text-lg font-semibold text-white">No product lanes yet</p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
          Open the dashboard and create the first product lane before using product-specific Help.
        </p>
        <div className="mt-5">
          <HelpLink href="/app" label="Open dashboard" variant="primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {context.productLinks.map((product) => (
        <article key={product.href} className="surface-proof rounded-[1.45rem] p-5 shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-slate-500">Product lane</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{product.name}</h3>
            </div>
            <HelpBadge tone={product.readiness === "Launch gate passed" ? "emerald" : "amber"}>
              {product.readiness}
            </HelpBadge>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-300">{product.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <HelpBadge tone="cyan">{product.stage}</HelpBadge>
            <Link href={product.href} className="button-secondary">
              Open lane
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function PublicReadinessMap({
  context,
}: {
  context: PublicHelpContext;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {context.readinessItems.map((item) => (
        <article key={item.label} className="surface-proof rounded-[1.45rem] p-5 shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">{item.label}</h3>
            <HelpBadge
              tone={
                item.status === "ready"
                  ? "emerald"
                  : item.status === "manual"
                    ? "cyan"
                    : "amber"
              }
            >
              {item.status}
            </HelpBadge>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function HelpCenter({
  mode,
  publicContext,
  workspaceContext,
}: {
  mode: "public" | "workspace";
  publicContext?: PublicHelpContext;
  workspaceContext?: WorkspaceHelpContext;
}) {
  const isWorkspace = mode === "workspace" && workspaceContext;
  const primaryAction = isWorkspace
    ? { href: "/app", label: "Open dashboard" }
    : publicContext?.primaryAction;
  const secondaryAction = isWorkspace
    ? { href: "/app/crm", label: "Open CRM" }
    : publicContext?.secondaryAction;

  return (
    <div className="space-y-8">
      <section className="surface-hero relative overflow-hidden px-5 py-7 shadow-2xl shadow-black/25 md:px-8 md:py-9">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-400/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              {isWorkspace ? "Workspace Help Center" : "Public Help Center"}
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold text-white md:text-6xl">
              {isWorkspace
                ? "Workspace-aware operating guide"
                : "Operational guidance for every founder using MicroSaaS Factory."}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              {isWorkspace
                ? `Use this guide to decide what to do next inside ${workspaceContext.workspaceName}, with current product, CRM, launch, and billing signals in view.`
                : "Use this guide to understand the public launch path, workspace workflow, product-lane stages, readiness labels, and the fastest recovery route when something is staged or blocked."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {primaryAction ? (
                <HelpLink href={primaryAction.href} label={primaryAction.label} variant="primary" />
              ) : null}
              {secondaryAction ? (
                <HelpLink href={secondaryAction.href} label={secondaryAction.label} />
              ) : null}
              <HelpLink href={isWorkspace ? "/pricing" : "/login"} label={isWorkspace ? "Review pricing" : "Founder login"} />
            </div>

            <div className="mt-7 rounded-[1.35rem] border border-white/10 bg-slate-950/38 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                Read this first
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {isWorkspace
                  ? "This Help tab is an operating dashboard: resolve CRM pressure, inspect the lane with the clearest gap, then use launch and billing posture before changing scope."
                  : "This Help tab is the public operating map: confirm the supported entry path, preserve founder identity, and treat staged states as recovery instructions."}
              </p>
            </div>
          </div>

          <aside className="surface-action rounded-[1.7rem] p-5 shadow-xl shadow-black/15">
            <p className="eyebrow text-cyan-100/80">
              {isWorkspace ? "Current workspace" : "Current public posture"}
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              {isWorkspace ? workspaceContext.workspaceName : publicContext?.planLabel ?? "Growth"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-cyan-50/90">
              {isWorkspace
                ? workspaceContext.nextAction
                : `Access is ${publicContext?.accessLabel ?? "readiness-aware"}, pricing is ${publicContext?.pricingLabel.toLowerCase() ?? "visible when ready"}, and checkout is ${publicContext?.checkoutLabel.toLowerCase() ?? "controlled"}.`}
            </p>
            {isWorkspace ? (
              <p className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                Signed in as {workspaceContext.founderEmail}.
              </p>
            ) : null}
            <HeroSignals
              publicContext={publicContext}
              workspaceContext={isWorkspace ? workspaceContext : undefined}
            />
          </aside>
        </div>

        <HelpAnchorNav />
      </section>

      <Section
        eyebrow="Quick start"
        title={isWorkspace ? "Start with the signals already in this workspace." : "Understand the current path before you create or reopen a workspace."}
        description={
          isWorkspace
            ? "The fastest Help path is to read the dashboard, CRM pressure, and launch posture before opening another lane or changing billing."
            : "The public Help Center shows what is live now, what stays staged, and where to go when a founder needs signup, pricing, recovery, or reviewed intake."
        }
        className="scroll-mt-28"
      >
        <div id="quick-start" className="space-y-5">
          <PriorityPath mode={isWorkspace ? "workspace" : "public"} />
          {isWorkspace ? (
            <>
              <WorkspaceSnapshot context={workspaceContext} />
              <WorkspaceCrmSnapshot context={workspaceContext} />
            </>
          ) : publicContext ? (
            <PublicSnapshot context={publicContext} />
          ) : null}
        </div>
      </Section>

      <Section
        eyebrow="Workspace map"
        title="What each area is for"
        description="Use the same operating map whether you are evaluating the product publicly or already working inside a founder workspace."
        className="scroll-mt-28"
      >
        <div id="workspace-map" className="grid gap-5 xl:grid-cols-2">
          {HELP_AREAS.map((area) => (
            <AreaCard key={area.title} area={area} mode={mode} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Workflow map"
        title="How MicroSaaS Factory behaves end to end"
        description="The product is intentionally sequential: keep entry, workspace activation, product evidence, connected operations, and launch readiness in the same rhythm."
        className="scroll-mt-28"
      >
        <div id="workflow-map" className="grid gap-4 lg:grid-cols-3">
          {HELP_WORKFLOW_STEPS.map((step, index) => {
            const href = resolveHref(mode, step.href);

            return (
              <article key={step.label} className="surface-proof rounded-[1.45rem] p-5 shadow-lg shadow-black/10">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Step {index + 1}
                  </p>
                  {index === 0 ? <HelpBadge tone="cyan">Start</HelpBadge> : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{step.label}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{step.detail}</p>
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

      <Section
        eyebrow={isWorkspace ? "Workspace lanes" : "Launch posture"}
        title={isWorkspace ? "Current product lanes in this workspace" : "Current readiness signals on the public path"}
        description={
          isWorkspace
            ? "Use this map to move from Help directly into the lane that needs founder attention."
            : "Public Help explains the same readiness language founders will see on pricing, signup, and recovery surfaces."
        }
      >
        {isWorkspace ? (
          <WorkspaceProductMap context={workspaceContext} />
        ) : publicContext ? (
          <PublicReadinessMap context={publicContext} />
        ) : null}
      </Section>

      <Section
        eyebrow="Status and analysis notes"
        title="What the processing and readiness states mean"
        description="These labels are operational signals. They help a founder decide the next action without treating missing buttons, pending analysis, or provider errors as mystery states."
        className="scroll-mt-28"
      >
        <div id="status-meanings" className="grid gap-5 xl:grid-cols-2">
          {HELP_STATUS_GROUPS.map((group) => (
            <article key={group.title} className="surface-proof rounded-[1.55rem] p-5 shadow-lg shadow-black/10">
              <h3 className="text-xl font-semibold text-white">{group.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{group.detail}</p>
              <div className="mt-5 space-y-3">
                {group.items.map((item) => (
                  <div key={item.label} className="rounded-[1.15rem] border border-white/10 bg-slate-950/45 p-4">
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Troubleshooting"
        title="Common issues and the fastest recovery path"
        description="Use the recovery path that preserves workspace identity, launch proof, and the existing operating record."
        className="scroll-mt-28"
      >
        <div id="troubleshooting" className="grid gap-4 lg:grid-cols-2">
          {HELP_TROUBLESHOOTING.map((item) => (
            <article key={item.symptom} className="surface-proof rounded-[1.45rem] p-5 shadow-lg shadow-black/10">
              <p className="text-lg font-semibold text-white">{item.symptom}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.recovery}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="FAQ"
        title="Help Center questions founders should not have to guess at"
        description="Help is meant to shorten the path to the right workspace surface without changing data or creating a support workflow."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {HELP_FAQ.map((item) => (
            <details key={item.question} className="surface-proof rounded-[1.45rem] p-5 shadow-lg shadow-black/10">
              <summary className="pr-8 text-lg font-semibold text-white">
                {item.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-slate-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>
    </div>
  );
}
