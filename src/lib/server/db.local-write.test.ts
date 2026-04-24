import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const fsState = vi.hoisted(() => {
  const files = new Map<string, string>();

  const mkdirMock = vi.fn(async () => undefined);
  const readFileMock = vi.fn(async (path: string) => {
    const key = String(path);

    if (!files.has(key)) {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    }

    return files.get(key) as string;
  });
  const writeFileMock = vi.fn(async (path: string, contents: string) => {
    files.set(String(path), String(contents));
  });
  const renameMock = vi.fn(async () => {
    throw Object.assign(new Error("EPERM"), { code: "EPERM" });
  });
  const rmMock = vi.fn(async (path: string) => {
    files.delete(String(path));
  });

  return {
    files,
    mkdirMock,
    readFileMock,
    writeFileMock,
    renameMock,
    rmMock,
    reset() {
      files.clear();
      mkdirMock.mockClear();
      readFileMock.mockClear();
      writeFileMock.mockClear();
      renameMock.mockClear();
      rmMock.mockClear();
    },
  };
});

vi.mock("node:fs/promises", () => ({
  mkdir: fsState.mkdirMock,
  readFile: fsState.readFileMock,
  rename: fsState.renameMock,
  rm: fsState.rmMock,
  writeFile: fsState.writeFileMock,
}));

import { readDatabase, updateDatabase } from "@/lib/server/db";

const originalBackend = process.env.MICROSAAS_FACTORY_DB_BACKEND;
const originalLocalDbFile = process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE;

beforeEach(() => {
  fsState.reset();
  process.env.MICROSAAS_FACTORY_DB_BACKEND = "local";
  process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE = ".local/test-db.json";
});

afterEach(() => {
  if (originalBackend === undefined) {
    delete process.env.MICROSAAS_FACTORY_DB_BACKEND;
  } else {
    process.env.MICROSAAS_FACTORY_DB_BACKEND = originalBackend;
  }

  if (originalLocalDbFile === undefined) {
    delete process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE;
  } else {
    process.env.MICROSAAS_FACTORY_LOCAL_DB_FILE = originalLocalDbFile;
  }
});

describe("updateDatabase local fallback writes", () => {
  it("falls back to a direct write when replacing the local database file is blocked", async () => {
    await updateDatabase((database) => {
      database.workspaces.push({
        id: "workspace-1",
        name: "Factory Lab",
        ownerUserId: "user-1",
        createdAt: "2026-04-18T00:00:00.000Z",
        featureFlags: {
          inviteOnlyBeta: true,
          publicWaitlist: true,
          publicSignupEnabled: false,
          selfServeProvisioningEnabled: false,
          checkoutEnabled: false,
          platformBillingEnabled: false,
          proAiEnabled: false,
        },
      });
    });

    const database = await readDatabase();

    expect(database.workspaces).toHaveLength(1);
    expect(fsState.renameMock).toHaveBeenCalledTimes(1);
    expect(fsState.rmMock).toHaveBeenCalledWith(
      expect.stringMatching(/test-db\.json\.\d+\.tmp$/),
      { force: true },
    );
  });

  it("retries transient local JSON parse errors before failing", async () => {
    const dataFile = path.resolve(process.cwd(), ".local/test-db.json");

    fsState.files.set(
      dataFile,
      JSON.stringify(
        {
          workspaces: [
            {
              id: "workspace-1",
              name: "Factory Lab",
              ownerUserId: "user-1",
              createdAt: "2026-04-18T00:00:00.000Z",
              featureFlags: {
                inviteOnlyBeta: true,
                publicWaitlist: true,
                publicSignupEnabled: false,
                selfServeProvisioningEnabled: false,
                checkoutEnabled: false,
                platformBillingEnabled: false,
                proAiEnabled: false,
              },
            },
          ],
        },
        null,
        2,
      ),
    );

    fsState.readFileMock
      .mockImplementationOnce(async () => "")
      .mockImplementationOnce(async () => "");

    const database = await readDatabase();

    expect(database.workspaces).toHaveLength(1);
    expect(fsState.readFileMock).toHaveBeenCalledTimes(3);
  });
});
