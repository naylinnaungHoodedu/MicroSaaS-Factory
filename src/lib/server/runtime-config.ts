import "server-only";

import { isFirebaseClientConfigured } from "@/lib/firebase/config";
import type { FeatureFlags, PlatformPlan } from "@/lib/types";
import { getDatabaseBackendInfo, readDatabase } from "@/lib/server/db";
import { getFirebaseAdminStatus } from "@/lib/server/firebase-admin";

export type BillingInterval = "monthly" | "annual";

export type RuntimeReadinessCheckId =
  | "encryption"
  | "database"
  | "firebase"
  | "checkout"
  | "automation";

export type RuntimeReadinessCheck = {
  id: RuntimeReadinessCheckId;
  label: string;
  status: "ready" | "warning" | "blocked";
  detail: string;
  blocking: boolean;
};

export type StripePriceMap = Record<
  string,
  {
    monthly?: string;
    annual?: string;
  }
>;

export type RuntimeReadiness = {
  environment: "development" | "test" | "production";
  productionSafe: boolean;
  publicPlans: PlatformPlan[];
  publicPlanIdsMissingCheckoutPrices: string[];
  firebaseReadyForSelfServe: boolean;
  checkoutReady: boolean;
  automationReady: boolean;
  checks: RuntimeReadinessCheck[];
  blockingIssues: string[];
};

type StripePriceMapEntry = {
  monthly?: unknown;
  annual?: unknown;
};

function getEnvironment(): RuntimeReadiness["environment"] {
  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  return "development";
}

function allowUnsafeRuntimeForTests() {
  return process.env.MICROSAAS_FACTORY_ALLOW_UNSAFE_RUNTIME_FOR_TESTS === "1";
}

export function getPublicPlatformPlans(plans: PlatformPlan[]) {
  return plans
    .filter((plan) => !plan.hidden)
    .sort(
      (left, right) =>
        left.monthlyPrice - right.monthlyPrice ||
        left.annualPrice - right.annualPrice ||
        left.name.localeCompare(right.name),
    );
}

export function getMicrosaasFactoryAppUrl() {
  const raw = process.env.MICROSAAS_FACTORY_APP_URL?.trim();

  if (!raw) {
    return "";
  }

  return raw.replace(/\/+$/, "");
}

export function getEncryptionKeyStatus() {
  const raw = process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY?.trim() ?? "";
  const blockedValues = new Set(["", "change-me", "microsaas-factory-local-dev"]);
  const strongEnough = raw.length >= 16;

  if (blockedValues.has(raw) || !strongEnough) {
    return {
      configured: false,
      detail:
        raw === "change-me"
          ? "The production encryption key is still set to the default placeholder."
          : raw
            ? "The production encryption key is set but too weak. Use at least 16 non-default characters."
            : "No encryption key is configured.",
    };
  }

  return {
    configured: true,
    detail: "Integration secrets can be encrypted with a non-default application key.",
  };
}

export function getFirestoreRuntimeStatus() {
  const backend = getDatabaseBackendInfo();
  const environment = getEnvironment();

  if (backend.backend !== "firestore") {
    return {
      configured: false,
      detail: "The app is currently using the local JSON backend.",
    };
  }

  if (environment === "production" && !process.env.FIRESTORE_PROJECT_ID?.trim()) {
    return {
      configured: false,
      detail: "Production Firestore requires FIRESTORE_PROJECT_ID to be set explicitly.",
    };
  }

  if (
    backend.projectId === "application-default" &&
    !process.env.GOOGLE_CLOUD_PROJECT?.trim() &&
    !process.env.FIRESTORE_PROJECT_ID?.trim()
  ) {
    return {
      configured: false,
      detail: "Firestore is selected, but the project ID could not be resolved.",
    };
  }

  return {
    configured: true,
    detail: `Firestore is configured for project ${backend.projectId}, database ${backend.databaseId}, collection ${backend.collectionName}.`,
  };
}

export function getFirebaseRuntimeStatus() {
  const firebaseAdmin = getFirebaseAdminStatus();
  const firebaseClientConfigured = isFirebaseClientConfigured();
  const firebaseReady =
    Boolean(firebaseAdmin.testMode) || (firebaseClientConfigured && firebaseAdmin.configured);

  return {
    firebaseReady,
    firebaseClientConfigured,
    firebaseAdminConfigured: firebaseAdmin.configured,
    firebaseAdminStatus: firebaseAdmin,
    detail: firebaseReady
      ? `Firebase Auth is ready${firebaseAdmin.projectId ? ` for project ${firebaseAdmin.projectId}` : ""}.`
      : firebaseClientConfigured
        ? firebaseAdmin.error ?? "Firebase client envs exist, but admin credentials are incomplete."
        : "Firebase client and admin configuration are incomplete.",
  };
}

function isStripePriceMapEntry(value: unknown): value is StripePriceMapEntry {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getStripePriceMap() {
  const raw = process.env.STRIPE_PLATFORM_PRICE_MAP_JSON?.trim();

  if (!raw) {
    return {
      configured: false,
      map: {} as StripePriceMap,
      detail: "No Stripe plan-to-price mapping has been configured.",
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("must be an object");
    }

    const map: StripePriceMap = {};

    for (const [planId, value] of Object.entries(parsed)) {
      if (!isStripePriceMapEntry(value)) {
        continue;
      }

      const monthly =
        typeof value.monthly === "string" && value.monthly.trim() ? value.monthly.trim() : undefined;
      const annual =
        typeof value.annual === "string" && value.annual.trim() ? value.annual.trim() : undefined;

      map[planId] = {
        monthly,
        annual,
      };
    }

    return {
      configured: true,
      map,
      detail: "Stripe plan-to-price mapping JSON parsed successfully.",
    };
  } catch {
    return {
      configured: false,
      map: {} as StripePriceMap,
      detail: "STRIPE_PLATFORM_PRICE_MAP_JSON is not valid JSON.",
    };
  }
}

export function getStripeCheckoutPriceId(planId: string, interval: BillingInterval) {
  const { map } = getStripePriceMap();
  return map[planId]?.[interval] ?? "";
}

function buildCheck(
  id: RuntimeReadinessCheckId,
  label: string,
  status: RuntimeReadinessCheck["status"],
  detail: string,
  blocking = false,
): RuntimeReadinessCheck {
  return {
    id,
    label,
    status,
    detail,
    blocking,
  };
}

export function evaluateRuntimeReadiness(input: {
  flags: FeatureFlags;
  plans: PlatformPlan[];
}) {
  const environment = getEnvironment();
  const publicPlans = getPublicPlatformPlans(input.plans);
  const encryption = getEncryptionKeyStatus();
  const firestore = getFirestoreRuntimeStatus();
  const firebase = getFirebaseRuntimeStatus();
  const stripePriceMap = getStripePriceMap();
  const appUrl = getMicrosaasFactoryAppUrl();
  const stripeSecretConfigured = Boolean(process.env.STRIPE_PLATFORM_SECRET_KEY?.trim());
  const stripeWebhookConfigured = Boolean(process.env.STRIPE_PLATFORM_WEBHOOK_SECRET?.trim());
  const automationKeyConfigured = Boolean(process.env.INTERNAL_AUTOMATION_KEY?.trim());
  const publicPlanIdsMissingCheckoutPrices = publicPlans
    .filter((plan) => {
      const pricing = stripePriceMap.map[plan.id];
      return !(pricing?.monthly && pricing?.annual);
    })
    .map((plan) => plan.id);

  const signupHasVisiblePlan = publicPlans.length > 0;
  const publicExposureWithoutPlans =
    (input.flags.publicSignupEnabled || input.flags.platformBillingEnabled) &&
    !signupHasVisiblePlan;
  const checkoutMustBeReady =
    input.flags.checkoutEnabled || input.flags.platformBillingEnabled;
  const firebaseReadyForSelfServe = signupHasVisiblePlan && firebase.firebaseReady;
  const checkoutReady =
    stripeSecretConfigured &&
    stripeWebhookConfigured &&
    Boolean(appUrl) &&
    publicPlans.length > 0 &&
    publicPlanIdsMissingCheckoutPrices.length === 0 &&
    stripePriceMap.configured;
  const automationReady = automationKeyConfigured && Boolean(appUrl);

  const checks: RuntimeReadinessCheck[] = [
    encryption.configured
      ? buildCheck("encryption", "Encryption key", "ready", encryption.detail, true)
      : buildCheck(
          "encryption",
          "Encryption key",
          environment === "production" ? "blocked" : "warning",
          encryption.detail,
          environment === "production",
        ),
    firestore.configured
      ? buildCheck("database", "Firestore backend", "ready", firestore.detail, true)
      : buildCheck(
          "database",
          "Firestore backend",
          environment === "production" ? "blocked" : "warning",
          firestore.detail,
          environment === "production",
        ),
    firebaseReadyForSelfServe
      ? buildCheck("firebase", "Firebase Auth", "ready", firebase.detail)
      : buildCheck(
          "firebase",
          "Firebase Auth",
          input.flags.selfServeProvisioningEnabled ? "blocked" : "warning",
          !signupHasVisiblePlan
            ? "No visible public plans are available for self-serve signup."
            : firebase.detail,
          input.flags.selfServeProvisioningEnabled,
        ),
    checkoutReady
      ? buildCheck(
          "checkout",
          "Stripe checkout",
          "ready",
          `Checkout is configured with app URL ${appUrl} and Stripe pricing for ${publicPlans.length} public plan${publicPlans.length === 1 ? "" : "s"}.`,
        )
      : buildCheck(
          "checkout",
          "Stripe checkout",
          checkoutMustBeReady || publicExposureWithoutPlans ? "blocked" : "warning",
          !publicPlans.length
            ? "No visible public plans are available for pricing or checkout."
            : [
                !stripeSecretConfigured ? "Missing STRIPE_PLATFORM_SECRET_KEY." : null,
                !stripeWebhookConfigured ? "Missing STRIPE_PLATFORM_WEBHOOK_SECRET." : null,
                !appUrl ? "Missing MICROSAAS_FACTORY_APP_URL." : null,
                !stripePriceMap.configured ? stripePriceMap.detail : null,
                publicPlanIdsMissingCheckoutPrices.length > 0
                  ? `Missing monthly/annual Stripe price IDs for: ${publicPlanIdsMissingCheckoutPrices.join(", ")}.`
                  : null,
              ]
                .filter(Boolean)
                .join(" "),
          checkoutMustBeReady || publicExposureWithoutPlans,
        ),
    automationReady
      ? buildCheck(
          "automation",
          "Automation scheduling",
          "ready",
          "The app URL and internal automation key are both present for Cloud Scheduler and monitoring setup.",
        )
      : buildCheck(
          "automation",
          "Automation scheduling",
          "warning",
          [
            !automationKeyConfigured ? "Missing INTERNAL_AUTOMATION_KEY." : null,
            !appUrl ? "Missing MICROSAAS_FACTORY_APP_URL." : null,
          ]
            .filter(Boolean)
            .join(" "),
        ),
  ];

  const blockingIssues = checks.filter((check) => check.blocking && check.status === "blocked").map(
    (check) => `${check.label}: ${check.detail}`,
  );

  return {
    environment,
    productionSafe: blockingIssues.length === 0,
    publicPlans,
    publicPlanIdsMissingCheckoutPrices,
    firebaseReadyForSelfServe,
    checkoutReady,
    automationReady,
    checks,
    blockingIssues,
  } satisfies RuntimeReadiness;
}

export function assertFeatureFlagReadiness(input: {
  nextFlags: FeatureFlags;
  plans: PlatformPlan[];
}) {
  const readiness = evaluateRuntimeReadiness({
    flags: input.nextFlags,
    plans: input.plans,
  });
  const errors: string[] = [];

  if (
    (input.nextFlags.publicSignupEnabled || input.nextFlags.platformBillingEnabled) &&
    readiness.publicPlans.length === 0
  ) {
    errors.push("At least one platform plan must be visible before public signup or pricing can be enabled.");
  }

  if (input.nextFlags.selfServeProvisioningEnabled && !input.nextFlags.publicSignupEnabled) {
    errors.push("Self-serve provisioning requires public signup to be enabled.");
  }

  if (input.nextFlags.selfServeProvisioningEnabled && !readiness.firebaseReadyForSelfServe) {
    const firebaseCheck = readiness.checks.find((check) => check.id === "firebase");
    errors.push(firebaseCheck?.detail ?? "Firebase Auth is not ready for self-serve provisioning.");
  }

  if (input.nextFlags.checkoutEnabled && !input.nextFlags.platformBillingEnabled) {
    errors.push("Checkout requires platform billing visibility to be enabled.");
  }

  if (input.nextFlags.checkoutEnabled && !readiness.checkoutReady) {
    const checkoutCheck = readiness.checks.find((check) => check.id === "checkout");
    errors.push(checkoutCheck?.detail ?? "Stripe Checkout is not ready.");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export async function assertProductionRuntimeReady() {
  if (getEnvironment() !== "production") {
    return;
  }

  if (allowUnsafeRuntimeForTests()) {
    return;
  }

  const baselineFlags: FeatureFlags = {
    inviteOnlyBeta: true,
    publicWaitlist: true,
    publicSignupEnabled: false,
    selfServeProvisioningEnabled: false,
    checkoutEnabled: false,
    platformBillingEnabled: false,
    proAiEnabled: false,
  };
  const baselineReadiness = evaluateRuntimeReadiness({
    flags: baselineFlags,
    plans: [],
  });

  if (!baselineReadiness.productionSafe) {
    throw new Error(
      `MicroSaaS Factory production boot blocked. ${baselineReadiness.blockingIssues.join(" ")}`,
    );
  }

  const database = await readDatabase();
  const readiness = evaluateRuntimeReadiness({
    flags: database.globalFeatureFlags,
    plans: database.platformPlans,
  });

  if (!readiness.productionSafe) {
    throw new Error(
      `MicroSaaS Factory production boot blocked. ${readiness.blockingIssues.join(" ")}`,
    );
  }
}
