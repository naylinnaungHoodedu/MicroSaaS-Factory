import Link from "next/link";

import { Section, StatCard, StatusPill } from "@/components/ui";
import { BETA_PLATFORM_PLAN_ID } from "@/lib/constants";
import {
  adminLoginAction,
  createInviteAction,
  createInviteFromSignupIntentAction,
  deletePlatformPlanAction,
  runLiveOpsAutomationAction,
  runValidationCrmAutomationAction,
  savePlatformPlanAction,
  updateFeatureFlagsAction,
} from "@/lib/server/actions";
import type { AdminPageViewModel } from "@/lib/server/admin-view-model";
import type { getAdminOverview } from "@/lib/server/services";
import type { AutomationRun } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;

function mapAutomationStatusToPill(status?: AutomationRun["status"] | null) {
  if (!status) {
    return "pending";
  }

  if (status === "success") {
    return "success";
  }

  if (status === "failed") {
    return "error";
  }

  return "warning";
}

function mapReadinessStatusToPill(status: "ready" | "warning" | "blocked") {
  if (status === "ready") {
    return "connected";
  }

  if (status === "blocked") {
    return "error";
  }

  return "warning";
}

function mapGoLiveStatusToPill(status: "ready" | "attention" | "manual") {
  if (status === "ready") {
    return "connected";
  }

  return status === "attention" ? "error" : "warning";
}

function formatAutomationMetricLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function selectAutomationMetrics(metrics: Record<string, number>, limit = 4) {
  const entries = Object.entries(metrics);
  const prioritized = entries.filter(([, value]) => value > 0);
  return (prioritized.length > 0 ? prioritized : entries).slice(0, limit);
}

export function AdminLoginGate({
  error,
}: {
  error?: string;
}) {
  return (
    <main className="page-shell py-10">
      <Section
        eyebrow="Internal Admin"
        title="Operator access required."
        description="Enter the admin access key to issue invites and flip feature flags for the invite beta."
      >
        {error === "invalid" ? (
          <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            Admin secret was rejected.
          </div>
        ) : null}
        {error === "misconfigured" ? (
          <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            `ADMIN_ACCESS_KEY` is not configured for this environment.
          </div>
        ) : null}
        <form
          action={adminLoginAction}
          className="max-w-xl space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-6"
        >
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Admin secret</span>
            <input name="secret" type="password" required placeholder="Admin access key" />
          </label>
          <button type="submit" className="button-primary">
            Enter admin console
          </button>
        </form>
      </Section>
    </main>
  );
}

export function AdminConsoleSection({
  overview,
  viewModel,
  error,
  reason,
}: {
  error?: string;
  overview: AdminOverview;
  reason?: string;
  viewModel: AdminPageViewModel;
}) {
  return (
    <Section
      eyebrow="Admin Console"
      title="Issue invites and control beta exposure."
      description="Invite onboarding, public signup, self-serve provisioning, and checkout visibility are all controlled independently from this console."
    >
      {error === "flags_invalid" && reason ? (
        <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
          Feature flags were not saved: {reason}
        </div>
      ) : null}
      <div className="mb-8 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Persistence backend
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {overview.storage.backend === "firestore" ? "Firestore" : "Local JSON"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {overview.storage.backend === "firestore"
                ? `Project ${overview.storage.projectId} / Database ${overview.storage.databaseId} / Collection ${overview.storage.collectionName}`
                : `File ${overview.storage.dataFile}`}
            </p>
            <div className="mt-4">
              <StatusPill
                status={overview.storage.backend === "firestore" ? "connected" : "warning"}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Founder auth
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {overview.auth.firebaseEnabled ? "Invite beta + Firebase" : "Invite token only"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {overview.auth.firebaseEnabled
                ? `Firebase project ${overview.auth.firebaseProjectId ?? "configured"} is active for founder sign-in${overview.auth.firebaseTestMode ? " (test mode)." : "."}`
                : "Firebase sign-in is not fully configured, so founder login uses invite email plus token."}
            </p>
            <div className="mt-4">
              <StatusPill status={overview.auth.firebaseEnabled ? "connected" : "warning"} />
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Public funnel
            </p>
            <p className="mt-2 text-xl font-semibold text-white">{viewModel.funnel.summary.title}</p>
            <p className="mt-2 text-sm leading-7 text-cyan-100">
              {viewModel.funnel.summary.detail}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-cyan-100">
              <span className="rounded-full border border-cyan-300/25 px-3 py-1">
                {viewModel.funnel.availabilityMode.replaceAll("_", " ")}
              </span>
              <span className="rounded-full border border-cyan-300/25 px-3 py-1">
                pricing {viewModel.funnel.pricingVisible ? "visible" : "hidden"}
              </span>
              <span className="rounded-full border border-cyan-300/25 px-3 py-1">
                checkout {viewModel.funnel.checkoutVisible ? "visible" : "hidden"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {overview.readiness.checks.map((check) => (
            <div key={check.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {check.label}
                </p>
                <StatusPill status={mapReadinessStatusToPill(check.status)} />
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{check.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Launch readiness
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                The same runtime model now drives the external health probe and the operator
                readiness checks used before public self-serve flips.
              </p>
            </div>
            <Link href="/api/healthz" className="text-sm text-cyan-200 underline underline-offset-4">
              Open /api/healthz
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-200">
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2">
              public plans {overview.readiness.publicPlans.length}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2">
              pricing {overview.readiness.pricingReady ? "ready" : "not ready"}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2">
              signup intent {overview.readiness.signupIntentReady ? "ready" : "not ready"}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2">
              checkout prep {overview.readiness.checkoutReady ? "ready" : "not ready"}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2">
              self-serve {overview.readiness.selfServeReady ? "ready" : "not ready"}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2">
              automation {overview.readiness.automationReady ? "ready" : "not ready"}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-400/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Go-live checklist
              </p>
              <p className="mt-2 text-sm leading-7 text-cyan-100">
                This panel combines code-derived readiness with the manual public-edge and DNS
                confirmations required before the final self-serve launch flips.
              </p>
            </div>
            <Link href="/privacy" className="text-sm text-cyan-100 underline underline-offset-4">
              Open legal pages
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {viewModel.goLiveChecklist.map((item) => (
              <div key={item.id} className="rounded-2xl border border-cyan-300/20 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                    {item.label}
                  </p>
                  <StatusPill status={mapGoLiveStatusToPill(item.status)} />
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-200">{item.detail}</p>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-4 inline-flex text-sm text-cyan-200 underline underline-offset-4"
                  >
                    Open {item.href}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          action={createInviteAction}
          className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Issue invite</h3>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Founder email</span>
            <input name="email" type="email" required placeholder="founder@company.com" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Workspace name</span>
            <input name="workspaceName" required placeholder="Factory Lab" />
          </label>
          <button type="submit" className="button-primary">
            Create invite
          </button>
        </form>

        <form
          action={updateFeatureFlagsAction}
          className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Feature flags</h3>
          {[
            ["publicSignupEnabled", "Public signup"],
            ["selfServeProvisioningEnabled", "Self-serve provisioning"],
            ["checkoutEnabled", "Platform checkout"],
            ["platformBillingEnabled", "Platform billing visibility"],
            ["proAiEnabled", "Gemini Pro generation"],
          ].map(([name, label]) => (
            <label
              key={name}
              className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200"
            >
              <input
                name={name}
                type="checkbox"
                defaultChecked={Boolean(overview.flags[name as keyof typeof overview.flags])}
                className="h-4 w-4"
              />
              <span>{label}</span>
            </label>
          ))}
          <button type="submit" className="button-primary">
            Save feature flags
          </button>
        </form>
      </div>
    </Section>
  );
}

export function AdminPlansSection({
  overview,
  error,
  reason,
}: {
  error?: string;
  overview: AdminOverview;
  reason?: string;
}) {
  return (
    <Section
      eyebrow="Platform Plans"
      title="Manage the self-serve pricing surface."
      description="These plan IDs are the contract with STRIPE_PLATFORM_PRICE_MAP_JSON. Public pricing, signup, and checkout readiness all depend on this plan catalog."
    >
      {error === "plan_invalid" && reason ? (
        <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
          Platform plan change failed: {reason}
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
        <form
          action={savePlatformPlanAction}
          className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-6"
        >
          <h3 className="text-lg font-semibold text-white">Create plan</h3>
          <p className="text-sm leading-7 text-slate-300">
            Plan IDs must match Stripe price-map keys exactly. Use lowercase slugs such as{" "}
            <span className="font-mono text-cyan-200">growth</span> or{" "}
            <span className="font-mono text-cyan-200">scale</span>.
          </p>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Plan ID</span>
            <input name="id" required placeholder="growth" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Name</span>
            <input name="name" required placeholder="Growth" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Monthly price</span>
              <input name="monthlyPrice" type="number" min="0" step="1" required defaultValue={99} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Annual price</span>
              <input name="annualPrice" type="number" min="0" step="1" required defaultValue={990} />
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Features</span>
            <textarea
              name="featuresText"
              rows={6}
              required
              placeholder={"Single-founder workspace\nGitHub + GCP + Stripe + Resend connections\nLaunch gate and portfolio views"}
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
            <input name="hidden" type="checkbox" className="h-4 w-4" />
            <span>Create as hidden until the public rollout is ready</span>
          </label>
          <button type="submit" className="button-primary">
            Save new plan
          </button>
        </form>

        <div className="space-y-6">
          {overview.platformPlans.map((plan) => (
            <div key={plan.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                    <StatusPill status={plan.hidden ? "pending" : "connected"} />
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-400">{plan.id}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {plan.hidden
                      ? "Hidden from public pricing and signup."
                      : "Visible on pricing and eligible for public signup or checkout when flags allow it."}
                  </p>
                </div>
                <form action={deletePlatformPlanAction.bind(null, plan.id)}>
                  <button
                    type="submit"
                    className="button-secondary"
                    disabled={plan.id === BETA_PLATFORM_PLAN_ID}
                    title={
                      plan.id === BETA_PLATFORM_PLAN_ID
                        ? "The invite-beta seed plan is protected."
                        : undefined
                    }
                  >
                    Delete plan
                  </button>
                </form>
              </div>

              <form action={savePlatformPlanAction} className="mt-6 space-y-5">
                <input type="hidden" name="existingPlanId" value={plan.id} />
                <input type="hidden" name="id" value={plan.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Name</span>
                    <input name="name" required defaultValue={plan.name} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Plan ID</span>
                    <input value={plan.id} readOnly aria-readonly className="font-mono text-slate-400" />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Monthly price</span>
                    <input
                      name="monthlyPrice"
                      type="number"
                      min="0"
                      step="1"
                      required
                      defaultValue={plan.monthlyPrice}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Annual price</span>
                    <input
                      name="annualPrice"
                      type="number"
                      min="0"
                      step="1"
                      required
                      defaultValue={plan.annualPrice}
                    />
                  </label>
                </div>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Features</span>
                  <textarea
                    name="featuresText"
                    rows={5}
                    required
                    defaultValue={plan.features.join("\n")}
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                  <input
                    name="hidden"
                    type="checkbox"
                    defaultChecked={plan.hidden}
                    className="h-4 w-4"
                  />
                  <span>Hide this plan from public pricing and signup</span>
                </label>
                <button type="submit" className="button-primary">
                  Save plan changes
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function AdminAutomationSection({
  overview,
  viewModel,
}: {
  overview: AdminOverview;
  viewModel: AdminPageViewModel;
}) {
  return (
    <Section
      eyebrow="Automation"
      title="Platform sweeps and current operating pressure"
      description="The internal job routes already exist. This console turns them into an operator-facing workflow with persistent run history and platform-wide visibility."
    >
      <div className="grid gap-4 md:grid-cols-6">
        <StatCard
          label="Workspaces"
          value={String(overview.totals.workspaceCount)}
          detail="Provisioned founder environments"
        />
        <StatCard
          label="Founders"
          value={String(overview.totals.founderCount)}
          detail="Known founder identities"
        />
        <StatCard
          label="Products"
          value={String(overview.totals.productCount)}
          detail="Active product lanes"
        />
        <StatCard
          label="Pending Analysis"
          value={String(overview.automation.crmSummary.pendingAnalysisCount)}
          detail="Queued or failed transcripts"
        />
        <StatCard
          label="Ops Attention"
          value={String(overview.automation.productsNeedingOpsAttention)}
          detail={`${overview.totals.connectedIntegrationCount} integrations currently connected`}
        />
        <StatCard
          label="Run Alerts"
          value={String(overview.automation.attentionRunCount)}
          detail={
            overview.automation.latestProblemRun
              ? `Latest ${overview.automation.latestProblemRun.status} run: ${overview.automation.latestProblemRun.kind}`
              : "No failed or partial runs recorded"
          }
        />
      </div>

      {overview.automation.latestProblemRun ? (
        <div className="mt-8 rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 p-5 text-sm text-amber-100">
          Latest automation attention item:{" "}
          <strong>{overview.automation.latestProblemRun.summary}</strong>
          {overview.automation.latestProblemRun.error
            ? ` ${overview.automation.latestProblemRun.error}`
            : ""}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Scheduled automation
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {overview.automation.internalKeyConfigured
                  ? "External trigger configured"
                  : "Manual-only mode"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {overview.automation.internalKeyConfigured
                  ? "`INTERNAL_AUTOMATION_KEY` is present, so secured cron or scheduler traffic can hit the internal automation routes."
                  : "The manual actions below work, but `INTERNAL_AUTOMATION_KEY` is missing so the secured internal job routes are not externally triggerable yet."}
              </p>
            </div>
            <StatusPill
              status={overview.automation.internalKeyConfigured ? "connected" : "warning"}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">CRM pressure</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {overview.automation.crmSummary.dueTodayCount} due today /{" "}
                {overview.automation.crmSummary.overdueCount} overdue /{" "}
                {overview.automation.crmSummary.snoozedCount} snoozed.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Manual controls</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Use the manual sweeps when an operator wants immediate state convergence before a founder review.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {viewModel.latestRuns.map((entry) => (
            <div key={entry.key} className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {entry.label}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {entry.run?.summary ?? "No run recorded yet"}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{entry.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={mapAutomationStatusToPill(entry.run?.status)} />
                  <form
                    action={
                      entry.key === "live-ops"
                        ? runLiveOpsAutomationAction
                        : runValidationCrmAutomationAction
                    }
                  >
                    <button type="submit" className="button-primary">
                      {entry.actionLabel}
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {selectAutomationMetrics(entry.run?.metrics ?? {}).length > 0 ? (
                  selectAutomationMetrics(entry.run?.metrics ?? {}).map(([label, value]) => (
                    <div
                      key={`${entry.key}-${label}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {formatAutomationMetricLabel(label)}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/30 p-4 text-sm text-slate-400 md:col-span-4">
                    No persisted metrics yet for this automation lane.
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-400">
                <p>Started {formatDateTime(entry.run?.startedAt)}</p>
                <p>Finished {formatDateTime(entry.run?.finishedAt)}</p>
                {entry.run?.error ? <p className="text-rose-200">{entry.run.error}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Recent runs
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">Automation history</h3>
        <p className="mt-2 text-sm text-slate-300">
          Latest CRM and live-ops executions, persisted directly in the platform state.
        </p>

        <div className="mt-6 space-y-4">
          {overview.automation.recentRuns.length > 0 ? (
            overview.automation.recentRuns.map((run) => (
              <div key={run.id} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-white">
                        {run.kind === "live-ops" ? "Unified live ops" : "Validation CRM"}
                      </p>
                      <StatusPill status={mapAutomationStatusToPill(run.status)} />
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{run.summary}</p>
                  </div>
                  <div className="space-y-2 text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                    <p>Started {formatDateTime(run.startedAt)}</p>
                    <p>Finished {formatDateTime(run.finishedAt)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {Object.entries(run.metrics).map(([label, value]) => (
                    <span
                      key={`${run.id}-${label}`}
                      className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-300"
                    >
                      {formatAutomationMetricLabel(label)}: {value}
                    </span>
                  ))}
                </div>

                {run.error ? <p className="mt-4 text-sm text-rose-200">{run.error}</p> : null}
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-white/15 bg-slate-950/30 p-6 text-sm text-slate-400">
              No automation runs have been persisted yet.
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

export function AdminQueuesSection({
  overview,
  viewModel,
}: {
  overview: AdminOverview;
  viewModel: AdminPageViewModel;
}) {
  return (
    <>
      <Section eyebrow="Invites" title="Issued access tokens">
        <div className="space-y-4">
          {overview.invites.map((invite) => (
            <div key={invite.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{invite.workspaceName}</p>
                  <p>{invite.email}</p>
                  <p className="font-mono text-xs text-slate-400">{invite.token}</p>
                </div>
                <div className="space-y-2 text-right">
                  <StatusPill status={invite.acceptedAt ? "connected" : "pending"} />
                  <p className="text-xs text-slate-400">Created {formatDate(invite.createdAt)}</p>
                </div>
              </div>
              <Link href={`/invite/${invite.token}`} className="mt-4 inline-flex text-sm text-cyan-200 underline underline-offset-4">
                Open invite URL
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Signup Intents" title="Flag-gated self-serve queue">
        <div className="space-y-4">
          {overview.signupIntents.length > 0 ? (
            overview.signupIntents.map((intent) => (
              <div key={intent.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{intent.workspaceName}</p>
                    <p>{intent.email}</p>
                    <p className="mt-2 text-slate-400">
                      Plan: {viewModel.plansById.get(intent.planId)?.name ?? intent.planId}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Requested {formatDate(intent.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill
                      status={
                        intent.status === "pending_activation"
                          ? "pending"
                          : intent.status === "provisioned"
                            ? "connected"
                            : "warning"
                      }
                    />
                    {intent.status === "pending_activation" ? (
                      <form action={createInviteFromSignupIntentAction.bind(null, intent.id)}>
                        <button type="submit" className="button-primary">
                          Issue invite
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/15 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
              No signup intents recorded yet.
            </div>
          )}
        </div>
      </Section>

      <Section eyebrow="Waitlist" title="Pending founder requests">
        <div className="space-y-4">
          {overview.waitlist.map((request) => (
            <div key={request.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5 text-sm text-slate-300">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{request.name}</p>
                  <p>{request.email}</p>
                  <p className="mt-3 max-w-3xl">{request.challenge}</p>
                </div>
                <StatusPill status={request.status === "invited" ? "connected" : "pending"} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
