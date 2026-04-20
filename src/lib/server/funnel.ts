import "server-only";

import { getFounderContext } from "@/lib/server/auth";
import { getAuthModeInfo } from "@/lib/server/auth-mode";
import { readDatabase } from "@/lib/server/db";
import {
  evaluateRuntimeReadiness,
  getPublicPlatformPlans,
  type RuntimeReadiness,
} from "@/lib/server/runtime-config";
import type { FeatureFlags, PlatformPlan, PlatformSubscription, SignupIntent } from "@/lib/types";

export type PublicAvailabilityMode = "waitlist" | "signup_intent" | "self_serve";

export type PublicJourneyMode = PublicAvailabilityMode | "returning_founder";

export type PublicActionKind = "app" | "signup" | "waitlist" | "login" | "pricing";

export type PublicFunnelAction = {
  href: string;
  label: string;
  kind: PublicActionKind;
};

export type PublicFunnelSource = {
  auth: ReturnType<typeof getAuthModeInfo>;
  flags: FeatureFlags;
  founder: {
    workspaceId: string;
    workspaceName: string;
    subscriptionStatus: PlatformSubscription["status"] | null;
  } | null;
  metrics: {
    productCount: number;
    waitlistCount: number;
    workspaceCount: number;
  };
  plans: PlatformPlan[];
  readiness: RuntimeReadiness;
  signupIntent: SignupIntent | null;
};

export type PublicFunnelState = {
  activationDetail: string;
  activationReady: boolean;
  auth: PublicFunnelSource["auth"];
  availabilityMode: PublicAvailabilityMode;
  checkoutVisible: boolean;
  flags: FeatureFlags;
  founder: {
    canStartCheckout: boolean;
    hasActiveSubscription: boolean;
    loggedIn: boolean;
    subscriptionStatus: PlatformSubscription["status"] | null;
    workspaceId?: string;
    workspaceName?: string;
  };
  journeyMode: PublicJourneyMode;
  metrics: PublicFunnelSource["metrics"];
  plans: PlatformPlan[];
  pricingAction: PublicFunnelAction | null;
  pricingVisible: boolean;
  primaryAction: PublicFunnelAction;
  readiness: RuntimeReadiness;
  secondaryAction: PublicFunnelAction;
  signupAvailable: boolean;
  signupIntent: SignupIntent | null;
  summary: {
    detail: string;
    eyebrow: string;
    title: string;
    tone: "amber" | "cyan" | "emerald";
  };
  waitlistOpen: boolean;
};

function buildSummary(input: {
  activationDetail: string;
  activationReady: boolean;
  auth: PublicFunnelSource["auth"];
  founder: PublicFunnelState["founder"];
  journeyMode: PublicJourneyMode;
  pricingVisible: boolean;
}): PublicFunnelState["summary"] {
  if (input.journeyMode === "returning_founder") {
    return {
      eyebrow: "Returning Founder",
      title: input.founder.workspaceName
        ? `${input.founder.workspaceName} is ready to operate.`
        : "Your workspace is ready to operate.",
      detail: input.founder.hasActiveSubscription
        ? "You already have workspace access and an active paid subscription state in the system."
        : input.founder.canStartCheckout
          ? "You already have workspace access, and this environment can open checkout directly when you need to upgrade."
          : "You already have workspace access. Pricing and checkout availability still depend on the operator flags and runtime readiness for this environment.",
      tone: "emerald",
    };
  }

  if (input.journeyMode === "self_serve") {
    if (input.activationReady) {
      return {
        eyebrow: "Live Self-Serve",
        title: "Choose a lane, verify identity, and open a founder workspace.",
        detail:
          "Pricing, signup, and Firebase activation are aligned for self-serve founders in this environment.",
        tone: "cyan",
      };
    }

    return {
      eyebrow: "Guided Self-Serve",
      title: "Signup is visible, but activation still depends on environment readiness.",
      detail: input.activationDetail,
      tone: "amber",
    };
  }

  if (input.journeyMode === "signup_intent") {
    return {
      eyebrow: "Guided Signup",
      title: "Capture founder demand now, provision deliberately later.",
      detail:
        "Public signup is collecting the founder, workspace, and plan choice without skipping operator review.",
      tone: "cyan",
    };
  }

  return {
    eyebrow: "Invite Beta",
    title: "Access stays operator-controlled while the stack hardens.",
    detail: input.auth.firebaseEnabled
      ? "Invite links and Firebase login both exist, but new workspaces still enter through the operator-managed beta path."
      : "Invite tokens remain the active entrypoint because public signup is still closed in this environment.",
    tone: input.pricingVisible ? "cyan" : "amber",
  };
}

function buildPrimaryAction(input: {
  availabilityMode: PublicAvailabilityMode;
  founder: PublicFunnelState["founder"];
  waitlistOpen: boolean;
}): PublicFunnelAction {
  if (input.founder.loggedIn) {
    return {
      href: "/app",
      label: "Open workspace",
      kind: "app",
    };
  }

  if (input.availabilityMode === "self_serve") {
    return {
      href: "/signup",
      label: "Create workspace",
      kind: "signup",
    };
  }

  if (input.availabilityMode === "signup_intent") {
    return {
      href: "/signup",
      label: "Start signup",
      kind: "signup",
    };
  }

  if (input.waitlistOpen) {
    return {
      href: "/waitlist",
      label: "Request invite",
      kind: "waitlist",
    };
  }

  return {
    href: "/login",
    label: "Founder login",
    kind: "login",
  };
}

function buildSecondaryAction(input: {
  founder: PublicFunnelState["founder"];
  pricingVisible: boolean;
}): PublicFunnelAction {
  if (input.pricingVisible) {
    return {
      href: "/pricing",
      label: "See pricing",
      kind: "pricing",
    };
  }

  return {
    href: input.founder.loggedIn ? "/app" : "/login",
    label: input.founder.loggedIn ? "Open workspace" : "Founder login",
    kind: input.founder.loggedIn ? "app" : "login",
  };
}

export function derivePublicFunnelState(source: PublicFunnelSource): PublicFunnelState {
  const availabilityMode: PublicAvailabilityMode = source.flags.publicSignupEnabled
    ? source.flags.selfServeProvisioningEnabled
      ? "self_serve"
      : "signup_intent"
    : "waitlist";
  const pricingVisible = source.flags.platformBillingEnabled && source.plans.length > 0;
  const checkoutVisible = pricingVisible && source.flags.checkoutEnabled;
  const founder = {
    loggedIn: Boolean(source.founder),
    workspaceId: source.founder?.workspaceId,
    workspaceName: source.founder?.workspaceName,
    subscriptionStatus: source.founder?.subscriptionStatus ?? null,
    hasActiveSubscription: source.founder?.subscriptionStatus === "active",
    canStartCheckout:
      checkoutVisible &&
      (source.founder?.subscriptionStatus === "trial" ||
        source.founder?.subscriptionStatus === "canceled"),
  };
  const journeyMode: PublicJourneyMode = founder.loggedIn
    ? "returning_founder"
    : availabilityMode;
  const signupAvailable = availabilityMode !== "waitlist" && source.plans.length > 0;
  const waitlistOpen = source.flags.publicWaitlist || availabilityMode === "waitlist";
  const activationReady =
    availabilityMode === "self_serve" && source.readiness.firebaseReadyForSelfServe;
  const activationDetail =
    availabilityMode !== "self_serve"
      ? "Activation follows the current operator-controlled invite or signup-intent flow."
      : activationReady
        ? "Firebase activation is ready for self-serve workspace provisioning."
        : source.readiness.checks.find((check) => check.id === "firebase")?.detail ??
          "Firebase activation is not ready for self-serve provisioning.";
  const primaryAction = buildPrimaryAction({
    availabilityMode,
    founder,
    waitlistOpen,
  });
  const secondaryAction = buildSecondaryAction({
    founder,
    pricingVisible,
  });

  return {
    activationDetail,
    activationReady,
    auth: source.auth,
    availabilityMode,
    checkoutVisible,
    flags: source.flags,
    founder,
    journeyMode,
    metrics: source.metrics,
    plans: source.plans,
    pricingAction: pricingVisible
      ? {
          href: "/pricing",
          label: founder.canStartCheckout ? "Compare and upgrade" : "See pricing",
          kind: "pricing",
        }
      : null,
    pricingVisible,
    primaryAction,
    readiness: source.readiness,
    secondaryAction,
    signupAvailable,
    signupIntent: source.signupIntent,
    summary: buildSummary({
      activationDetail,
      activationReady,
      auth: source.auth,
      founder,
      journeyMode,
      pricingVisible,
    }),
    waitlistOpen,
  };
}

export async function getPublicFunnelState(input?: {
  includeFounderContext?: boolean;
  signupIntentId?: string | null;
}) {
  const database = await readDatabase();
  const auth = getAuthModeInfo();
  const founderContext =
    input?.includeFounderContext === false ? null : await getFounderContext();
  const plans = getPublicPlatformPlans(database.platformPlans);
  const readiness = evaluateRuntimeReadiness({
    flags: database.globalFeatureFlags,
    plans: database.platformPlans,
  });
  const signupIntent =
    input?.signupIntentId
      ? database.signupIntents.find((intent) => intent.id === input.signupIntentId) ?? null
      : null;
  const subscription =
    founderContext &&
    database.platformSubscriptions.find(
      (entry) => entry.workspaceId === founderContext.workspace.id,
    );

  return derivePublicFunnelState({
    auth,
    flags: database.globalFeatureFlags,
    founder: founderContext
      ? {
          workspaceId: founderContext.workspace.id,
          workspaceName: founderContext.workspace.name,
          subscriptionStatus: subscription?.status ?? null,
        }
      : null,
    metrics: {
      productCount: database.products.length,
      waitlistCount: database.waitlistRequests.length,
      workspaceCount: database.workspaces.length,
    },
    plans,
    readiness,
    signupIntent,
  });
}
