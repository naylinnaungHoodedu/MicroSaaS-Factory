import type { Metadata } from "next";

import { DemoCenter, type WorkspaceDemoContext } from "@/components/demo-center";
import { STAGE_LABELS } from "@/lib/constants";
import { requireFounderContext } from "@/lib/server/auth";
import { buildDashboardPageViewModel } from "@/lib/server/dashboard-view-model";
import { getPublicFunnelState } from "@/lib/server/funnel";
import { getPublicPricingData, getWorkspaceDashboard } from "@/lib/server/services";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Demo",
};

function buildWorkspaceDemoContext(input: {
  dashboard: Awaited<ReturnType<typeof getWorkspaceDashboard>>;
  founderEmail: string;
  viewModel: ReturnType<typeof buildDashboardPageViewModel>;
}): WorkspaceDemoContext {
  const { dashboard, founderEmail, viewModel } = input;

  return {
    activeProductCount: viewModel.activeProductCount,
    archivedProductCount: viewModel.archivedProductCount,
    billingStatus: viewModel.subscription?.status ?? "beta",
    checkoutLabel: dashboard.featureFlags.checkoutEnabled ? "Visible" : "Controlled",
    crmAttentionCount:
      dashboard.crmSummary.dueTodayCount +
      dashboard.crmSummary.overdueCount +
      dashboard.crmSummary.pendingAnalysisCount,
    founderEmail,
    nextAction: viewModel.controlTower.nextAction,
    passedGatesLabel: `${viewModel.passedGates}/${viewModel.activeProductCount || 0}`,
    pricingLabel: dashboard.featureFlags.platformBillingEnabled ? "Visible" : "Hidden",
    productLinks: dashboard.products.slice(0, 6).map((entry) => ({
      href: `/app/products/${entry.product.id}`,
      name: entry.product.name,
      readiness: entry.latestGate?.passed
        ? "Launch gate passed"
        : entry.readyForNextProduct
          ? "Ready for next"
          : "Needs review",
      stage: STAGE_LABELS[entry.product.stage],
      summary: entry.product.summary,
    })),
    readyProductsLabel: `${viewModel.readyProducts}/${viewModel.activeProductCount || 0}`,
    totalMrrLabel: formatCurrency(viewModel.totalMrr),
    totalProductCount: dashboard.portfolio.totalProductCount,
    workspaceName: dashboard.workspace.name,
  };
}

export default async function WorkspaceDemoPage() {
  const { user, workspace } = await requireFounderContext();
  const dashboard = await getWorkspaceDashboard(workspace.id);
  const pricingData = dashboard.featureFlags.platformBillingEnabled
    ? await getPublicPricingData()
    : { flags: dashboard.featureFlags, plans: [] };
  const publicFunnel = await getPublicFunnelState();
  const viewModel = buildDashboardPageViewModel({
    dashboard,
    pricingData,
    publicFunnel,
  });

  return (
    <DemoCenter
      mode="workspace"
      workspaceContext={buildWorkspaceDemoContext({
        dashboard,
        founderEmail: user.email,
        viewModel,
      })}
    />
  );
}
