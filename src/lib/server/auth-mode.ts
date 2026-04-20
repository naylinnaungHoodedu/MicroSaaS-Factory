import "server-only";

import { isFirebaseClientConfigured } from "@/lib/firebase/config";
import { getFirebaseAdminStatus } from "@/lib/server/firebase-admin";

export function getAuthModeInfo() {
  const firebaseAdmin = getFirebaseAdminStatus();
  const firebaseClientConfigured = isFirebaseClientConfigured();
  const firebaseTestMode = Boolean(firebaseAdmin.testMode);
  const firebaseEnabled =
    firebaseTestMode || (firebaseClientConfigured && firebaseAdmin.configured);

  return {
    inviteTokenEnabled: true,
    firebaseClientConfigured: firebaseTestMode ? true : firebaseClientConfigured,
    firebaseAdminConfigured: firebaseAdmin.configured,
    firebaseEnabled,
    firebaseProjectId: firebaseAdmin.projectId ?? null,
    firebaseTestMode,
    firebaseError:
      !firebaseEnabled && firebaseClientConfigured
        ? firebaseAdmin.error ?? "Firebase Admin credentials are incomplete."
        : null,
  };
}
