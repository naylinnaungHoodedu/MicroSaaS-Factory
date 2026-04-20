import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_FEATURE_FLAGS } from "@/lib/constants";

const firestoreState = vi.hoisted(() => {
  const documents = new Map<string, { value: unknown }>();
  const runTransactionMock = vi.fn(async (runner: () => Promise<unknown>) => runner());

  function createSnapshot() {
    const docs = [...documents.entries()].map(([id, value]) => ({
      id,
      data: () => value,
    }));

    return {
      empty: docs.length === 0,
      docs,
    };
  }

  class FirestoreMock {
    runTransaction<T>(
      callback: (transaction: {
        get: (query: unknown) => Promise<ReturnType<typeof createSnapshot>>;
        set: (document: { id: string }, value: { value: unknown }) => void;
      }) => Promise<T> | T,
    ) {
      return runTransactionMock(async () => {
        const pending = new Map<string, { value: unknown }>();
        const transaction = {
          get: async () => createSnapshot(),
          set: (document: { id: string }, value: { value: unknown }) => {
            pending.set(document.id, value);
          },
        };
        const result = await callback(transaction);

        for (const [key, value] of pending.entries()) {
          documents.set(key, value);
        }

        return result;
      });
    }

    collection() {
      return {
        get: async () => createSnapshot(),
        doc: (id: string) => ({ id }),
      };
    }
  }

  return {
    FirestoreMock,
    documents,
    runTransactionMock,
    reset() {
      documents.clear();
      runTransactionMock.mockReset();
    },
  };
});

vi.mock("@google-cloud/firestore", () => ({
  Firestore: firestoreState.FirestoreMock,
}));

import { readDatabase, updateDatabase } from "@/lib/server/db";

const originalBackend = process.env.MICROSAAS_FACTORY_DB_BACKEND;
const originalProject = process.env.FIRESTORE_PROJECT_ID;

beforeEach(() => {
  firestoreState.reset();
  process.env.MICROSAAS_FACTORY_DB_BACKEND = "firestore";
  process.env.FIRESTORE_PROJECT_ID = "factory-test";
  firestoreState.documents.set("globalFeatureFlags", {
    value: DEFAULT_FEATURE_FLAGS,
  });
});

afterEach(() => {
  if (originalBackend === undefined) {
    delete process.env.MICROSAAS_FACTORY_DB_BACKEND;
  } else {
    process.env.MICROSAAS_FACTORY_DB_BACKEND = originalBackend;
  }

  if (originalProject === undefined) {
    delete process.env.FIRESTORE_PROJECT_ID;
  } else {
    process.env.FIRESTORE_PROJECT_ID = originalProject;
  }
});

describe("Firestore updateDatabase", () => {
  it("writes through a Firestore transaction", async () => {
    await updateDatabase((database) => {
      database.waitlistRequests.push({
        id: "waitlist-1",
        name: "Founder",
        email: "founder@example.com",
        challenge: "Launch discipline",
        notes: "",
        createdAt: "2026-04-20T00:00:00.000Z",
        status: "pending",
      });
    });

    const database = await readDatabase();

    expect(firestoreState.runTransactionMock).toHaveBeenCalledTimes(1);
    expect(database.waitlistRequests).toHaveLength(1);
    expect(database.globalFeatureFlags.checkoutEnabled).toBe(false);
  });

  it("preserves unrelated documents while updating a targeted state slice", async () => {
    firestoreState.documents.set("waitlistRequests", {
      value: [
        {
          id: "waitlist-1",
          name: "Founder",
          email: "founder@example.com",
          challenge: "Launch discipline",
          notes: "",
          createdAt: "2026-04-20T00:00:00.000Z",
          status: "pending",
        },
      ],
    });

    await updateDatabase((database) => {
      database.globalFeatureFlags = {
        ...database.globalFeatureFlags,
        proAiEnabled: true,
      };
    });

    expect(firestoreState.documents.get("waitlistRequests")?.value).toEqual([
      {
        id: "waitlist-1",
        name: "Founder",
        email: "founder@example.com",
        challenge: "Launch discipline",
        notes: "",
        createdAt: "2026-04-20T00:00:00.000Z",
        status: "pending",
      },
    ]);
    expect(
      (firestoreState.documents.get("globalFeatureFlags")?.value as typeof DEFAULT_FEATURE_FLAGS)
        .proAiEnabled,
    ).toBe(true);
  });
});
