import "server-only";

import { GUIDED_PUBLIC_LAUNCH_TARGET_FLAGS } from "@/lib/constants";
import { HOME_WORKFLOW_ITEMS } from "@/lib/public-content";
import { getFounderContext } from "@/lib/server/auth";
import { getAuthModeInfo } from "@/lib/server/auth-mode";
import { readDatabase } from "@/lib/server/db";
import {
  buildRuntimeGoLiveGuidance,
  evaluateRuntimeReadiness,
  getPublicPlatformPlans,
  type RuntimeReadiness,
} from "@/lib/server/runtime-config";
import type {
  FeatureFlags,
  PlatformPlan,
  PlatformSubscription,
  SignupIntent,
} from "@/lib/types";

export type PublicAvailabilityMode = "waitlist" | "signup_intent" | "self_serve";

export type PublicJourneyMode = PublicAvailabilityMode | "returning_founder";

export type PublicActionKind = "app" | "signup" | "waitlist" | "login" | "pricing";

export type PublicFunnelAction = {
  href: string;
  label: string;
  kind: PublicActionKind;
};

export type PublicTrustCard = {
  detail: string;
  label: string;
  value: string;
};

export type PublicLaunchBlocker = {
  detail: string;
  id: "pricing" | "signup" | "firebase" | "stripe" | "redirect" | "email-auth";
  label: string;
  status: "ready" | "attention" | "manual";
};

export type PublicLaunchTargetFlag = {
  actual: boolean;
  flag: keyof typeof GUIDED_PUBLIC_LAUNCH_TARGET_FLAGS;
  label: string;
  target: boolean;
};

export type PublicFunnelDetailCard = {
  detail: string;
  eyebrow: string;
  title: string;
};

export type PublicLaunchState = {
  badge: string;
  blockerSummary: string;
  blockers: PublicLaunchBlocker[];
  detail: string;
  nextStep: string;
  operatorControl: string;
  targetFlags: PublicLaunchTargetFlag[];
  title: string;
  trustCards: PublicTrustCard[];
};

export type PublicSurfaceCopy = {
  billing: {
    detail: string;
    nextStep: string;
    operatorCard: PublicFunnelDetailCard;
    title: string;
  };
  footer: {
    detail: string;
    signals: string[];
  };
  home: {
    currentMode: PublicFunnelDetailCard;
    operator: PublicFunnelDetailCard;
    posture: PublicFunnelDetailCard;
    whyNarrow: PublicFunnelDetailCard;
    workflowItems: string[];
  };
  login: {
    modeCard: PublicFunnelDetailCard;
    notice: string;
    posture: PublicFunnelDetailCard;
    sectionDescription: string;
    sectionTitle: string;
  };
  pricing: {
    checkoutGuidance: string;
    currentState: PublicFunnelDetailCard;
    operator: PublicFunnelDetailCard;
    posture: PublicFunnelDetailCard;
  };
  signup: {
    modeCard: PublicFunnelDetailCard;
    notice: string;
    posture: PublicFunnelDetailCard;
    sectionDescription: string;
    sectionTitle: string;
  };
  waitlist: {
    currentPathCard: PublicFunnelDetailCard;
    fitCard: PublicFunnelDetailCard;
    posture: PublicFunnelDetailCard;
  };
};

export type PublicFunnelSource = {
  auth: ReturnType<typeof getAuthModeInfo>;
  flags: FeatureFlags;
  founder: {
    subscriptionStatus: PlatformSubscription["status"] | null;
    workspaceId: string;
    workspaceName: string;
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
  launch: PublicLaunchState;
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
  surfaces: PublicSurfaceCopy;
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
      eyebrow: "Founder Workspace",
      title: input.founder.workspaceName
        ? `${input.founder.workspaceName} is ready for the next founder move.`
        : "Your workspace is ready for the next founder move.",
      detail: input.founder.hasActiveSubscription
        ? "Validation, launch tracking, and billing are already live for this workspace."
        : input.founder.canStartCheckout
          ? "Your workspace is provisioned, checkout is available, and you can upgrade without leaving the founder workflow."
          : "Re-enter the workspace to manage product lanes, launch readiness, and the next billing step from one control surface.",
      tone: "emerald",
    };
  }

  if (input.journeyMode === "self_serve") {
    if (input.activationReady) {
      return {
        eyebrow: "Live Self-Serve",
        title: "Start the founder workspace and move from signal to launch in one surface.",
        detail:
          "Pricing, signup, activation, and founder re-entry are aligned in one trusted public path for this environment.",
        tone: "cyan",
      };
    }

    return {
      eyebrow: "Self-Serve Staged",
      title: "Stage the founder workspace now and continue into activation as launch readiness clears.",
      detail: input.activationDetail,
      tone: "amber",
    };
  }

  if (input.journeyMode === "signup_intent") {
    return {
      eyebrow: "Guided Signup",
      title: "Start the founder workspace with clear pricing, guided signup, and a visible next step.",
      detail:
        "Founders can evaluate the lane, stage the workspace, and know what happens next before self-serve and checkout are fully opened.",
      tone: "cyan",
    };
  }

  return {
    eyebrow: "Reviewed Entry",
    title: "Use the reviewed path when context should come before direct signup.",
    detail: input.auth.firebaseEnabled
      ? "Existing founders can return immediately, while new workspaces still follow reviewed entry or staged rollout in this environment."
      : "Invite-token access remains the reviewed entry path until self-serve activation is ready.",
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
      label: "Start founder workspace",
      kind: "signup",
    };
  }

  if (input.availabilityMode === "signup_intent") {
    return {
      href: "/signup",
      label: "Start founder workspace",
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

function formatList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function buildGuidedLaunchTargetFlags(flags: FeatureFlags): PublicLaunchTargetFlag[] {
  return [
    {
      flag: "platformBillingEnabled",
      label: "platformBillingEnabled",
      target: GUIDED_PUBLIC_LAUNCH_TARGET_FLAGS.platformBillingEnabled,
      actual: flags.platformBillingEnabled,
    },
    {
      flag: "publicSignupEnabled",
      label: "publicSignupEnabled",
      target: GUIDED_PUBLIC_LAUNCH_TARGET_FLAGS.publicSignupEnabled,
      actual: flags.publicSignupEnabled,
    },
    {
      flag: "selfServeProvisioningEnabled",
      label: "selfServeProvisioningEnabled",
      target: GUIDED_PUBLIC_LAUNCH_TARGET_FLAGS.selfServeProvisioningEnabled,
      actual: flags.selfServeProvisioningEnabled,
    },
    {
      flag: "checkoutEnabled",
      label: "checkoutEnabled",
      target: GUIDED_PUBLIC_LAUNCH_TARGET_FLAGS.checkoutEnabled,
      actual: flags.checkoutEnabled,
    },
  ];
}

function buildTrustCards(input: {
  activationReady: boolean;
  auth: PublicFunnelSource["auth"];
  availabilityMode: PublicAvailabilityMode;
  checkoutVisible: boolean;
  metrics: PublicFunnelSource["metrics"];
  pricingVisible: boolean;
}) {
  return [
    input.metrics.workspaceCount > 0
      ? {
          label: "Active workspaces",
          value: String(input.metrics.workspaceCount),
          detail: "Founder workspaces already use the system for validation, launch control, and connected operating work.",
        }
      : {
          label: "Operating model",
          value:
            input.availabilityMode === "self_serve"
              ? input.activationReady
                ? "Live self-serve"
                : "Self-serve staged"
              : input.availabilityMode === "signup_intent"
                ? "Guided signup"
                : "Reviewed entry",
          detail:
            input.availabilityMode === "signup_intent"
              ? "Pricing and signup are public while the final activation step still follows launch readiness."
              : input.availabilityMode === "self_serve"
                ? "Workspace staging and activation stay aligned without changing the route contract."
                : "Reviewed entry remains available when public signup is not the right fit yet.",
        },
    input.metrics.productCount > 0
      ? {
          label: "Tracked product lanes",
          value: String(input.metrics.productCount),
          detail: "Product lanes are already tracked from first signal through launch readiness and operating follow-through.",
        }
      : {
          label: "Commercial posture",
          value: input.pricingVisible ? (input.checkoutVisible ? "Checkout live" : "Public pricing") : "Hidden",
          detail: input.pricingVisible
            ? input.checkoutVisible
              ? "Eligible founders can upgrade directly from the public plan surface."
              : "Founders can compare plans publicly before they ever touch activation or billing."
            : "Pricing can stay hidden until the plan catalog is intentionally ready.",
        },
    input.metrics.waitlistCount > 0
      ? {
          label: "Reviewed intake",
          value: String(input.metrics.waitlistCount),
          detail: "Reviewed intake remains available as a secondary conversion and recovery lane.",
        }
      : {
          label: "Founder access",
          value: input.activationReady ? "Ready" : input.auth.firebaseEnabled ? "Provisioned" : "Invite-led",
          detail: input.auth.firebaseEnabled
            ? input.activationReady
              ? "Activation and founder re-entry can complete inside the same public flow."
              : "Existing founders can return now, while new workspace activation still depends on launch readiness."
            : "Invite-token access remains the safe fallback until Firebase readiness is complete.",
        },
  ] satisfies PublicTrustCard[];
}

function buildLaunchBlockers(input: {
  activationReady: boolean;
  availabilityMode: PublicAvailabilityMode;
  checkoutVisible: boolean;
  pricingVisible: boolean;
  readiness: RuntimeReadiness;
}) {
  return [
    {
      id: "pricing",
      label: "Public pricing",
      status: input.pricingVisible ? "ready" : "attention",
      detail: input.pricingVisible
        ? "Founders can evaluate the current plan and understand the commercial lane clearly."
        : "Pricing is still staged until a visible public plan is ready to present.",
    },
    {
      id: "signup",
      label: "Public signup",
      status:
        input.availabilityMode === "waitlist" ? "attention" : "ready",
      detail:
        input.availabilityMode === "waitlist"
          ? "New founders still enter through reviewed intake rather than direct signup."
          : "Founders can stage the workspace from the current public path.",
    },
    {
      id: "firebase",
      label: "Self-serve activation",
      status: input.activationReady ? "ready" : input.readiness.firebaseReadyForSelfServe ? "manual" : "attention",
      detail: input.activationReady
        ? "Identity verification is ready for self-serve workspace activation."
        : input.readiness.firebaseReadyForSelfServe
          ? "The identity path is nearly ready, but the final public self-serve posture is still being held back for launch review."
          : "Self-serve activation stays staged while the identity and provisioning path are still being finalized.",
    },
    {
      id: "stripe",
      label: "Checkout",
      status: input.checkoutVisible ? "ready" : input.readiness.checkoutReady ? "manual" : "attention",
      detail: input.checkoutVisible
        ? "Checkout is visible for eligible founder workspaces."
        : input.readiness.checkoutReady
          ? "The billing path is technically ready, but checkout is still intentionally staged."
          : "Checkout stays staged until billing credentials, price mapping, and webhook handling are fully connected.",
    },
    {
      id: "redirect",
      label: "Permanent HTTPS redirect",
      status: "manual",
      detail:
        "Before calling launch complete, confirm the public edge permanently redirects HTTP traffic to HTTPS.",
    },
    {
      id: "email-auth",
      label: "SPF + DKIM + DMARC + CAA",
      status: "manual",
      detail:
        "Before full launch, confirm sender-domain email authentication and certificate-authority records.",
    },
  ] satisfies PublicLaunchBlocker[];
}

function buildBlockerSummary(blockers: PublicLaunchBlocker[]) {
  const attentionLabels = blockers
    .filter((blocker) => blocker.status === "attention")
    .map((blocker) => blocker.label.toLowerCase());

  if (attentionLabels.length === 0) {
    return "Repo and runtime checks are aligned for the full self-serve launch; only manual edge and DNS confirmations remain.";
  }

  return `Full self-serve launch still needs ${formatList(attentionLabels)} plus the final edge and DNS confirmations.`;
}

function buildLaunchState(input: {
  activationReady: boolean;
  auth: PublicFunnelSource["auth"];
  availabilityMode: PublicAvailabilityMode;
  checkoutVisible: boolean;
  flags: FeatureFlags;
  founder: PublicFunnelState["founder"];
  metrics: PublicFunnelSource["metrics"];
  pricingVisible: boolean;
  readiness: RuntimeReadiness;
  signupAvailable: boolean;
}) {
  const goLiveGuidance = buildRuntimeGoLiveGuidance(input.readiness);
  const trustCards = buildTrustCards({
    activationReady: input.activationReady,
    auth: input.auth,
    availabilityMode: input.availabilityMode,
    checkoutVisible: input.checkoutVisible,
    metrics: input.metrics,
    pricingVisible: input.pricingVisible,
  });
  const blockers = buildLaunchBlockers({
    activationReady: input.activationReady,
    availabilityMode: input.availabilityMode,
    checkoutVisible: input.checkoutVisible,
    pricingVisible: input.pricingVisible,
    readiness: input.readiness,
  });

  return {
    badge: "Full Self-Serve Launch",
    title:
      input.pricingVisible && input.signupAvailable
        ? "Keep one public founder path from pricing through workspace activation."
        : "Open the founder funnel one launch-safe layer at a time.",
    detail:
      input.pricingVisible && input.signupAvailable
        ? "The target steady state is one coherent route contract: public pricing, workspace signup, activation, founder return, and workspace-aware checkout."
        : "The public surface should only open as far as the current plan catalog, runtime readiness, and launch flags allow.",
    operatorControl: input.founder.loggedIn
      ? "This founder already has workspace access while the product still keeps readiness, fallback paths, and final rollout checks visible."
      : input.availabilityMode === "signup_intent"
        ? "New founders can stage the workspace publicly, while reviewed fallback and launch proof still remain in place."
        : input.availabilityMode === "self_serve"
          ? "Public self-serve can open without removing fallback access. Launch proof still matters before the full posture stays on."
          : "Reviewed entry remains available as the public-safe fallback while the broader self-serve funnel stays closed.",
    nextStep: goLiveGuidance.nextStep,
    blockerSummary:
      buildBlockerSummary(blockers) ===
      "Repo and runtime checks are aligned for the full self-serve launch; only manual edge and DNS confirmations remain."
        ? goLiveGuidance.summary
        : `${buildBlockerSummary(blockers)} ${goLiveGuidance.summary}`,
    blockers,
    targetFlags: buildGuidedLaunchTargetFlags(input.flags),
    trustCards,
  } satisfies PublicLaunchState;
}

function buildCheckoutGuidance(input: {
  checkoutVisible: boolean;
  founder: PublicFunnelState["founder"];
  launch: PublicLaunchState;
  readiness: RuntimeReadiness;
}) {
  if (input.checkoutVisible) {
    return input.founder.canStartCheckout
      ? "Checkout can open for this founder workspace right now because billing visibility, checkout visibility, and workspace eligibility are aligned."
      : "Checkout is visible in this environment, but the final action still depends on the founder workspace subscription state.";
  }

  if (input.readiness.checkoutReady) {
    return "The billing path is technically ready, but checkout is still intentionally staged in this environment.";
  }

  return input.launch.blockers.find((blocker) => blocker.id === "stripe")?.detail ??
    "Checkout remains unavailable until the billing path is fully connected end to end.";
}

function buildSurfaceCopy(input: {
  activationDetail: string;
  activationReady: boolean;
  auth: PublicFunnelSource["auth"];
  availabilityMode: PublicAvailabilityMode;
  checkoutVisible: boolean;
  founder: PublicFunnelState["founder"];
  launch: PublicLaunchState;
  pricingVisible: boolean;
  readiness: RuntimeReadiness;
  signupAvailable: boolean;
}) {
  const selfServeEnabled = input.availabilityMode === "self_serve";
  const guidedSignupEnabled = input.availabilityMode === "signup_intent";
  const checkoutGuidance = buildCheckoutGuidance({
    checkoutVisible: input.checkoutVisible,
    founder: input.founder,
    launch: input.launch,
    readiness: input.readiness,
  });

  const signupNotice = !selfServeEnabled
    ? "This environment stages the founder workspace first and completes activation through reviewed access or a later self-serve rollout."
    : !input.auth.firebaseEnabled
      ? "Self-serve workspace creation is enabled, but Firebase sign-in is not configured for this environment yet. The workspace can still be staged from this form."
      : !input.activationReady
        ? input.activationDetail
        : "";

  const loginNotice = !input.auth.firebaseEnabled
    ? guidedSignupEnabled
      ? "Firebase sign-in is not configured in this environment yet, so invite-token access remains the supported founder return path."
      : "Firebase sign-in is not configured in this environment yet, so invite-token access remains the founder login path."
    : selfServeEnabled && !input.activationReady
      ? "Firebase is available for returning founders, while new workspace activation still depends on live environment readiness."
    : !selfServeEnabled && guidedSignupEnabled
        ? "Firebase is available for provisioned founders, while new workspace access still completes through reviewed access or staged signup."
        : "";

  return {
    home: {
      posture: {
        eyebrow: "Founder Operating System",
        title: "Validate faster, ship with more signal, and keep revenue decisions in the same workspace.",
        detail:
          "MicroSaaS Factory gives a solo technical founder one operating rhythm from early market signal through launch and revenue, without splitting product work, commercial clarity, and operating follow-through across separate tools.",
      },
      operator: {
        eyebrow: "Current Launch Contract",
        title: selfServeEnabled
          ? "Self-serve signup and founder re-entry stay on the same public contract."
          : "Signup, reviewed intake, and founder re-entry stay aligned to the same route contract.",
        detail: input.launch.operatorControl,
      },
      currentMode: {
        eyebrow: "Current Access Mode",
        title: selfServeEnabled
          ? input.checkoutVisible
            ? "This environment is running the full founder self-serve path."
            : "Workspace creation is live, and billing opens when the workspace becomes eligible."
          : guidedSignupEnabled
            ? "Founders can start with pricing and guided signup today."
            : "Reviewed entry remains the public path in this environment.",
        detail: selfServeEnabled
          ? "Founders can create or reopen the workspace from the same public funnel, while fallback access remains available for recovery."
          : guidedSignupEnabled
            ? "The public path stays clear: choose the lane, stage the workspace, and continue into activation through the live readiness path."
            : "The public surface stays open for discovery and pricing, while reviewed entry remains the activation gate.",
      },
      whyNarrow: {
        eyebrow: "Why It Stays Narrow",
        title: "The factory is optimized for one accountable founder, not soft team sprawl.",
        detail:
          "MicroSaaS Factory stays focused on one founder, one workspace, and product lanes that must earn the right to stop consuming attention.",
      },
      workflowItems: [...HOME_WORKFLOW_ITEMS],
    },
    pricing: {
      posture: {
        eyebrow: "Pricing Posture",
        title: input.checkoutVisible
          ? "Choose the Growth lane and move into billing when the workspace is eligible."
          : "Choose the Growth lane now and move into billing when the workspace is ready.",
        detail: input.founder.loggedIn
          ? input.founder.canStartCheckout
            ? "This founder workspace is eligible to start checkout directly from the pricing cards below."
            : input.founder.hasActiveSubscription
              ? "This founder workspace already has an active paid subscription."
              : "This founder workspace can compare plans now and reuse the same pricing surface when checkout becomes available."
          : "Visitors can compare the Growth lane here, then move into signup, waitlist, or founder re-entry from the same commercial surface.",
      },
      currentState: {
        eyebrow: "Current State",
        title: input.founder.loggedIn
          ? `Current workspace subscription state: ${input.founder.subscriptionStatus ?? "beta"}.`
          : "Visitors can compare the operating lane before moving into signup or founder recovery.",
        detail:
          "Pricing stays tied to the workspace lifecycle: discover the lane publicly, activate the workspace, then enter billing when workspace eligibility and runtime readiness are both true.",
      },
      operator: {
        eyebrow: "Billing Path",
        title: input.checkoutVisible
          ? "Billing visibility and checkout are aligned for this environment."
          : "Billing still follows workspace and runtime readiness.",
        detail: checkoutGuidance,
      },
      checkoutGuidance,
    },
    signup: {
      posture: {
        eyebrow: "Activation Posture",
        title: selfServeEnabled
          ? input.activationReady
            ? "Identity verification can activate the workspace immediately."
            : "Workspace creation is live, and activation finishes as soon as the identity path is ready."
          : "Register the workspace now and complete activation through the available path.",
        detail: selfServeEnabled
          ? "Start with founder details, lock the Growth plan, and continue into the fastest supported identity path."
          : "This path records the founder, workspace, and plan choice now, while activation continues through reviewed access or a later self-serve step.",
      },
      sectionTitle: selfServeEnabled
        ? "Create your founder workspace"
        : "Register founder intent",
      sectionDescription: selfServeEnabled
        ? "Public signup stages a real founder workspace. Confirm the plan, lock the founder email, and continue with Firebase or the current fallback path."
        : "Use this path to reserve the founder, workspace, and plan now. The same record can later continue through reviewed access or self-serve activation.",
      notice: signupNotice,
      modeCard: {
        eyebrow: "Current Mode",
        title: selfServeEnabled
          ? "Identity verification completes activation once the workspace details are staged."
          : "Workspace details are staged first, and activation follows the active rollout path.",
        detail: selfServeEnabled
          ? "Fallback access still remains valid, while Firebase becomes the primary activation path for the live self-serve launch."
          : "This form creates a reusable onboarding record without changing public routes or removing the invite fallback.",
      },
    },
    login: {
      posture: {
        eyebrow: "Login Posture",
        title: input.auth.firebaseEnabled
          ? "The fastest re-entry path leads, with fallback preserved on the same login surface."
          : guidedSignupEnabled
            ? "Founder re-entry is available now, while new workspace activation still follows live rollout posture."
            : "Invite-token access remains the active founder login contract.",
        detail: selfServeEnabled
          ? "Self-serve founders can return here after workspace provisioning, while existing invite links remain valid for recovery and manual access."
          : guidedSignupEnabled
            ? "New founders can register publicly, while provisioned founders and invite recipients can return through this login surface."
            : "The login page remains aligned with the invite-led founder workflow until signup opens.",
      },
      sectionTitle: selfServeEnabled
        ? "Return to your founder workspace."
        : "Sign in with your invite.",
      sectionDescription: selfServeEnabled
        ? "Use Firebase to reopen a provisioned workspace quickly, or use the invite-token form when you need the fallback/manual access path."
        : guidedSignupEnabled
          ? "Public signup is open, but founder workspace access still reopens through invite links or existing provisioned identities."
          : "Invite-only access remains the gate. If your invite email includes a direct invite link, that is the recommended entrypoint.",
      notice: loginNotice,
      modeCard: {
        eyebrow: "Authentication Mode",
        title: selfServeEnabled
          ? "Fallback access and self-serve founder return paths share one login surface."
          : guidedSignupEnabled
            ? "Signup is public, while founder re-entry still stays tied to existing provisioned identities."
            : "Invite-based access remains the current founder contract.",
        detail: selfServeEnabled
          ? "Firebase handles repeat founder access after provisioning, while manual invite-token entry remains available for fallback and recovery."
          : guidedSignupEnabled
            ? "Public signup can capture demand, but workspace activation still completes through reviewed access or an existing provisioned identity."
            : "Workspace creation still requires an issued invite, even when Firebase sign-in is active in this environment.",
      },
    },
    waitlist: {
      posture: {
        eyebrow: "Invite Queue",
        title: input.signupAvailable
          ? "Waitlist remains available as a reviewed fallback beside public signup."
          : "Reviewed entry is the current public path into the workspace.",
        detail:
          "Keep the waitlist open for higher-signal founders, reviewed provisioning, or cases where the main self-serve path is not the right fit yet.",
      },
      fitCard: {
        eyebrow: "Beta Fit",
        title: "The strongest candidates already feel operating drag.",
        detail:
          "The best beta founders already have one product idea or one live product and need better operating discipline rather than generic idea generation.",
      },
      currentPathCard: {
        eyebrow: "Current Public Path",
        title: input.signupAvailable
          ? "Waitlist is secondary when signup is already open."
          : "Reviewed entry is still the only public path.",
        detail: input.signupAvailable
          ? "Use the waitlist when a founder wants review before creating a workspace, or when the product needs a slower intake lane beside self-serve."
          : "Founders still need reviewed entry before they can enter the workspace, because the broader guided public launch posture has not opened yet.",
      },
    },
    footer: {
      detail:
        input.availabilityMode === "self_serve"
          ? input.activationReady
            ? "Founder operating system with live self-serve activation, connected ops, and workspace-aware billing."
            : "Founder operating system with public pricing and workspace staging while activation follows environment readiness."
          : input.availabilityMode === "signup_intent"
            ? "Founder operating system with public pricing, guided signup, and readiness-aware activation."
            : "Founder operating system with reviewed entry, staged commercialization, and connected ops.",
      signals: [
        `launch ${
          input.availabilityMode === "signup_intent"
            ? "guided signup"
            : input.availabilityMode === "self_serve"
              ? input.activationReady
                ? "self-serve live"
                : "self-serve staged"
              : "reviewed entry"
        }`,
        `pricing ${input.pricingVisible ? "visible" : "hidden"}`,
        `checkout ${input.checkoutVisible ? "visible" : "controlled"}`,
        `access ${input.auth.firebaseEnabled ? "firebase + fallback" : "invite-led"}`,
      ],
    },
    billing: {
      title: input.founder.hasActiveSubscription
        ? "This workspace is already on an active paid lane."
        : input.founder.canStartCheckout
          ? "This workspace can start checkout immediately."
          : input.founder.subscriptionStatus === "beta"
            ? "This workspace can operate now and move into billing when checkout stays visible."
            : "Compare plans now and move into billing when the workspace becomes eligible.",
      detail: input.founder.hasActiveSubscription
        ? "Pricing remains visible for reference, but this workspace already has an active paid subscription."
        : input.founder.canStartCheckout
          ? "Checkout is open for this founder workspace because billing visibility, checkout visibility, and workspace eligibility are all aligned."
          : input.founder.subscriptionStatus === "beta"
            ? "Reviewed founder workspaces can compare plans now and move into self-serve billing once the environment keeps checkout visible."
            : "Public pricing is visible, and billing opens once both workspace eligibility and runtime readiness are aligned.",
      nextStep: input.founder.canStartCheckout
        ? "Use the checkout buttons below when you are ready to upgrade."
        : input.founder.hasActiveSubscription
          ? "Use the pricing cards below as a reference for plan fit and renewal posture."
          : "Use the pricing cards below as a reference, then return here when the workspace is ready to upgrade.",
      operatorCard: {
        eyebrow: "Launch target",
        title:
          "Target posture: pricing visible, signup live, self-serve on, and checkout on once runtime and verification are green.",
        detail: input.launch.blockerSummary,
      },
    },
  } satisfies PublicSurfaceCopy;
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
    availabilityMode === "self_serve" && source.readiness.selfServeReady;
  const activationDetail =
    availabilityMode !== "self_serve"
      ? "Activation follows the current reviewed access or guided-signup flow."
      : activationReady
        ? "Identity verification is ready for self-serve workspace provisioning."
        : source.readiness.firebaseReadyForSelfServe
          ? "The identity path is almost ready, but the public self-serve posture is still staged."
          : "Identity verification and provisioning are still being finalized before self-serve opens.";
  const primaryAction = buildPrimaryAction({
    availabilityMode,
    founder,
    waitlistOpen,
  });
  const secondaryAction = buildSecondaryAction({
    founder,
    pricingVisible,
  });
  const launch = buildLaunchState({
    activationReady,
    auth: source.auth,
    availabilityMode,
    checkoutVisible,
    flags: source.flags,
    founder,
    metrics: source.metrics,
    pricingVisible,
    readiness: source.readiness,
    signupAvailable,
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
    launch,
    metrics: source.metrics,
    plans: source.plans,
    pricingAction: pricingVisible
      ? {
          href: "/pricing",
          label: founder.canStartCheckout ? "Compare and upgrade" : "View pricing",
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
    surfaces: buildSurfaceCopy({
      activationDetail,
      activationReady,
      auth: source.auth,
      availabilityMode,
      checkoutVisible,
      founder,
      launch,
      pricingVisible,
      readiness: source.readiness,
      signupAvailable,
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
