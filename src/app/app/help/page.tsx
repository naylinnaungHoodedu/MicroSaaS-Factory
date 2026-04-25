import type { Metadata } from "next";

import { HelpCenter, type WorkspaceHelpContext } from "@/components/help-center";
import { STAGE_LABELS } from "@/lib/constants";
import { requireFounderContext } from "@/lib/server/auth";
import { buildDashboardPageViewModel } from "@/lib/server/dashboard-view-model";
import { getPublicFunnelState } from "@/lib/server/funnel";
import { getPublicPricingData, getWorkspaceDashboard } from "@/lib/server/services";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Help",
};

function buildWorkspaceHelpContext(input: {
  dashboard: Awaited<ReturnType<typeof getWorkspaceDashboard>>;
  founderEmail: string;
  viewModel: ReturnType<typeof buildDashboardPageViewModel>;
}): WorkspaceHelpContext {
  const { dashboard, founderEmail, viewModel } = input;

  return {
    activeProductCount: viewModel.activeProductCount,
    archivedProductCount: viewModel.archivedProductCount,
    billingStatus: viewModel.subscription?.status ?? "beta",
    checkoutLabel: dashboard.featureFlags.checkoutEnabled ? "Visible" : "Controlled",
    crmDueTodayCount: dashboard.crmSummary.dueTodayCount,
    crmOverdueCount: dashboard.crmSummary.overdueCount,
    crmPendingAnalysisCount: dashboard.crmSummary.pendingAnalysisCount,
    crmSnoozedCount: dashboard.crmSummary.snoozedCount,
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

export default async function WorkspaceHelpPage() {
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
    <HelpCenter
      mode="workspace"
      workspaceContext={buildWorkspaceHelpContext({
        dashboard,
        founderEmail: user.email,
        viewModel,
      })}
    />
  );
}
