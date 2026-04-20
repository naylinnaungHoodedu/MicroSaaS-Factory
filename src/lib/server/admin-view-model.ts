import { getPublicFunnelState } from "@/lib/server/funnel";
import type { getAdminOverview } from "@/lib/server/services";

export type AdminPageViewModel = {
  funnel: Awaited<ReturnType<typeof getPublicFunnelState>>;
  latestRuns: Array<{
    actionLabel: string;
    description: string;
    key: "live-ops" | "validation-crm";
    label: string;
    run:
      | Awaited<ReturnType<typeof getAdminOverview>>["automation"]["latestLiveOpsRun"]
      | Awaited<ReturnType<typeof getAdminOverview>>["automation"]["latestValidationCrmRun"];
  }>;
  plansById: Map<string, Awaited<ReturnType<typeof getAdminOverview>>["platformPlans"][number]>;
};

export async function buildAdminPageViewModel(input: {
  overview: Awaited<ReturnType<typeof getAdminOverview>>;
}) {
  const { overview } = input;

  return {
    funnel: await getPublicFunnelState({ includeFounderContext: false }),
    latestRuns: [
      {
        key: "live-ops" as const,
        label: "Unified live ops",
        description:
          "Refresh stale GitHub, GCP, Stripe, and Resend connections, then sweep CRM automation.",
        run: overview.automation.latestLiveOpsRun,
        actionLabel: "Run live ops",
      },
      {
        key: "validation-crm" as const,
        label: "Validation CRM",
        description:
          "Retry transcript analysis, promote due tasks, and send founder reminder digests.",
        run: overview.automation.latestValidationCrmRun,
        actionLabel: "Run CRM sweep",
      },
    ],
    plansById: new Map(overview.platformPlans.map((plan) => [plan.id, plan])),
  } satisfies AdminPageViewModel;
}
