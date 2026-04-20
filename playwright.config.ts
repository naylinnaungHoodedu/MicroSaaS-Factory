import os from "node:os";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const e2eDbFile = path.join(os.tmpdir(), "microsaas-factory-e2e", "db.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run e2e:server",
    port: 3100,
    reuseExistingServer: false,
    env: {
      ...process.env,
      ADMIN_ACCESS_KEY: "microsaas-admin",
      MICROSAAS_FACTORY_ALLOW_UNSAFE_RUNTIME_FOR_TESTS: "1",
      MICROSAAS_FACTORY_FAKE_FIREBASE: "1",
      MICROSAAS_FACTORY_DB_BACKEND: "local",
      MICROSAAS_FACTORY_LOCAL_DB_FILE: e2eDbFile,
      MICROSAAS_FACTORY_ENCRYPTION_KEY: "microsaas-factory-e2e",
      STRIPE_PLATFORM_PRICE_MAP_JSON:
        '{"growth":{"monthly":"price_monthly_growth","annual":"price_annual_growth"}}',
      PORT: "3100",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
