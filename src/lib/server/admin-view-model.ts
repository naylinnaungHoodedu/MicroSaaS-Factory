import { getPublicFunnelState } from "@/lib/server/funnel";
import {
  buildRuntimeGoLiveGuidance,
  type RuntimeGoLiveGuidance,
} from "@/lib/server/runtime-config";
import type { getAdminOverview } from "@/lib/server/services";

export type AdminPageViewModel = {
  funnel: Awaited<ReturnType<typeof getPublicFunnelState>>;
  guidedLaunchTarget: {
    blockers: Array<Awaited<ReturnType<typeof getPublicFunnelState>>["launch"]["blockers"][number]>;
    description: string;
    flags: Array<Awaited<ReturnType<typeof getPublicFunnelState>>["launch"]["targetFlags"][number]>;
    summary: string;
  };
  launchGuidance: RuntimeGoLiveGuidance;
  goLiveChecklist: Array<{
    detail: string;
    href?: string;
    id:
      | "firebase"
      | "stripe"
      | "legal"
      | "csp"
      | "redirect"
      | "email-auth";
    label: string;
    status: "ready" | "attention" | "manual";
  }>;
  externalLaunchChecklist: Array<{
    detail: string;
    href?: string;
    id:
      | "redirect"
      | "email-auth";
    label: string;
    status: "ready" | "attention" | "manual";
  }>;
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
  repoControlledChecklist: Array<{
    detail: string;
    href?: string;
    id:
      | "firebase"
      | "stripe"
      | "legal"
      | "csp";
    label: string;
    status: "ready" | "attention" | "manual";
  }>;
};

export async function buildAdminPageViewModel(input: {
  overview: Awaited<ReturnType<typeof getAdminOverview>>;
}) {
  const { overview } = input;
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  const selfServeCheck = overview.readiness.checks.find((check) => check.id === "self_serve");
  const checkoutCheck = overview.readiness.checks.find((check) => check.id === "checkout");
  const launchGuidance = buildRuntimeGoLiveGuidance(overview.readiness);
  const goLiveChecklist: AdminPageViewModel["goLiveChecklist"] = [
    {
      id: "firebase",
      label: "Firebase client + admin",
      status:
        overview.auth.firebaseClientConfigured && overview.auth.firebaseAdminConfigured
          ? "ready"
          : "attention",
      detail:
        overview.auth.firebaseClientConfigured && overview.auth.firebaseAdminConfigured
          ? "Firebase client and admin credentials are both configured for public self-serve."
          : selfServeCheck?.detail ??
            "Firebase client and admin credentials both need to be configured.",
    },
    {
      id: "stripe",
      label: "Stripe secret + webhook + prices",
      status: overview.readiness.checkoutReady ? "ready" : "attention",
      detail:
        overview.readiness.checkoutReady
          ? "Stripe checkout secrets, webhook verification, app URL, and public price mapping are aligned."
          : checkoutCheck?.detail ?? "Stripe checkout is not launch-ready yet.",
    },
    {
      id: "legal",
      label: "Terms + privacy routes",
      status: "ready",
      href: "/terms",
      detail:
        "Launch-baseline legal pages are shipped in the public surface at /terms and /privacy.",
    },
    {
      id: "csp",
      label: "Enforced CSP",
      status: "ready",
      detail:
        "The app now emits Content-Security-Policy instead of Content-Security-Policy-Report-Only.",
    },
    {
      id: "redirect",
      label: "Permanent HTTPS redirect",
      status: "manual",
      detail:
        "Confirm the public edge returns HTTP 301 from http://microsaasfactory.io before promoting long HSTS.",
    },
    {
      id: "email-auth",
      label: "SPF + DKIM + DMARC + CAA",
      status: "manual",
      detail:
        "Confirm DNS email-auth and certificate-authority records for the active transactional sender before calling launch complete.",
    },
  ];

  return {
    funnel,
    guidedLaunchTarget: {
      summary:
        "Target the full public launch posture: pricing on, signup on, self-serve on, and checkout on once runtime and edge verification are both green.",
      description:
        "This launch wave is not targeting a half-open funnel. The operator surface should make it explicit that full self-serve plus checkout is the intended steady state after Firebase, Stripe, redirect, and DNS work are complete.",
      flags: funnel.launch.targetFlags,
      blockers: funnel.launch.blockers.filter((blocker) =>
        ["firebase", "stripe", "redirect", "email-auth"].includes(blocker.id),
      ),
    },
    launchGuidance,
    goLiveChecklist,
    repoControlledChecklist: goLiveChecklist.filter((item) =>
      ["firebase", "stripe", "legal", "csp"].includes(item.id),
    ) as AdminPageViewModel["repoControlledChecklist"],
    externalLaunchChecklist: goLiveChecklist.filter((item) =>
      ["redirect", "email-auth"].includes(item.id),
    ) as AdminPageViewModel["externalLaunchChecklist"],
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
