import {
  DashboardAlerts,
  DashboardBillingSection,
  DashboardCreateProductSection,
  DashboardCrmSection,
  DashboardFactoryModeSection,
  DashboardPortfolioSection,
  DashboardProductsSection,
  DashboardTimelineSection,
} from "@/components/dashboard-sections";
import { requireFounderContext } from "@/lib/server/auth";
import { buildDashboardPageViewModel } from "@/lib/server/dashboard-view-model";
import { getPublicPricingData, getWorkspaceDashboard } from "@/lib/server/services";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string; reason?: string }>;
}) {
  const resolved = await searchParams;
  const { workspace } = await requireFounderContext();
  const dashboard = await getWorkspaceDashboard(workspace.id);
  const pricingData = dashboard.featureFlags.platformBillingEnabled
    ? await getPublicPricingData()
    : { flags: dashboard.featureFlags, plans: [] };
  const viewModel = buildDashboardPageViewModel({ dashboard, pricingData });

  return (
    <div className="space-y-8">
      <DashboardAlerts billing={resolved.billing} reason={resolved.reason} />
      <DashboardPortfolioSection dashboard={dashboard} viewModel={viewModel} />
      <DashboardBillingSection dashboard={dashboard} viewModel={viewModel} />
      <DashboardFactoryModeSection viewModel={viewModel} />
      <DashboardTimelineSection dashboard={dashboard} />
      <DashboardCrmSection dashboard={dashboard} />
      <DashboardCreateProductSection dashboard={dashboard} />
      <DashboardProductsSection dashboard={dashboard} />
      <DashboardProductsSection dashboard={dashboard} archived />
    </div>
  );
}
