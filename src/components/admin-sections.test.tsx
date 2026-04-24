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
  it("renders the full launch target, blockers, and sequencing guidance", () => {
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
                detail: "Public signup is available from the current plan catalog.",
                blocking: true,
              },
              {
                id: "self_serve",
                label: "Self-serve activation",
                status: "warning",
                detail: "Firebase client and admin readiness still block self-serve activation.",
                blocking: false,
              },
              {
                id: "checkout",
                label: "Stripe checkout",
                status: "warning",
                detail: "Stripe checkout still has unresolved runtime blockers.",
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
              topObjections: [],
              topPainPoints: [],
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
        } as never}
        viewModel={{
          funnel: {
            summary: {
              eyebrow: "Self-Serve Staged",
              title: "Start the workspace now and complete activation when this environment is ready.",
              detail: "Activation follows the live environment readiness for this deployment.",
              tone: "amber",
            },
            availabilityMode: "signup_intent",
            pricingVisible: true,
            checkoutVisible: false,
          },
          guidedLaunchTarget: {
            summary:
              "Target the full public launch posture: pricing on, signup on, self-serve on, and checkout on once runtime and edge verification are both green.",
            description:
              "This launch wave is not targeting a half-open funnel. The operator surface should make it explicit that full self-serve plus checkout is the intended steady state after Firebase, Stripe, redirect, and DNS work are complete.",
            flags: [
              {
                flag: "platformBillingEnabled",
                label: "platformBillingEnabled",
                target: true,
                actual: true,
              },
              {
                flag: "publicSignupEnabled",
                label: "publicSignupEnabled",
                target: true,
                actual: true,
              },
              {
                flag: "selfServeProvisioningEnabled",
                label: "selfServeProvisioningEnabled",
                target: true,
                actual: false,
              },
              {
                flag: "checkoutEnabled",
                label: "checkoutEnabled",
                target: true,
                actual: false,
              },
            ],
            blockers: [
              {
                id: "firebase",
                label: "Self-serve activation",
                status: "attention",
                detail: "Firebase client and admin readiness still block self-serve activation.",
              },
              {
                id: "stripe",
                label: "Checkout",
                status: "attention",
                detail: "Stripe checkout still has unresolved runtime blockers.",
              },
              {
                id: "redirect",
                label: "Permanent HTTPS redirect",
                status: "manual",
                detail: "Confirm the public edge returns HTTP 301 before long HSTS.",
              },
              {
                id: "email-auth",
                label: "SPF + DKIM + DMARC + CAA",
                status: "manual",
                detail: "Confirm DNS email-auth and certificate-authority records.",
              },
            ],
          },
          launchGuidance: {
            summary:
              "Repo-controlled launch work still needs self-serve activation and stripe checkout. External verification remains required after deploy.",
            nextStep:
              "Finish the remaining Firebase, Stripe, or runtime setup, deploy the build, verify /api/healthz, then run verify-public-edge.ps1 with launch expectations.",
            repoControlledIssues: [
              "Self-serve activation: Firebase client and admin readiness still block self-serve activation.",
            ],
            externalVerification: [
              "Confirm http://microsaasfactory.io returns HTTP 301 to HTTPS before long HSTS.",
            ],
          },
          goLiveChecklist: [
            {
              id: "firebase",
              label: "Firebase client + admin",
              status: "attention",
              detail: "Firebase client and admin readiness still block self-serve activation.",
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
          repoControlledChecklist: [
            {
              id: "firebase",
              label: "Firebase client + admin",
              status: "attention",
              detail: "Firebase client and admin readiness still block self-serve activation.",
            },
            {
              id: "legal",
              label: "Terms + privacy routes",
              status: "ready",
              detail: "Launch-baseline legal pages are shipped in the public surface.",
              href: "/terms",
            },
          ],
          externalLaunchChecklist: [
            {
              id: "redirect",
              label: "Permanent HTTPS redirect",
              status: "manual",
              detail: "Confirm the public edge returns HTTP 301 before long HSTS.",
            },
            {
              id: "email-auth",
              label: "SPF + DKIM + DMARC + CAA",
              status: "manual",
              detail: "Confirm DNS email-auth and certificate-authority records.",
            },
          ],
          latestRuns: [],
          plansById: new Map(),
        } as never}
      />,
    );

    expect(html).toContain("Full launch target");
    expect(html).toContain("selfServeProvisioningEnabled");
    expect(html).toContain("checkoutEnabled");
    expect(html).toContain("Founder-facing narrative");
    expect(html).toContain(
      "Start the workspace now and complete activation when this environment is ready.",
    );
    expect(html).toContain("Launch sequencing");
    expect(html).toContain("Public signup");
    expect(html).toContain("pwsh ./scripts/verify-public-edge.ps1 -Domain microsaasfactory.io");
    expect(html).toContain("Repo-controlled launch work");
    expect(html).toContain("External launch verification");
  });
});
