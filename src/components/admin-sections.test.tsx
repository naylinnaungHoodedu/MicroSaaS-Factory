import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_FEATURE_FLAGS } from "@/lib/constants";
import { AdminConsoleSection } from "@/components/admin-sections";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: ComponentPropsWithoutRef<"a"> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminConsoleSection", () => {
  it("renders the staged commercialization readiness chips", () => {
    const html = renderToStaticMarkup(
      <AdminConsoleSection
        overview={{
          flags: DEFAULT_FEATURE_FLAGS,
          readiness: {
            environment: "production",
            productionSafe: true,
            publicPlans: [
              {
                id: "growth",
                name: "Growth",
                hidden: false,
                monthlyPrice: 99,
                annualPrice: 990,
                features: ["Single founder workspace"],
              },
            ],
            publicPlanIdsMissingCheckoutPrices: [],
            pricingReady: true,
            signupIntentReady: true,
            firebaseReadyForSelfServe: false,
            selfServeReady: false,
            checkoutReady: false,
            automationReady: true,
            checks: [
              {
                id: "pricing",
                label: "Public pricing",
                status: "ready",
                detail: "Pricing can be exposed with one visible public plan.",
                blocking: true,
              },
              {
                id: "signup_intent",
                label: "Signup intent",
                status: "ready",
                detail: "Operator-reviewed signup intent can be exposed.",
                blocking: true,
              },
              {
                id: "self_serve",
                label: "Self-serve activation",
                status: "warning",
                detail: "Firebase client and admin configuration are incomplete.",
                blocking: false,
              },
              {
                id: "checkout",
                label: "Stripe checkout",
                status: "warning",
                detail: "Missing STRIPE_PLATFORM_SECRET_KEY.",
                blocking: false,
              },
              {
                id: "automation",
                label: "Automation scheduling",
                status: "ready",
                detail: "The app URL and internal automation key are both present.",
                blocking: false,
              },
            ],
            blockingIssues: [],
          },
          storage: {
            backend: "firestore",
            projectId: "factory-prod",
            databaseId: "(default)",
            collectionName: "microsaasFactoryState",
          },
          auth: {
            inviteTokenEnabled: true,
            firebaseClientConfigured: false,
            firebaseAdminConfigured: false,
            firebaseEnabled: false,
            firebaseProjectId: null,
            firebaseTestMode: false,
            firebaseError: null,
          },
          totals: {
            workspaceCount: 0,
            founderCount: 0,
            productCount: 0,
            connectedIntegrationCount: 0,
          },
          automation: {
            internalKeyConfigured: true,
            crmSummary: {
              dueTodayCount: 0,
              overdueCount: 0,
              snoozedCount: 0,
              pendingAnalysisCount: 0,
            },
            productsNeedingOpsAttention: 0,
            attentionRunCount: 0,
            latestProblemRun: null,
            latestValidationCrmRun: null,
            latestLiveOpsRun: null,
            recentRuns: [],
          },
          platformPlans: [],
          invites: [],
          signupIntents: [],
          waitlist: [],
        }}
        viewModel={{
          funnel: {
            summary: {
              eyebrow: "Guided Signup",
              title: "Capture founder demand now, provision deliberately later.",
              detail:
                "Public signup is collecting the founder, workspace, and plan choice without skipping operator review.",
              tone: "cyan",
            },
            availabilityMode: "signup_intent",
            pricingVisible: true,
            checkoutVisible: false,
          },
          goLiveChecklist: [
            {
              id: "firebase",
              label: "Firebase client + admin",
              status: "attention",
              detail: "Firebase client and admin credentials both need to be configured.",
            },
            {
              id: "legal",
              label: "Terms + privacy routes",
              status: "ready",
              detail: "Launch-baseline legal pages are shipped in the public surface.",
              href: "/terms",
            },
            {
              id: "redirect",
              label: "Permanent HTTPS redirect",
              status: "manual",
              detail: "Confirm the public edge returns HTTP 301 before long HSTS.",
            },
          ],
          latestRuns: [],
          plansById: new Map(),
        } as never}
      />,
    );

    expect(html).toContain("pricing ready");
    expect(html).toContain("signup intent ready");
    expect(html).toContain("checkout prep not ready");
    expect(html).toContain("self-serve not ready");
    expect(html).toContain("Go-live checklist");
    expect(html).toContain("Terms + privacy routes");
    expect(html).toContain("Permanent HTTPS redirect");
  });
});
