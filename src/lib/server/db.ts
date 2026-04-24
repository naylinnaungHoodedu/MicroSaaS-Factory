import "server-only";

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Firestore, type QuerySnapshot, type Transaction } from "@google-cloud/firestore";

import {
  BETA_PLATFORM_PLAN_ID,
  DEFAULT_BETA_PLATFORM_PLAN,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_PUBLIC_GROWTH_PLAN,
  LEGACY_INVITE_ONLY_FEATURE_FLAGS,
} from "@/lib/constants";
import type { DatabaseShape, FeatureFlags, PlatformPlan } from "@/lib/types";

const DEFAULT_DATA_FILE = path.join(process.cwd(), ".local", "microsaas-factory-db.json");
const DEFAULT_FIRESTORE_COLLECTION = "microsaasFactoryState";

const EMPTY_DATABASE: DatabaseShape = {
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
  validationSessions: [],
  validationTasks: [],
  specs: [],
  integrations: [],
  deploymentSnapshots: [],
  revenueSnapshots: [],
  emailSequences: [],
  launchGateResults: [],
  platformPlans: [
    { ...DEFAULT_BETA_PLATFORM_PLAN },
    { ...DEFAULT_PUBLIC_GROWTH_PLAN },
  ],
  platformSubscriptions: [],
  activityEvents: [],
  automationRuns: [],
  globalFeatureFlags: DEFAULT_FEATURE_FLAGS,
};

const STATE_KEYS = Object.keys(EMPTY_DATABASE) as Array<keyof DatabaseShape>;

let writeQueue = Promise.resolve();
let firestoreClientCache:
  | {
      cacheKey: string;
      client: Firestore;
    }
  | null = null;

export type DatabaseBackend = "local" | "firestore";

type FirestoreBackendConfig = {
  collectionName: string;
  projectId?: string;
  databaseId?: string;
  credentials?: {
    client_email?: string;
    private_key?: string;
    project_id?: string;
  };
  credentialSource?: string;
};

export function hydrateDatabase(parsed?: Partial<DatabaseShape> | null) {
  const platformPlans = ensureSeedPlatformPlans(parsed?.platformPlans);
  const globalFeatureFlags = normalizeGlobalFeatureFlags(parsed?.globalFeatureFlags);
  const database = {
    ...EMPTY_DATABASE,
    ...parsed,
    platformPlans,
    globalFeatureFlags: {
      ...globalFeatureFlags,
    },
  } satisfies DatabaseShape;

  const signupIntents = (database.signupIntents ?? []).map((intent) => {
    const legacyStatus = String((intent as { status?: string }).status ?? "");

    return {
      ...intent,
      founderName:
        intent.founderName?.trim() || intent.email?.split("@")[0] || "Founder",
      status:
        legacyStatus === "pending"
          ? "pending_activation"
          : legacyStatus === "converted"
            ? "provisioned"
            : intent.status ?? "pending_activation",
    };
  });
  const platformSubscriptions = (database.platformSubscriptions ?? []).map((subscription) => ({
    ...subscription,
    source:
      subscription.source ??
      (subscription.status === "beta" ? "invite" : "self-serve"),
    updatedAt: subscription.updatedAt ?? subscription.createdAt,
  }));

  return {
    ...database,
    signupIntents,
    buildSheets: database.buildSheets ?? [],
    validationLeads: (database.validationLeads ?? []).map((lead) => ({
      ...lead,
      updatedAt: lead.updatedAt ?? lead.createdAt,
    })),
    validationTouchpoints: database.validationTouchpoints ?? [],
    validationSessions: (database.validationSessions ?? []).map((session) => ({
      ...session,
      updatedAt: session.updatedAt ?? session.createdAt,
      analysisAttempts: session.analysisAttempts ?? 0,
      generatedTaskIds: session.generatedTaskIds ?? [],
    })),
    validationTasks: database.validationTasks ?? [],
    activityEvents: database.activityEvents ?? [],
    automationRuns: database.automationRuns ?? [],
    platformSubscriptions,
  } satisfies DatabaseShape;
}

function ensureSeedPlatformPlans(plans?: PlatformPlan[]) {
  const nextPlans = [...(plans ?? EMPTY_DATABASE.platformPlans)];

  if (!nextPlans.some((plan) => plan.id === BETA_PLATFORM_PLAN_ID)) {
    nextPlans.unshift({ ...DEFAULT_BETA_PLATFORM_PLAN });
  }

  if (!nextPlans.some((plan) => !plan.hidden)) {
    nextPlans.push({ ...DEFAULT_PUBLIC_GROWTH_PLAN });
  }

  return nextPlans;
}

function isLegacyInviteOnlyState(flags: FeatureFlags) {
  return Object.entries(LEGACY_INVITE_ONLY_FEATURE_FLAGS).every(
    ([key, value]) => flags[key as keyof FeatureFlags] === value,
  );
}

function normalizeGlobalFeatureFlags(flags?: Partial<FeatureFlags>) {
  const merged = {
    ...DEFAULT_FEATURE_FLAGS,
    ...(flags ?? {}),
  } satisfies FeatureFlags;

  return isLegacyInviteOnlyState(merged) ? { ...DEFAULT_FEATURE_FLAGS } : merged;
}

function getLocalDataFile() {
  const configuredPath = process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE?.trim();
  return configuredPath
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath)
    : DEFAULT_DATA_FILE;
}

function getConfiguredBackend(): DatabaseBackend {
  return process.env.MICROSAAS_FACTORY_DB_BACKEND?.trim().toLowerCase() === "firestore"
    ? "firestore"
    : "local";
}

function getFirestoreConfig(): FirestoreBackendConfig {
  const credentialSource =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ??
    process.env.FIRESTORE_SERVICE_ACCOUNT_JSON?.trim() ??
    "";
  let credentials: FirestoreBackendConfig["credentials"];

  if (credentialSource) {
    try {
      const parsed = JSON.parse(credentialSource) as NonNullable<
        FirestoreBackendConfig["credentials"]
      >;
      credentials = {
        ...parsed,
        private_key: parsed.private_key?.replace(/\\n/g, "\n"),
      };
    } catch {
      throw new Error(
        "Invalid GOOGLE_SERVICE_ACCOUNT_JSON or FIRESTORE_SERVICE_ACCOUNT_JSON value.",
      );
    }
  }

  return {
    collectionName:
      process.env.MICROSAAS_FACTORY_FIRESTORE_COLLECTION?.trim() || DEFAULT_FIRESTORE_COLLECTION,
    projectId:
      process.env.FIRESTORE_PROJECT_ID?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
      credentials?.project_id,
    databaseId: process.env.FIRESTORE_DATABASE_ID?.trim() || undefined,
    credentials,
    credentialSource,
  };
}

function getFirestoreClient() {
  const config = getFirestoreConfig();
  const cacheKey = JSON.stringify({
    projectId: config.projectId ?? "",
    databaseId: config.databaseId ?? "",
    collectionName: config.collectionName,
    credentialSource: config.credentialSource ?? "",
  });

  if (firestoreClientCache?.cacheKey === cacheKey) {
    return firestoreClientCache.client;
  }

  const client = new Firestore({
    projectId: config.projectId,
    databaseId: config.databaseId,
    credentials: config.credentials,
    ignoreUndefinedProperties: true,
  });

  firestoreClientCache = { cacheKey, client };
  return client;
}

function getFirestoreCollection() {
  const config = getFirestoreConfig();
  return getFirestoreClient().collection(config.collectionName);
}

export function getDatabaseBackendInfo() {
  const backend = getConfiguredBackend();

  if (backend === "firestore") {
    const config = getFirestoreConfig();

    return {
      backend,
      projectId: config.projectId ?? "application-default",
      databaseId: config.databaseId ?? "(default)",
      collectionName: config.collectionName,
    };
  }

  return {
    backend,
    dataFile: getLocalDataFile(),
  };
}

async function ensureDataFile(dataFile: string) {
  await mkdir(path.dirname(dataFile), { recursive: true });

  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(EMPTY_DATABASE, null, 2), "utf8");
  }
}

async function readLocalDatabase() {
  const dataFile = getLocalDataFile();
  await ensureDataFile(dataFile);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const raw = await readFile(dataFile, "utf8");

    try {
      const parsed = JSON.parse(raw) as Partial<DatabaseShape>;
      return hydrateDatabase(parsed);
    } catch (error) {
      if (!(error instanceof SyntaxError) || attempt === 2) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }

  return hydrateDatabase();
}

function isRetryableLocalReplaceError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  return code === "EPERM" || code === "EBUSY";
}

async function writeLocalDatabase(database: DatabaseShape) {
  const dataFile = getLocalDataFile();
  await ensureDataFile(dataFile);
  const serialized = JSON.stringify(database, null, 2);
  const tempFile = `${dataFile}.${process.pid}.tmp`;
  await writeFile(tempFile, serialized, "utf8");

  try {
    await rename(tempFile, dataFile);
    return;
  } catch (error) {
    if (!isRetryableLocalReplaceError(error)) {
      throw error;
    }
  }

  await writeFile(dataFile, serialized, "utf8");
  await rm(tempFile, { force: true });
}

async function readFirestoreDatabase() {
  const snapshot = await getFirestoreCollection().get();

  return hydrateFirestoreSnapshot(snapshot);
}

function hydrateFirestoreSnapshot(
  snapshot: QuerySnapshot,
) {

  if (snapshot.empty) {
    return hydrateDatabase();
  }

  const partial: Partial<DatabaseShape> = {};

  for (const document of snapshot.docs) {
    const key = document.id as keyof DatabaseShape;

    if (!STATE_KEYS.includes(key)) {
      continue;
    }

    Object.assign(partial, {
      [key]: document.data().value,
    });
  }

  return hydrateDatabase(partial);
}

async function readFirestoreDatabaseInTransaction(transaction: Transaction) {
  const snapshot = await transaction.get(getFirestoreCollection());
  return hydrateFirestoreSnapshot(snapshot);
}

function writeFirestoreDatabaseInTransaction(
  transaction: Transaction,
  database: DatabaseShape,
) {
  const collection = getFirestoreCollection();

  for (const key of STATE_KEYS) {
    transaction.set(collection.doc(key), { value: database[key] });
  }
}

export async function readDatabase() {
  return getConfiguredBackend() === "firestore"
    ? readFirestoreDatabase()
    : readLocalDatabase();
}

export async function updateDatabase<T>(
  mutator: (database: DatabaseShape) => Promise<T> | T,
) {
  if (getConfiguredBackend() === "firestore") {
    return getFirestoreClient().runTransaction(async (transaction) => {
      const database = await readFirestoreDatabaseInTransaction(transaction);
      const result = await mutator(database);
      writeFirestoreDatabaseInTransaction(transaction, database);
      return result;
    });
  }

  const nextWrite = writeQueue.then(async () => {
    const database = await readLocalDatabase();
    const result = await mutator(database);
    await writeLocalDatabase(database);
    return result;
  });

  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );

  return nextWrite;
}
