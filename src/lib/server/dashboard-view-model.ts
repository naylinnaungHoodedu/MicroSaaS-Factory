import type { getPublicFunnelState } from "@/lib/server/funnel";
import type { getPublicPricingData, getWorkspaceDashboard } from "@/lib/server/services";
import { buildRuntimeGoLiveGuidance } from "@/lib/server/runtime-config";

export type DashboardPageViewModel = {
  activeProductCount: number;
  billingGuidance: {
    detail: string;
    nextStep: string;
    operatorCard: Awaited<ReturnType<typeof getPublicFunnelState>>["surfaces"]["billing"]["operatorCard"];
    title: string;
  };
  billingReadiness: {
    externalChecks: string[];
    repoControlledIssues: string[];
    workspaceItems: string[];
    summary: string;
  };
  archivedProductCount: number;
  canStartCheckout: boolean;
  controlTower: {
    detail: string;
    focusItems: string[];
    nextAction: string;
    title: string;
  };
  passedGates: number;
  pricingData: Awaited<ReturnType<typeof getPublicPricingData>>;
  publicFunnel: Awaited<ReturnType<typeof getPublicFunnelState>>;
  readyProducts: number;
  subscription: Awaited<ReturnType<typeof getWorkspaceDashboard>>["platformSubscription"];
  totalMrr: number;
};

function simplifyWorkspaceReadinessIssue(issue: string) {
  if (issue.startsWith("Public pricing:")) {
    return "Keep at least one clear public plan visible so pricing, signup, and billing stay legible.";
  }

  if (issue.startsWith("Signup intent:")) {
    return "Keep the public workspace-staging path open before pushing founders into reviewed intake only.";
  }

  if (issue.startsWith("Self-serve activation:")) {
    return "Self-serve activation stays staged while the identity and provisioning path are still being finalized.";
  }

  if (issue.startsWith("Stripe checkout:")) {
    return "Checkout stays staged until the billing credentials, webhook path, and price mapping are fully connected.";
  }

  if (issue.startsWith("Automation scheduling:")) {
    return "Automation still needs the scheduled verification path connected before launch operations can run unattended.";
  }

  return issue.replace(/^[^:]+:\s*/, "");
}

export function buildDashboardPageViewModel(input: {
  dashboard: Awaited<ReturnType<typeof getWorkspaceDashboard>>;
  pricingData: Awaited<ReturnType<typeof getPublicPricingData>>;
  publicFunnel: Awaited<ReturnType<typeof getPublicFunnelState>>;
}) {
  const { dashboard, pricingData, publicFunnel } = input;
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
  const readinessGuidance = buildRuntimeGoLiveGuidance(publicFunnel.readiness);
  const canStartCheckout =
    dashboard.featureFlags.platformBillingEnabled &&
    dashboard.featureFlags.checkoutEnabled &&
    (subscription?.status === "trial" || subscription?.status === "canceled");

  return {
    activeProductCount,
    billingGuidance: publicFunnel.surfaces.billing,
    billingReadiness: {
      externalChecks: readinessGuidance.externalVerification,
      repoControlledIssues: readinessGuidance.repoControlledIssues,
      workspaceItems: readinessGuidance.repoControlledIssues.map(simplifyWorkspaceReadinessIssue),
      summary: readinessGuidance.summary,
    },
    archivedProductCount,
    canStartCheckout,
    controlTower: {
      title:
        dashboard.workspace.name && dashboard.workspace.name.trim()
          ? `${dashboard.workspace.name} control tower`
          : "Founder control tower",
      detail:
        activeProductCount > 0
          ? "See portfolio health, commercial posture, and the next operating move from one workspace summary."
          : "Use the workspace as the operating home for validation, launch readiness, and commercialization as the first product lane comes online.",
      focusItems: canStartCheckout
        ? [
            "Review plan fit and move the workspace into billing when you are ready.",
            "Keep active lanes stable while commercialization opens.",
            "Use the dashboard to decide whether the next product deserves founder attention.",
          ]
        : activeProductCount === 0
          ? [
              "Open the first product lane.",
              "Turn raw founder context into structured research and validation evidence.",
              "Use the workspace as the operating home instead of scattered notes and side tools.",
            ]
          : passedGates < activeProductCount
            ? [
                "Close the biggest launch gaps in the current portfolio.",
                "Use CRM and recent activity to decide where founder attention goes next.",
                "Only open a new lane once the active ones stop leaking attention.",
              ]
            : [
                "The active lanes are stable enough to earn the next product slot.",
                "Keep billing, launch posture, and product health moving together.",
                "Use the dashboard to decide whether the factory can compound safely.",
              ],
      nextAction: canStartCheckout
        ? "Review plan fit and start checkout when you are ready to move this workspace onto a paid lane."
        : activeProductCount === 0
          ? "Open the first product lane and turn founder context into trackable operating evidence."
          : passedGates < activeProductCount
            ? "Close the biggest launch gaps before opening another product lane."
            : "Keep the current lanes stable enough to earn the next product slot.",
    },
    passedGates,
    pricingData,
    publicFunnel,
    readyProducts,
    subscription,
    totalMrr,
  } satisfies DashboardPageViewModel;
}
