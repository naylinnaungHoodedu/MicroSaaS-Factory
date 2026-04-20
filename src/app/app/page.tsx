import Link from "next/link";

import { ActivityFeed } from "@/components/activity-feed";
import { ProductTemplateComposer } from "@/components/product-template-composer";
import { ProductTemplateBadge } from "@/components/template-guidance";
import { EmptyState, Section, StageRail, StatCard, StatusPill } from "@/components/ui";
import {
  archiveProductAction,
  cloneProductAction,
  restoreProductAction,
} from "@/lib/server/actions";
import { requireFounderContext } from "@/lib/server/auth";
import { getWorkspaceDashboard } from "@/lib/server/services";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const { workspace } = await requireFounderContext();
  const dashboard = await getWorkspaceDashboard(workspace.id);
  const activeProductCount = dashboard.portfolio.activeProductCount;
  const archivedProductCount = dashboard.portfolio.archivedProductCount;
  const totalMrr = dashboard.products.reduce(
    (sum, entry) =>
      sum +
      (entry.latestRevenue?.monthlyRecurringRevenue ?? entry.product.metrics.monthlyRecurringRevenue),
    0,
  );
  const readyProducts = dashboard.products.filter((entry) => entry.readyForNextProduct).length;
  const passedGates = dashboard.products.filter((entry) => entry.latestGate?.passed).length;

  return (
    <div className="space-y-8">
      <Section
        eyebrow="Portfolio"
        title="Founder control tower"
        description="Track every product from idea capture to launch gate, with deployment, billing, and onboarding readiness in one place."
      >
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard
            label="Active Products"
            value={String(activeProductCount)}
            detail="Lanes currently counted in the operating portfolio"
          />
          <StatCard
            label="Archived"
            value={String(archivedProductCount)}
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

      <Section
        eyebrow="Factory Mode"
        title="Readiness to open the next product lane"
        description="The factory model only compounds when existing products are stable enough to stop consuming founder attention."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Portfolio MRR"
            value={formatCurrency(totalMrr)}
            detail="Latest synced or manually entered recurring revenue"
          />
          <StatCard
            label="Passed Gates"
            value={`${passedGates}/${activeProductCount || 0}`}
            detail="Products that have passed the current launch gate"
          />
          <StatCard
            label="Ready For Next"
            value={`${readyProducts}/${activeProductCount || 0}`}
            detail="Products meeting the maintenance-mode criteria"
          />
        </div>
      </Section>

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
        <Link href="/app/crm" className="mt-6 inline-flex text-sm text-cyan-200 underline underline-offset-4">
          Open workspace CRM
        </Link>
      </Section>

      <Section
        eyebrow="Create Product"
        title="Open a new factory lane"
        description="Each product gets its own research, validation, spec, ops, and launch gate workflow."
      >
        <ProductTemplateComposer templates={dashboard.availableTemplates} />
      </Section>

      <Section
        eyebrow="Active Products"
        title="Every active product remains accountable to a gate."
      >
        <div className="space-y-5">
          {dashboard.products.length === 0 ? (
            <EmptyState
              title="No active products"
              detail="Create a new lane or restore an archived one to return it to the operating portfolio."
            />
          ) : (
            dashboard.products.map(
            ({
              product,
              template,
              latestGate,
              latestRevenue,
              latestDeployment,
              connectedIntegrationsCount,
              readyForNextProduct,
            }) => (
              <div key={product.id} className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/app/products/${product.id}`} className="text-2xl font-semibold text-white">
                      {product.name}
                    </Link>
                    <ProductTemplateBadge template={template} />
                    <StatusPill status={latestGate?.passed ? "connected" : "pending"} />
                  </div>
                  <p className="max-w-3xl text-sm leading-7 text-slate-300">{product.summary}</p>
                  <p className="text-sm text-slate-400">
                    {product.vertical} / {product.pricingHypothesis} / updated {formatDate(product.updatedAt)}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      href={`/app/products/${product.id}#product-settings`}
                      className="button-secondary"
                    >
                      Edit
                    </Link>
                    <form action={cloneProductAction.bind(null, product.id)}>
                      <button type="submit" className="button-secondary">
                        Clone
                      </button>
                    </form>
                    <form action={archiveProductAction.bind(null, product.id)}>
                      <input type="hidden" name="archivedReason" value="" />
                      <button type="submit" className="button-secondary">
                        Archive
                      </button>
                    </form>
                  </div>
                </div>
                <div className="grid gap-3 text-right sm:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">MRR</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCurrency(latestRevenue?.monthlyRecurringRevenue ?? product.metrics.monthlyRecurringRevenue)}
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
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Factory</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {readyForNextProduct ? "Ready" : `${connectedIntegrationsCount}/4`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <StageRail stage={product.stage} />
              </div>
            </div>
            ))
          )}
        </div>
      </Section>

      <Section
        eyebrow="Archived Products"
        title="Archived lanes stay accessible without cluttering active rollups."
      >
        <div className="space-y-5">
          {dashboard.archivedProducts.length === 0 ? (
            <EmptyState
              title="No archived products"
              detail="Archive a lane when you want it out of active metrics without losing the record."
            />
          ) : (
            dashboard.archivedProducts.map(
              ({
                product,
                template,
                latestGate,
                latestRevenue,
                latestDeployment,
                connectedIntegrationsCount,
              }) => (
                <div
                  key={product.id}
                  className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/app/products/${product.id}`} className="text-2xl font-semibold text-white">
                          {product.name}
                        </Link>
                        <ProductTemplateBadge template={template} />
                        <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                          archived
                        </span>
                        <StatusPill status={latestGate?.passed ? "connected" : "pending"} />
                      </div>
                      <p className="max-w-3xl text-sm leading-7 text-slate-300">{product.summary}</p>
                      <p className="text-sm text-slate-400">
                        Archived {formatDate(product.archivedAt ?? product.updatedAt)}
                        {product.archivedReason ? ` / ${product.archivedReason}` : ""} / updated{" "}
                        {formatDate(product.updatedAt)}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Link href={`/app/products/${product.id}`} className="button-secondary">
                          Edit
                        </Link>
                        <form action={restoreProductAction.bind(null, product.id)}>
                          <button type="submit" className="button-secondary">
                            Restore
                          </button>
                        </form>
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
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Integrations</p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {connectedIntegrationsCount}/4
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <StageRail stage={product.stage} />
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </Section>
    </div>
  );
}
