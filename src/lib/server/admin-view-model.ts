import { getPublicFunnelState } from "@/lib/server/funnel";
import type { getAdminOverview } from "@/lib/server/services";

export type AdminPageViewModel = {
  funnel: Awaited<ReturnType<typeof getPublicFunnelState>>;
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
  const selfServeCheck = overview.readiness.checks.find((check) => check.id === "self_serve");
  const checkoutCheck = overview.readiness.checks.find((check) => check.id === "checkout");

  return {
    funnel: await getPublicFunnelState({ includeFounderContext: false }),
    goLiveChecklist: [
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
    ],
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
