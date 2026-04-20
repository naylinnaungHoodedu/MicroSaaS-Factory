import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_FEATURE_FLAGS,
  LEGACY_INVITE_ONLY_FEATURE_FLAGS,
} from "@/lib/constants";

const {
  getDatabaseBackendInfoMock,
  getFirebaseAdminStatusMock,
  isFirebaseClientConfiguredMock,
  readDatabaseMock,
} = vi.hoisted(() => ({
  getDatabaseBackendInfoMock: vi.fn(),
  getFirebaseAdminStatusMock: vi.fn(),
  isFirebaseClientConfiguredMock: vi.fn(),
  readDatabaseMock: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabaseBackendInfo: getDatabaseBackendInfoMock,
  readDatabase: readDatabaseMock,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  getFirebaseAdminStatus: getFirebaseAdminStatusMock,
}));

vi.mock("@/lib/firebase/config", () => ({
  isFirebaseClientConfigured: isFirebaseClientConfiguredMock,
}));

import {
  assertFeatureFlagReadiness,
  assertProductionRuntimeReady,
  evaluateRuntimeReadiness,
  getRuntimeHealthSnapshot,
  getPublicPlatformPlans,
} from "./runtime-config";

const mutableEnv = process.env as Record<string, string | undefined>;
const originalNodeEnv = process.env.NODE_ENV;
const originalUnsafeRuntimeBypass = process.env.MICROSAAS_FACTORY_ALLOW_UNSAFE_RUNTIME_FOR_TESTS;
const originalEncryptionKey = process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY;
const originalAppUrl = process.env.MICROSAAS_FACTORY_APP_URL;
const originalFirestoreProjectId = process.env.FIRESTORE_PROJECT_ID;
const originalStripeSecret = process.env.STRIPE_PLATFORM_SECRET_KEY;
const originalStripeWebhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
const originalStripePriceMap = process.env.STRIPE_PLATFORM_PRICE_MAP_JSON;

function setNodeEnv(value?: string) {
  if (value === undefined) {
    delete mutableEnv.NODE_ENV;
    return;
  }

  mutableEnv.NODE_ENV = value;
}

beforeEach(() => {
  getDatabaseBackendInfoMock.mockReset();
  getFirebaseAdminStatusMock.mockReset();
  isFirebaseClientConfiguredMock.mockReset();
  readDatabaseMock.mockReset();

  delete process.env.MICROSAAS_FACTORY_APP_URL;
  delete process.env.MICROSAAS_FACTORY_ALLOW_UNSAFE_RUNTIME_FOR_TESTS;
  delete process.env.FIRESTORE_PROJECT_ID;
  delete process.env.STRIPE_PLATFORM_SECRET_KEY;
  delete process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
  delete process.env.STRIPE_PLATFORM_PRICE_MAP_JSON;

  getDatabaseBackendInfoMock.mockReturnValue({
    backend: "local",
    dataFile: "memory",
  });
  getFirebaseAdminStatusMock.mockReturnValue({
    configured: false,
    error: "Firebase Admin credentials are incomplete.",
  });
  isFirebaseClientConfiguredMock.mockReturnValue(false);
});

afterEach(() => {
  setNodeEnv(originalNodeEnv);

  if (originalEncryptionKey === undefined) {
    delete process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY;
  } else {
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = originalEncryptionKey;
  }

  if (originalAppUrl === undefined) {
    delete process.env.MICROSAAS_FACTORY_APP_URL;
  } else {
    process.env.MICROSAAS_FACTORY_APP_URL = originalAppUrl;
  }

  if (originalUnsafeRuntimeBypass === undefined) {
    delete process.env.MICROSAAS_FACTORY_ALLOW_UNSAFE_RUNTIME_FOR_TESTS;
  } else {
    process.env.MICROSAAS_FACTORY_ALLOW_UNSAFE_RUNTIME_FOR_TESTS = originalUnsafeRuntimeBypass;
  }

  if (originalFirestoreProjectId === undefined) {
    delete process.env.FIRESTORE_PROJECT_ID;
  } else {
    process.env.FIRESTORE_PROJECT_ID = originalFirestoreProjectId;
  }

  if (originalStripeSecret === undefined) {
    delete process.env.STRIPE_PLATFORM_SECRET_KEY;
  } else {
    process.env.STRIPE_PLATFORM_SECRET_KEY = originalStripeSecret;
  }

  if (originalStripeWebhookSecret === undefined) {
    delete process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = originalStripeWebhookSecret;
  }

  if (originalStripePriceMap === undefined) {
    delete process.env.STRIPE_PLATFORM_PRICE_MAP_JSON;
  } else {
    process.env.STRIPE_PLATFORM_PRICE_MAP_JSON = originalStripePriceMap;
  }
});

describe("runtime config readiness", () => {
  it("treats legacy invite-beta mode as production-safe when blocking runtime config is present", () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "super-strong-production-key";
    process.env.FIRESTORE_PROJECT_ID = "factory-prod";
    getDatabaseBackendInfoMock.mockReturnValue({
      backend: "firestore",
      projectId: "factory-prod",
      databaseId: "(default)",
      collectionName: "microsaasFactoryState",
    });

    const readiness = evaluateRuntimeReadiness({
      flags: LEGACY_INVITE_ONLY_FEATURE_FLAGS,
      plans: [],
    });

    expect(readiness.productionSafe).toBe(true);
    expect(readiness.pricingReady).toBe(false);
    expect(readiness.signupIntentReady).toBe(false);
    expect(readiness.checkoutReady).toBe(false);
    expect(readiness.selfServeReady).toBe(false);
  });

  it("treats staged signup-intent rollout as healthy even when checkout and self-serve are still warnings", () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "super-strong-production-key";
    process.env.FIRESTORE_PROJECT_ID = "factory-prod";
    getDatabaseBackendInfoMock.mockReturnValue({
      backend: "firestore",
      projectId: "factory-prod",
      databaseId: "(default)",
      collectionName: "microsaasFactoryState",
    });

    const readiness = evaluateRuntimeReadiness({
      flags: DEFAULT_FEATURE_FLAGS,
      plans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: ["Single founder"],
        },
      ],
    });

    expect(readiness.productionSafe).toBe(true);
    expect(readiness.pricingReady).toBe(true);
    expect(readiness.signupIntentReady).toBe(true);
    expect(readiness.checkoutReady).toBe(false);
    expect(readiness.selfServeReady).toBe(false);
  });

  it("tracks checkout readiness separately from the public checkout flag", () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "super-strong-production-key";
    process.env.FIRESTORE_PROJECT_ID = "factory-prod";
    process.env.MICROSAAS_FACTORY_APP_URL = "https://microsaasfactory.io";
    process.env.STRIPE_PLATFORM_SECRET_KEY = "sk_test_ready";
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = "whsec_ready";
    process.env.STRIPE_PLATFORM_PRICE_MAP_JSON =
      '{"growth":{"monthly":"price_monthly_123","annual":"price_annual_123"}}';
    getDatabaseBackendInfoMock.mockReturnValue({
      backend: "firestore",
      projectId: "factory-prod",
      databaseId: "(default)",
      collectionName: "microsaasFactoryState",
    });

    const readiness = evaluateRuntimeReadiness({
      flags: DEFAULT_FEATURE_FLAGS,
      plans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: ["Single founder"],
        },
      ],
    });

    expect(readiness.checkoutReady).toBe(true);
    expect(readiness.productionSafe).toBe(true);
  });

  it("blocks the staged rollout when pricing or signup intent is enabled without a visible public plan", () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "super-strong-production-key";
    process.env.FIRESTORE_PROJECT_ID = "factory-prod";
    getDatabaseBackendInfoMock.mockReturnValue({
      backend: "firestore",
      projectId: "factory-prod",
      databaseId: "(default)",
      collectionName: "microsaasFactoryState",
    });

    const readiness = evaluateRuntimeReadiness({
      flags: DEFAULT_FEATURE_FLAGS,
      plans: [],
    });

    expect(readiness.productionSafe).toBe(false);
    expect(readiness.blockingIssues.join(" ")).toContain("Public pricing");
    expect(readiness.blockingIssues.join(" ")).toContain("Signup intent");
  });

  it("blocks production readiness when encryption and database settings are unsafe", () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "change-me";

    const readiness = evaluateRuntimeReadiness({
      flags: DEFAULT_FEATURE_FLAGS,
      plans: [],
    });

    expect(readiness.productionSafe).toBe(false);
    expect(readiness.blockingIssues.join(" ")).toContain("Encryption key");
    expect(readiness.blockingIssues.join(" ")).toContain("Firestore backend");
  });

  it("rejects self-serve flags when Firebase Auth is not ready", () => {
    setNodeEnv("test");

    expect(() =>
      assertFeatureFlagReadiness({
        nextFlags: {
          ...DEFAULT_FEATURE_FLAGS,
          selfServeProvisioningEnabled: true,
        },
        plans: [
          {
            id: "growth",
            name: "Growth",
            hidden: false,
            monthlyPrice: 99,
            annualPrice: 990,
            features: ["Single founder"],
          },
        ],
      }),
    ).toThrow("Self-serve");
  });

  it("sorts visible public plans by ascending price", () => {
    const publicPlans = getPublicPlatformPlans([
      {
        id: "scale",
        name: "Scale",
        hidden: false,
        monthlyPrice: 199,
        annualPrice: 1990,
        features: ["Scale"],
      },
      {
        id: "beta-invite",
        name: "Invite Beta",
        hidden: true,
        monthlyPrice: 49,
        annualPrice: 490,
        features: ["Beta"],
      },
      {
        id: "growth",
        name: "Growth",
        hidden: false,
        monthlyPrice: 99,
        annualPrice: 990,
        features: ["Growth"],
      },
    ]);

    expect(publicPlans.map((plan) => plan.id)).toEqual(["growth", "scale"]);
  });

  it("blocks production readiness when Firestore lacks an explicit project env", () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "super-strong-production-key";
    getDatabaseBackendInfoMock.mockReturnValue({
      backend: "firestore",
      projectId: "application-default",
      databaseId: "microsaas-factory-db",
      collectionName: "microsaasFactoryState",
    });

    const readiness = evaluateRuntimeReadiness({
      flags: DEFAULT_FEATURE_FLAGS,
      plans: [],
    });

    expect(readiness.productionSafe).toBe(false);
    expect(readiness.blockingIssues.join(" ")).toContain("FIRESTORE_PROJECT_ID");
  });

  it("blocks production boot when persisted public flags require missing runtime config", async () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "super-strong-production-key";
    process.env.FIRESTORE_PROJECT_ID = "factory-prod";
    getDatabaseBackendInfoMock.mockReturnValue({
      backend: "firestore",
      projectId: "factory-prod",
      databaseId: "(default)",
      collectionName: "microsaasFactoryState",
    });
    readDatabaseMock.mockResolvedValue({
      globalFeatureFlags: {
        ...DEFAULT_FEATURE_FLAGS,
        publicSignupEnabled: true,
        selfServeProvisioningEnabled: true,
      },
      platformPlans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: ["Single founder"],
        },
      ],
    });

    await expect(assertProductionRuntimeReady()).rejects.toThrow("Firebase");
  });

  it("allows the production boot assertion to be bypassed for the e2e harness", async () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ALLOW_UNSAFE_RUNTIME_FOR_TESTS = "1";
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "change-me";

    await expect(assertProductionRuntimeReady()).resolves.toBeUndefined();
    expect(readDatabaseMock).not.toHaveBeenCalled();
  });

  it("publishes a minimal public health snapshot keyed to production safety", async () => {
    setNodeEnv("production");
    process.env.MICROSAAS_FACTORY_ENCRYPTION_KEY = "super-strong-production-key";
    process.env.FIRESTORE_PROJECT_ID = "factory-prod";
    process.env.MICROSAAS_FACTORY_APP_URL = "https://microsaasfactory.io";
    getDatabaseBackendInfoMock.mockReturnValue({
      backend: "firestore",
      projectId: "factory-prod",
      databaseId: "(default)",
      collectionName: "microsaasFactoryState",
    });
    readDatabaseMock.mockResolvedValue({
      globalFeatureFlags: DEFAULT_FEATURE_FLAGS,
      platformPlans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: ["Single founder"],
        },
      ],
    });

    await expect(getRuntimeHealthSnapshot()).resolves.toEqual({
      ok: true,
      generatedAt: expect.any(String),
      appUrl: "https://microsaasfactory.io",
      readiness: {
        pricingReady: true,
        signupIntentReady: true,
        checkoutReady: false,
        selfServeReady: false,
        automationReady: false,
      },
    });
  });
});
