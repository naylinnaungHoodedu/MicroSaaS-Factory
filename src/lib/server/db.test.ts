import { afterEach, describe, expect, it } from "vitest";

import { LEGACY_INVITE_ONLY_FEATURE_FLAGS } from "@/lib/constants";
import { getDatabaseBackendInfo, hydrateDatabase } from "@/lib/server/db";

const originalLocalDbFile = process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE;

afterEach(() => {
  if (originalLocalDbFile === undefined) {
    delete process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE;
    return;
  }

  process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE = originalLocalDbFile;
});

describe("hydrateDatabase", () => {
  it("backfills defaults and legacy validation lead fields", () => {
    const createdAt = "2026-04-15T12:00:00.000Z";
    const database = hydrateDatabase({
      validationLeads: [
        {
          id: "lead-1",
          productId: "product-1",
          name: "Founder",
          email: "founder@example.com",
          company: "Factory Co",
          role: "Owner",
          channel: "LinkedIn",
          status: "contacted",
          willingToPay: false,
          demoBooked: false,
          reservationPlaced: false,
          notes: "",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      globalFeatureFlags: {
        ...LEGACY_INVITE_ONLY_FEATURE_FLAGS,
        checkoutEnabled: true,
        proAiEnabled: true,
      },
    });

    expect(database.validationLeads[0]?.updatedAt).toBe(createdAt);
    expect(database.signupIntents).toEqual([]);
    expect(database.buildSheets).toEqual([]);
    expect(database.validationTouchpoints).toEqual([]);
    expect(database.validationSessions).toEqual([]);
    expect(database.validationTasks).toEqual([]);
    expect(database.activityEvents).toEqual([]);
    expect(database.globalFeatureFlags.inviteOnlyBeta).toBe(true);
    expect(database.platformPlans.some((plan) => plan.id === "beta-invite")).toBe(true);
    expect(database.platformPlans.some((plan) => plan.id === "growth" && !plan.hidden)).toBe(
      true,
    );
    expect(database.globalFeatureFlags.checkoutEnabled).toBe(true);
    expect(database.globalFeatureFlags.proAiEnabled).toBe(true);
  });

  it("upgrades the legacy invite-only global flags into the staged public rollout defaults", () => {
    const database = hydrateDatabase({
      globalFeatureFlags: LEGACY_INVITE_ONLY_FEATURE_FLAGS,
      platformPlans: [
        {
          id: "beta-invite",
          name: "Invite Beta",
          hidden: true,
          monthlyPrice: 49,
          annualPrice: 490,
          features: ["Beta"],
        },
      ],
    });

    expect(database.globalFeatureFlags.publicSignupEnabled).toBe(true);
    expect(database.globalFeatureFlags.platformBillingEnabled).toBe(true);
    expect(database.globalFeatureFlags.checkoutEnabled).toBe(false);
    expect(database.platformPlans.some((plan) => plan.id === "growth" && !plan.hidden)).toBe(
      true,
    );
  });
});

describe("getDatabaseBackendInfo", () => {
  it("returns the overridden local database file when configured", () => {
    process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE = ".local/test-db.json";

    expect(getDatabaseBackendInfo()).toMatchObject({
      backend: "local",
      dataFile: expect.stringMatching(/\.local[\\/]test-db\.json$/),
    });
  });
});
