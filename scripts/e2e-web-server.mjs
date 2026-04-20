import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const dbFile =
  process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE ??
  path.join(process.cwd(), ".local", "playwright", "microsaas-factory-db.json");
const standaloneDir = path.join(process.cwd(), ".next", "standalone");
const standaloneStaticDir = path.join(standaloneDir, ".next", "static");
const sourceStaticDir = path.join(process.cwd(), ".next", "static");
const publicDir = path.join(process.cwd(), "public");
const standalonePublicDir = path.join(standaloneDir, "public");

const emptyDatabase = {
  waitlistRequests: [],
  signupIntents: [],
  invites: [],
  users: [],
  sessions: [],
  workspaces: [],
  products: [],
  buildSheets: [],
  opportunities: [],
  validationLeads: [],
  validationTouchpoints: [],
  specs: [],
  integrations: [],
  deploymentSnapshots: [],
  revenueSnapshots: [],
  emailSequences: [],
  launchGateResults: [],
  platformPlans: [
    {
      id: "beta-invite",
      name: "Invite Beta",
      hidden: true,
      monthlyPrice: 49,
      annualPrice: 490,
      features: [
        "Single-founder workspace",
        "GitHub + GCP + Stripe + Resend connections",
        "Research, spec, launch gate, and portfolio views",
      ],
    },
    {
      id: "growth",
      name: "Growth",
      hidden: false,
      monthlyPrice: 99,
      annualPrice: 990,
      features: [
        "Single-founder workspace",
        "GitHub + GCP + Stripe + Resend connections",
        "Research, spec, launch gate, and portfolio views",
      ],
    },
  ],
  platformSubscriptions: [],
  activityEvents: [],
  globalFeatureFlags: {
    inviteOnlyBeta: true,
    publicWaitlist: true,
    publicSignupEnabled: false,
    selfServeProvisioningEnabled: false,
    checkoutEnabled: false,
    platformBillingEnabled: false,
    proAiEnabled: false,
  },
};

await mkdir(path.dirname(dbFile), { recursive: true });
await mkdir(standaloneStaticDir, { recursive: true });
await writeFile(dbFile, JSON.stringify(emptyDatabase, null, 2), "utf8");
await cp(sourceStaticDir, standaloneStaticDir, { recursive: true, force: true });
await cp(publicDir, standalonePublicDir, { recursive: true, force: true });

const child = spawn(process.execPath, [path.join(standaloneDir, "server.js")], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
