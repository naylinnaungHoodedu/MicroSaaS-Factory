import type { getPublicPricingData, getWorkspaceDashboard } from "@/lib/server/services";

export type DashboardPageViewModel = {
  activeProductCount: number;
  archivedProductCount: number;
  canStartCheckout: boolean;
  passedGates: number;
  pricingData: Awaited<ReturnType<typeof getPublicPricingData>>;
  readyProducts: number;
  subscription: Awaited<ReturnType<typeof getWorkspaceDashboard>>["platformSubscription"];
  totalMrr: number;
};

export function buildDashboardPageViewModel(input: {
  dashboard: Awaited<ReturnType<typeof getWorkspaceDashboard>>;
  pricingData: Awaited<ReturnType<typeof getPublicPricingData>>;
}) {
  const { dashboard, pricingData } = input;
  const activeProductCount = dashboard.portfolio.activeProductCount;
  const archivedProductCount = dashboard.portfolio.archivedProductCount;
  const totalMrr = dashboard.products.reduce(
    (sum, entry) =>
      sum +
      (entry.latestRevenue?.monthlyRecurringRevenue ??
        entry.product.metrics.monthlyRecurringRevenue),
    0,
  );
  const readyProducts = dashboard.products.filter((entry) => entry.readyForNextProduct).length;
  const passedGates = dashboard.products.filter((entry) => entry.latestGate?.passed).length;
  const subscription = dashboard.platformSubscription;
  const canStartCheckout =
    dashboard.featureFlags.platformBillingEnabled &&
    dashboard.featureFlags.checkoutEnabled &&
    (subscription?.status === "trial" || subscription?.status === "canceled");

  return {
    activeProductCount,
    archivedProductCount,
    canStartCheckout,
    passedGates,
    pricingData,
    readyProducts,
    subscription,
    totalMrr,
  } satisfies DashboardPageViewModel;
}
