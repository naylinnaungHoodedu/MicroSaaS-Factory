import Link from "next/link";

import { ActivityFeed } from "@/components/activity-feed";
import { ProductTemplateComposer } from "@/components/product-template-composer";
import { ProductTemplateBadge } from "@/components/template-guidance";
import { EmptyState, Section, StageRail, StatCard, StatusPill } from "@/components/ui";
import {
  archiveProductAction,
  cloneProductAction,
  restoreProductAction,
  startPlatformCheckoutAction,
} from "@/lib/server/actions";
import type { DashboardPageViewModel } from "@/lib/server/dashboard-view-model";
import type { getWorkspaceDashboard } from "@/lib/server/services";
import { formatCurrency, formatDate } from "@/lib/utils";

type WorkspaceDashboard = Awaited<ReturnType<typeof getWorkspaceDashboard>>;

export function DashboardAlerts({
  billing,
  reason,
}: {
  billing?: string;
  reason?: string;
}) {
  return (
    <>
      {billing === "success" ? (
        <div className="rounded-[1.5rem] border border-emerald-400/25 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          Checkout completed. Stripe webhook processing will upgrade the workspace subscription as soon as the platform event is received.
        </div>
      ) : null}
      {billing === "error" ? (
        <div className="rounded-[1.5rem] border border-rose-400/25 bg-rose-500/10 p-5 text-sm text-rose-100">
          {reason ?? "Checkout could not be started from the founder workspace."}
        </div>
      ) : null}
    </>
  );
}

export function DashboardPortfolioSection({
  dashboard,
  viewModel,
}: {
  dashboard: WorkspaceDashboard;
  viewModel: DashboardPageViewModel;
}) {
  return (
    <Section
      eyebrow="Portfolio"
      title="Founder control tower"
      description="Track every product from idea capture to launch gate, with deployment, billing, and onboarding readiness in one place."
    >
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard
          label="Active Products"
          value={String(viewModel.activeProductCount)}
          detail="Lanes currently counted in the operating portfolio"
        />
        <StatCard
          label="Archived"
          value={String(viewModel.archivedProductCount)}
          detail="Lanes hidden from active rollups by default"
        />
        <StatCard
          label="Checkout"
          value={dashboard.featureFlags.checkoutEnabled ? "On" : "Hidden"}
          detail="Platform billing remains internal until enabled"
        />
        <StatCard
          label="AI Mode"
          value={dashboard.featureFlags.proAiEnabled ? "Flash + Pro" : "Flash only"}
          detail="Platform generation defaults to Gemini Flash"
        />
        <StatCard
          label="Plan"
          value={dashboard.platformSubscription?.status ?? "beta"}
          detail="Current workspace billing state"
        />
      </div>
    </Section>
  );
}

export function DashboardBillingSection({
  dashboard,
  viewModel,
}: {
  dashboard: WorkspaceDashboard;
  viewModel: DashboardPageViewModel;
}) {
  return (
    <Section
      eyebrow="Billing"
      title="Workspace plan and upgrade path"
      description="Trial workspaces can move into paid mode from here once platform billing and Stripe Checkout are enabled."
    >
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Current status</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {viewModel.subscription?.status ?? "beta"}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {viewModel.subscription?.status === "active"
              ? "This workspace already has an active paid platform subscription."
              : viewModel.subscription?.status === "beta"
                ? "Invite-beta workspaces remain on operator-managed access until they move out of beta."
                : dashboard.featureFlags.checkoutEnabled
                  ? "This workspace can open Stripe Checkout directly from the buttons on this page."
                  : "Platform billing is still hidden for this environment, so self-serve checkout is not yet available."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/pricing" className="button-secondary">
              Open pricing
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {viewModel.pricingData.plans.length > 0 ? (
            viewModel.pricingData.plans.map((plan) => (
              <div key={plan.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{plan.name}</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {formatCurrency(plan.monthlyPrice)} / {formatCurrency(plan.annualPrice)}
                </p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  {plan.features.map((feature) => (
                    <p key={feature}>{feature}</p>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {viewModel.canStartCheckout ? (
                    <>
                      <form action={startPlatformCheckoutAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="billingInterval" value="monthly" />
                        <input type="hidden" name="returnPath" value="/app" />
                        <button type="submit" className="button-primary">
                          Monthly checkout
                        </button>
                      </form>
                      <form action={startPlatformCheckoutAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="billingInterval" value="annual" />
                        <input type="hidden" name="returnPath" value="/app" />
                        <button type="submit" className="button-secondary">
                          Annual checkout
                        </button>
                      </form>
                    </>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-slate-300">
                      {viewModel.subscription?.status === "active"
                        ? "Already active"
                        : viewModel.subscription?.status === "beta"
                          ? "Beta access"
                          : "Checkout not available"}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/30 p-6 text-sm text-slate-400 md:col-span-2">
              No public pricing plans are visible in this environment yet.
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

export function DashboardFactoryModeSection({
  viewModel,
}: {
  viewModel: DashboardPageViewModel;
}) {
  return (
    <Section
      eyebrow="Factory Mode"
      title="Readiness to open the next product lane"
      description="The factory model only compounds when existing products are stable enough to stop consuming founder attention."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Portfolio MRR"
          value={formatCurrency(viewModel.totalMrr)}
          detail="Latest synced or manually entered recurring revenue"
        />
        <StatCard
          label="Passed Gates"
          value={`${viewModel.passedGates}/${viewModel.activeProductCount || 0}`}
          detail="Products that have passed the current launch gate"
        />
        <StatCard
          label="Ready For Next"
          value={`${viewModel.readyProducts}/${viewModel.activeProductCount || 0}`}
          detail="Products meeting the maintenance-mode criteria"
        />
      </div>
    </Section>
  );
}

export function DashboardTimelineSection({
  dashboard,
}: {
  dashboard: WorkspaceDashboard;
}) {
  return (
    <Section
      eyebrow="Timeline"
      title="Recent activity"
      description="A cross-product feed of the most recent founder, AI, and integration activity across the workspace."
    >
      <ActivityFeed
        events={dashboard.recentActivity}
        emptyTitle="No recent activity yet"
        emptyDetail="Open the first product lane, log research, or connect an ops system to start the workspace timeline."
        showProductLink
      />
    </Section>
  );
}

export function DashboardCrmSection({
  dashboard,
}: {
  dashboard: WorkspaceDashboard;
}) {
  return (
    <Section
      eyebrow="CRM"
      title="Founder validation inbox"
      description="Lightweight cross-product CRM rollups keep transcript analysis and follow-up debt visible from the dashboard."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Due Today"
          value={String(dashboard.crmSummary.dueTodayCount)}
          detail="Tasks ready for founder action"
        />
        <StatCard
          label="Overdue"
          value={String(dashboard.crmSummary.overdueCount)}
          detail="Past-due validation work"
        />
        <StatCard
          label="Snoozed"
          value={String(dashboard.crmSummary.snoozedCount)}
          detail="Deferred follow-ups"
        />
        <StatCard
          label="Pending Analysis"
          value={String(dashboard.crmSummary.pendingAnalysisCount)}
          detail="Queued or failed transcript analysis jobs"
        />
      </div>
      <Link
        href="/app/crm"
        className="mt-6 inline-flex text-sm text-cyan-200 underline underline-offset-4"
      >
        Open workspace CRM
      </Link>
    </Section>
  );
}

export function DashboardCreateProductSection({
  dashboard,
}: {
  dashboard: WorkspaceDashboard;
}) {
  return (
    <Section
      eyebrow="Create Product"
      title="Open a new factory lane"
      description="Each product gets its own research, validation, spec, ops, and launch gate workflow."
    >
      <ProductTemplateComposer templates={dashboard.availableTemplates} />
    </Section>
  );
}

function ProductLaneCard({
  entry,
  archived,
}: {
  archived?: boolean;
  entry: WorkspaceDashboard["products"][number] | WorkspaceDashboard["archivedProducts"][number];
}) {
  const {
    product,
    template,
    latestGate,
    latestRevenue,
    latestDeployment,
    connectedIntegrationsCount,
    readyForNextProduct,
  } = entry;

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/app/products/${product.id}`} className="text-2xl font-semibold text-white">
              {product.name}
            </Link>
            <ProductTemplateBadge template={template} />
            {archived ? (
              <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                archived
              </span>
            ) : null}
            <StatusPill status={latestGate?.passed ? "connected" : "pending"} />
          </div>
          <p className="max-w-3xl text-sm leading-7 text-slate-300">{product.summary}</p>
          <p className="text-sm text-slate-400">
            {archived
              ? `Archived ${formatDate(product.archivedAt ?? product.updatedAt)}${product.archivedReason ? ` / ${product.archivedReason}` : ""} / updated ${formatDate(product.updatedAt)}`
              : `${product.vertical} / ${product.pricingHypothesis} / updated ${formatDate(product.updatedAt)}`}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={archived ? `/app/products/${product.id}` : `/app/products/${product.id}#product-settings`}
              className="button-secondary"
            >
              Edit
            </Link>
            {archived ? (
              <form action={restoreProductAction.bind(null, product.id)}>
                <button type="submit" className="button-secondary">
                  Restore
                </button>
              </form>
            ) : (
              <form action={archiveProductAction.bind(null, product.id)}>
                <input type="hidden" name="archivedReason" value="" />
                <button type="submit" className="button-secondary">
                  Archive
                </button>
              </form>
            )}
            <form action={cloneProductAction.bind(null, product.id)}>
              <button type="submit" className="button-secondary">
                Clone
              </button>
            </form>
          </div>
        </div>
        <div className="grid gap-3 text-right sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">MRR</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatCurrency(
                latestRevenue?.monthlyRecurringRevenue ??
                  product.metrics.monthlyRecurringRevenue,
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Deploy</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {latestDeployment ? "Connected" : "Pending"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Churn</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {product.metrics.monthlyChurnRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              {archived ? "Integrations" : "Factory"}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {archived ? connectedIntegrationsCount : readyForNextProduct ? "Ready" : `${connectedIntegrationsCount}/4`}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <StageRail stage={product.stage} />
      </div>
    </div>
  );
}

export function DashboardProductsSection({
  archived = false,
  dashboard,
}: {
  archived?: boolean;
  dashboard: WorkspaceDashboard;
}) {
  const entries = archived ? dashboard.archivedProducts : dashboard.products;

  return (
    <Section
      eyebrow={archived ? "Archived Products" : "Active Products"}
      title={
        archived
          ? "Archived lanes stay accessible without cluttering active rollups."
          : "Every active product remains accountable to a gate."
      }
    >
      <div className="space-y-5">
        {entries.length === 0 ? (
          <EmptyState
            title={archived ? "No archived products" : "No active products"}
            detail={
              archived
                ? "Archive a lane when you want it out of active metrics without losing the record."
                : "Create a new lane or restore an archived one to return it to the operating portfolio."
            }
          />
        ) : (
          entries.map((entry) => (
            <ProductLaneCard key={entry.product.id} entry={entry} archived={archived} />
          ))
        )}
      </div>
    </Section>
  );
}
