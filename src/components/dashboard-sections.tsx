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

function ReadinessListCard({
  eyebrow,
  title,
  items,
  tone = "default",
}: {
  eyebrow: string;
  items: string[];
  title: string;
  tone?: "default" | "cyan";
}) {
  const toneClasses =
    tone === "cyan"
      ? "border-cyan-300/20 bg-cyan-400/10"
      : "border-white/10 bg-white/5";

  return (
    <div className={`surface-data rounded-[1.55rem] border p-5 ${toneClasses}`}>
      <p className="eyebrow text-slate-400">{eyebrow}</p>
      <p className="mt-3 text-lg font-semibold text-white">{title}</p>
      {items.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-4 text-sm leading-7 text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-slate-300">Nothing is outstanding here.</p>
      )}
    </div>
  );
}

function ProductStatusChip({
  children,
}: {
  children: React.ReactNode;
}) {
  return <span className="metric-chip">{children}</span>;
}

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
        <div className="rounded-[1.55rem] border border-emerald-400/25 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          Checkout completed. Stripe webhook processing will upgrade the workspace subscription as soon as the platform event is received.
        </div>
      ) : null}
      {billing === "error" ? (
        <div className="rounded-[1.55rem] border border-rose-400/25 bg-rose-500/10 p-5 text-sm text-rose-100">
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
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="surface-proof rounded-[1.8rem] p-6 shadow-lg shadow-black/10">
          <p className="eyebrow text-cyan-300/80">{viewModel.controlTower.title}</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            What matters in the workspace right now.
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            {viewModel.controlTower.detail}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ProductStatusChip>plan {dashboard.platformSubscription?.status ?? "beta"}</ProductStatusChip>
            <ProductStatusChip>
              checkout {dashboard.featureFlags.checkoutEnabled ? "visible" : "controlled"}
            </ProductStatusChip>
            <ProductStatusChip>
              AI {dashboard.featureFlags.proAiEnabled ? "flash + pro" : "flash"}
            </ProductStatusChip>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-cyan-300/20 bg-cyan-400/10 p-5">
            <p className="eyebrow text-cyan-100">Next founder move</p>
            <p className="mt-3 text-sm leading-7 text-cyan-50">{viewModel.controlTower.nextAction}</p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {viewModel.controlTower.focusItems.map((item) => (
              <div
                key={item}
                className="surface-data rounded-[1.3rem] border px-4 py-4 text-sm leading-7 text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Active products"
            value={String(viewModel.activeProductCount)}
            detail="Lanes currently counted in the operating portfolio"
            tone="accent"
          />
          <StatCard
            label="Archived"
            value={String(viewModel.archivedProductCount)}
            detail="Lanes hidden from active rollups by default"
          />
          <StatCard
            label="Passed gates"
            value={`${viewModel.passedGates}/${viewModel.activeProductCount || 0}`}
            detail="Products currently passing the launch gate"
            tone="success"
          />
          <StatCard
            label="Ready for next"
            value={`${viewModel.readyProducts}/${viewModel.activeProductCount || 0}`}
            detail="Products meeting the maintenance-mode bar"
            tone="warning"
          />
        </div>
      </div>
    </Section>
  );
}

export function DashboardBillingSection({
  viewModel,
}: {
  viewModel: DashboardPageViewModel;
}) {
  return (
    <Section
      eyebrow="Billing"
      title="Workspace plan and upgrade path"
      description="The founder workspace should see the same commercial story as the public pricing surface: what is available now, what is staged, and what still depends on readiness."
    >
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-4">
          <div className="surface-proof rounded-[1.7rem] p-6 shadow-lg shadow-black/10">
            <p className="eyebrow text-slate-400">Current status</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {viewModel.subscription?.status ?? "beta"}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {viewModel.billingGuidance.detail}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              {viewModel.billingGuidance.nextStep}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/pricing" className="button-secondary">
                Open pricing
              </Link>
            </div>
          </div>

          <ReadinessListCard
            eyebrow="Workspace launch guidance"
            title={viewModel.billingReadiness.summary}
            items={viewModel.billingReadiness.workspaceItems}
            tone="cyan"
          />
          <ReadinessListCard
            eyebrow="External verification"
            title="These checks stay outside the repo even when the code is ready."
            items={viewModel.billingReadiness.externalChecks}
          />
        </div>

        <div className="space-y-4">
          <div className="surface-proof rounded-[1.7rem] p-5 shadow-lg shadow-black/10">
            <p className="eyebrow text-slate-400">{viewModel.publicFunnel.summary.eyebrow}</p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-white">
              {viewModel.publicFunnel.summary.title}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {viewModel.publicFunnel.summary.detail}
            </p>
          </div>

          <div className="surface-action rounded-[1.7rem] p-5 shadow-lg shadow-black/10">
            <p className="eyebrow text-cyan-100">{viewModel.billingGuidance.operatorCard.eyebrow}</p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-white">
              {viewModel.billingGuidance.operatorCard.title}
            </p>
            <p className="mt-3 text-sm leading-7 text-cyan-50">
              {viewModel.billingGuidance.operatorCard.detail}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {viewModel.pricingData.plans.length > 0 ? (
              viewModel.pricingData.plans.map((plan) => (
                <div key={plan.id} className="surface-proof rounded-[1.55rem] p-5 shadow-lg shadow-black/10">
                  <p className="eyebrow text-slate-500">{plan.name}</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {formatCurrency(plan.monthlyPrice)} / {formatCurrency(plan.annualPrice)}
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
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
                            ? "Founder beta"
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
      eyebrow="Factory mode"
      title="Readiness to open the next product lane"
      description="The factory model only compounds when existing products are stable enough to stop consuming founder attention."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Portfolio MRR"
          value={formatCurrency(viewModel.totalMrr)}
          detail="Latest synced or manually entered recurring revenue"
          tone="accent"
        />
        <StatCard
          label="Passed gates"
          value={`${viewModel.passedGates}/${viewModel.activeProductCount || 0}`}
          detail="Products that have passed the current launch gate"
          tone="success"
        />
        <StatCard
          label="Ready for next"
          value={`${viewModel.readyProducts}/${viewModel.activeProductCount || 0}`}
          detail="Products meeting the maintenance-mode criteria"
          tone="warning"
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
      title="Cross-product validation inbox"
      description="Lightweight cross-product CRM rollups keep transcript analysis and follow-up debt visible from the dashboard."
      actions={
        <Link href="/app/crm" className="button-secondary">
          Open workspace CRM
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-proof rounded-[1.6rem] p-5 shadow-lg shadow-black/10">
          <p className="eyebrow text-cyan-300/80">CRM focus</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Keep follow-up debt visible before it turns into guesswork.
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Use the workspace CRM to see what needs action today, where conversations are slipping,
            and which transcripts still need analysis before the next founder decision.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Due today"
            value={String(dashboard.crmSummary.dueTodayCount)}
            detail="Tasks ready for founder action"
          />
          <StatCard
            label="Overdue"
            value={String(dashboard.crmSummary.overdueCount)}
            detail="Past-due validation work"
            tone="warning"
          />
          <StatCard
            label="Snoozed"
            value={String(dashboard.crmSummary.snoozedCount)}
            detail="Deferred follow-ups"
          />
          <StatCard
            label="Pending analysis"
            value={String(dashboard.crmSummary.pendingAnalysisCount)}
            detail="Queued or failed transcript analysis jobs"
            tone="accent"
          />
        </div>
      </div>
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
      eyebrow="Create product"
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
    <article className="surface-proof rounded-[1.8rem] p-6 shadow-lg shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/app/products/${product.id}`} className="text-2xl font-semibold tracking-tight text-white">
              {product.name}
            </Link>
            <ProductTemplateBadge template={template} />
            {archived ? (
              <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100">
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

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={archived ? `/app/products/${product.id}` : `/app/products/${product.id}#product-settings`}
              className="button-secondary"
            >
              Open lane
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="MRR"
            value={formatCurrency(
              latestRevenue?.monthlyRecurringRevenue ??
                product.metrics.monthlyRecurringRevenue,
            )}
          />
          <StatCard label="Deploy" value={latestDeployment ? "Connected" : "Pending"} />
          <StatCard
            label="Churn"
            value={`${product.metrics.monthlyChurnRate.toFixed(1)}%`}
          />
          <StatCard
            label={archived ? "Integrations" : "Factory"}
            value={archived ? String(connectedIntegrationsCount) : readyForNextProduct ? "Ready" : `${connectedIntegrationsCount}/4`}
          />
        </div>
      </div>

      <div className="mt-6">
        <StageRail stage={product.stage} />
      </div>
    </article>
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
      eyebrow={archived ? "Archived products" : "Active products"}
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
