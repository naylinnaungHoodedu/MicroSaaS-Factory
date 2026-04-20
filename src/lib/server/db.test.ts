import { afterEach, describe, expect, it } from "vitest";

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
        inviteOnlyBeta: true,
        publicWaitlist: true,
        publicSignupEnabled: false,
        selfServeProvisioningEnabled: false,
        checkoutEnabled: true,
        platformBillingEnabled: false,
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
    expect(database.globalFeatureFlags.checkoutEnabled).toBe(true);
    expect(database.globalFeatureFlags.proAiEnabled).toBe(true);
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
