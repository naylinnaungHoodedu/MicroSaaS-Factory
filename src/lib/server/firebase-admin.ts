import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type FirebaseAdminStatus = {
  configured: boolean;
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  error?: string;
  testMode?: boolean;
  credentialSource?: "service_account_env" | "legacy_env" | "json";
};

function isFirebaseAdminTestModeEnabled() {
  return process.env.MICROSAAS_FACTORY_FAKE_FIREBASE === "1";
}

function readFirebaseAdminStatus(): FirebaseAdminStatus {
  if (isFirebaseAdminTestModeEnabled()) {
    return {
      configured: true,
      projectId: "fake-firebase-project",
      clientEmail: "fake-firebase@example.com",
      privateKey: "fake-private-key",
      testMode: true,
    };
  }

  const rawCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  let parsedCredentials:
    | {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      }
    | undefined;

  if (rawCredentials) {
    try {
      parsedCredentials = JSON.parse(rawCredentials) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
    } catch {
      return {
        configured: false,
        error: "FIREBASE_ADMIN_CREDENTIALS_JSON is not valid JSON.",
        credentialSource: "json",
      };
    }
  }

  const projectId =
    process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    parsedCredentials?.project_id ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const clientEmail =
    process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ||
    process.env.FIREBASE_CLIENT_EMAIL?.trim() ||
    parsedCredentials?.client_email;
  const privateKey =
    process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n") ||
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ||
    parsedCredentials?.private_key?.replace(/\\n/g, "\n");
  const credentialSource = rawCredentials
    ? "json"
    : process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID?.trim() ||
        process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ||
        process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
      ? "service_account_env"
      : process.env.FIREBASE_PROJECT_ID?.trim() ||
          process.env.FIREBASE_CLIENT_EMAIL?.trim() ||
          process.env.FIREBASE_PRIVATE_KEY?.trim()
        ? "legacy_env"
        : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    return {
      configured: false,
      projectId,
      clientEmail,
      error: "Firebase Admin credentials are incomplete.",
      credentialSource,
    };
  }

  return {
    configured: true,
    projectId,
    clientEmail,
    privateKey,
    credentialSource,
  };
}

export function getFirebaseAdminStatus() {
  return readFirebaseAdminStatus();
}

export function isFirebaseAdminConfigured() {
  return readFirebaseAdminStatus().configured;
}

function getFirebaseAdminApp() {
  const status = readFirebaseAdminStatus();

  if (!status.configured || !status.projectId || !status.clientEmail || !status.privateKey) {
    throw new Error(status.error ?? "Firebase Admin credentials are incomplete.");
  }

  return getApps().find((app) => app.name === "microsaas-factory-admin")
    ? getApp("microsaas-factory-admin")
    : initializeApp(
        {
          credential: cert({
            projectId: status.projectId,
            clientEmail: status.clientEmail,
            privateKey: status.privateKey,
          }),
          projectId: status.projectId,
        },
        "microsaas-factory-admin",
      );
}

export async function verifyFirebaseIdToken(idToken: string) {
  if (isFirebaseAdminTestModeEnabled()) {
    const [mode, email, name, providerId] = idToken.split(":");

    if (mode !== "test" || !email) {
      throw new Error("Fake Firebase token is invalid.");
    }

    return {
      email,
      email_verified: true,
      name: name || email.split("@")[0],
      firebase: {
        sign_in_provider: providerId || "google.com",
      },
    };
  }

  return getAuth(getFirebaseAdminApp()).verifyIdToken(idToken, true);
}
