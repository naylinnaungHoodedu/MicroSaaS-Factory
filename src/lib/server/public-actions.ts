import { getPublicFunnelState } from "@/lib/server/funnel";
import { readDatabase } from "@/lib/server/db";
import { createSignupIntent, createWaitlistRequest } from "@/lib/server/services";
import type { SignupIntent, WaitlistRequest } from "@/lib/types";

const EXISTING_WORKSPACE_MESSAGE =
  "A founder workspace already exists for this email. Reopen it from founder login.";

type WaitlistRequestSummary = Pick<WaitlistRequest, "challenge" | "email" | "name" | "notes">;
type SignupIntentSummary = Pick<
  SignupIntent,
  "email" | "founderName" | "id" | "planId" | "status" | "workspaceName"
>;

export type WaitlistActionState =
  | {
      status: "idle";
    }
  | {
      message: string;
      request: WaitlistRequestSummary;
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };

export type SignupActionState =
  | {
      status: "idle";
    }
  | {
      message: string;
      status: "error";
    }
  | {
      loginHref: string;
      message: string;
      signupIntent: SignupIntentSummary | null;
      status: "workspace_exists";
      workspaceName: string;
    }
  | {
      message: string;
      mode: "self_serve" | "signup_intent";
      signupIntent: SignupIntentSummary;
      status: "success";
    };

export const initialWaitlistActionState: WaitlistActionState = {
  status: "idle",
};

export const initialSignupActionState: SignupActionState = {
  status: "idle",
};

function toWaitlistSummary(request: WaitlistRequest): WaitlistRequestSummary {
  return {
    challenge: request.challenge,
    email: request.email,
    name: request.name,
    notes: request.notes,
  };
}

function toSignupIntentSummary(signupIntent: SignupIntent): SignupIntentSummary {
  return {
    email: signupIntent.email,
    founderName: signupIntent.founderName,
    id: signupIntent.id,
    planId: signupIntent.planId,
    status: signupIntent.status,
    workspaceName: signupIntent.workspaceName,
  };
}

async function findExistingWorkspace(email: string, workspaceName: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const database = await readDatabase();
  const user = database.users.find((entry) => entry.email === normalizedEmail);
  const workspace = user
    ? database.workspaces.find(
        (entry) => entry.id === user.workspaceId && entry.ownerUserId === user.id,
      )
    : null;
  const signupIntent =
    database.signupIntents.find((entry) => entry.email === normalizedEmail) ?? null;

  return {
    signupIntent: signupIntent ? toSignupIntentSummary(signupIntent) : null,
    workspaceName: workspace?.name ?? signupIntent?.workspaceName ?? workspaceName.trim(),
  };
}

export async function submitWaitlistAction(
  _previousState: WaitlistActionState,
  formData: FormData,
): Promise<WaitlistActionState> {
  "use server";

  try {
    const request = await createWaitlistRequest({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      challenge: String(formData.get("challenge") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    return {
      status: "success",
      message:
        "Your request has been recorded. Return to the overview or wait for an invite.",
      request: toWaitlistSummary(request),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Waitlist submission failed.",
    };
  }
}

export async function createSignupIntentAction(
  _previousState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  "use server";

  const email = String(formData.get("email") ?? "");
  const workspaceName = String(formData.get("workspaceName") ?? "");

  try {
    const signupIntent = await createSignupIntent({
      founderName: String(formData.get("founderName") ?? ""),
      email,
      workspaceName,
      planId: String(formData.get("planId") ?? ""),
    });
    const funnel = await getPublicFunnelState({
      includeFounderContext: false,
      signupIntentId: signupIntent.id,
    });
    const mode = funnel.availabilityMode === "self_serve" ? "self_serve" : "signup_intent";

    return {
      status: "success",
      mode,
      signupIntent: toSignupIntentSummary(signupIntent),
      message:
        mode === "self_serve"
          ? `Signup details saved for ${signupIntent.workspaceName}. Continue with Firebase to activate the workspace.`
          : "Your signup intent has been recorded. Workspace activation still stays behind reviewed access until self-serve provisioning is enabled.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Signup submission failed.";

    if (message === EXISTING_WORKSPACE_MESSAGE) {
      const existing = await findExistingWorkspace(email, workspaceName);

      return {
        status: "workspace_exists",
        message,
        loginHref: "/login",
        signupIntent: existing.signupIntent,
        workspaceName: existing.workspaceName,
      };
    }

    return {
      status: "error",
      message,
    };
  }
}

export { EXISTING_WORKSPACE_MESSAGE };
