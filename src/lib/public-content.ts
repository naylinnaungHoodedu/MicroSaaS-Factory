import type { PlatformPlan } from "@/lib/types";

export type PublicMarketingCard = {
  detail: string;
  title: string;
};

export type PublicFaqItem = {
  answer: string;
  question: string;
};

export type PublicComparisonRow = {
  capability: string;
  current: string;
  target: string;
};

export type PublicCtaBlock = {
  detail: string;
  eyebrow: string;
  title: string;
};

export type PublicMarketingContent = {
  home: {
    closing: PublicCtaBlock;
    founderFit: PublicMarketingCard[];
    faq: PublicFaqItem[];
    proof: PublicMarketingCard[];
  };
  login: {
    closing: PublicCtaBlock;
    faq: PublicFaqItem[];
    recovery: PublicMarketingCard[];
  };
  pricing: {
    closing: PublicCtaBlock;
    comparisonRows: PublicComparisonRow[];
    faq: PublicFaqItem[];
  };
  signup: {
    closing: PublicCtaBlock;
    faq: PublicFaqItem[];
    prep: PublicMarketingCard[];
  };
  waitlist: {
    closing: PublicCtaBlock;
    faq: PublicFaqItem[];
    review: PublicMarketingCard[];
  };
};

export type PublicMarketingMode = "waitlist" | "signup_intent" | "self_serve";

export const HOME_WORKFLOW_ITEMS = [
  "Score market demand with a repeatable opportunity rubric and AI-backed readouts.",
  "Keep interviews, objections, transcript analysis, and follow-up work inside one validation lane.",
  "Turn research into a one-page spec with scope, exclusions, launch criteria, and definition of done.",
  "Track GitHub, Cloud Run, Stripe, and Resend from the same product lane instead of a side spreadsheet.",
  "See portfolio health, launch readiness, and billing posture from one founder control tower.",
  "Keep the public promise and live product state aligned as commercialization opens in stages.",
] as const;

function describeActivation(input: {
  activationReady: boolean;
  availabilityMode: PublicMarketingMode;
  firebaseEnabled: boolean;
}) {
  if (input.availabilityMode === "self_serve") {
    return input.activationReady
      ? "Firebase activation can complete immediately from the public funnel."
      : input.firebaseEnabled
        ? "The workspace can be staged now while activation still waits for the final Firebase-ready posture."
        : "Workspace staging is public, but activation still waits for Firebase configuration.";
  }

  if (input.availabilityMode === "signup_intent") {
    return "Signup is public, while the final activation step still stays staged.";
  }

  return "Reviewed entry remains available when direct activation is not the right first step.";
}

function describeBilling(input: {
  checkoutVisible: boolean;
  pricingVisible: boolean;
  primaryPlanName: string;
}) {
  if (input.checkoutVisible) {
    return `${input.primaryPlanName} can move directly into workspace-aware checkout when the founder is eligible.`;
  }

  if (input.pricingVisible) {
    return `${input.primaryPlanName} is public for comparison, while checkout stays controlled until the billing path is fully ready.`;
  }

  return "Pricing stays private until visible plans are intentionally opened.";
}

function describeRecovery(input: {
  availabilityMode: PublicMarketingMode;
  firebaseEnabled: boolean;
}) {
  if (!input.firebaseEnabled) {
    return "Invite-token recovery remains the supported founder return path in this environment.";
  }

  return input.availabilityMode === "self_serve"
    ? "Firebase is the fast re-entry path, while invite-token access remains available for fallback and manual recovery."
    : "Provisioned founders can re-enter with Firebase, while invite-token access stays visible for fallback and reviewed access.";
}

function buildComparisonRows(input: {
  activationReady: boolean;
  availabilityMode: PublicMarketingMode;
  checkoutVisible: boolean;
  firebaseEnabled: boolean;
  pricingVisible: boolean;
  primaryPlanName: string;
}) {
  return [
    {
      capability: "Commercial entry",
      current: input.pricingVisible
        ? "Pricing and signup are public."
        : "Commercial entry is still private.",
      target: "Founders can understand the lane before they ever create or reopen a workspace.",
    },
    {
      capability: "Activation path",
      current: describeActivation(input),
      target: "Workspace creation, activation, and recovery stay on one coherent route contract.",
    },
    {
      capability: "Billing path",
      current: describeBilling(input),
      target: "Checkout becomes visible only when runtime readiness and workspace eligibility are both true.",
    },
    {
      capability: "Founder recovery",
      current: describeRecovery(input),
      target: "Recovery never disappears; the faster path can improve without removing the safe fallback.",
    },
    {
      capability: "Operational scope",
      current:
        "Research, validation, launch control, billing posture, and connected ops stay in one founder workspace.",
      target:
        "Commercial polish increases trust without widening the product into a generic startup dashboard.",
    },
  ] satisfies PublicComparisonRow[];
}

export function buildPublicMarketingContent(input: {
  activationReady: boolean;
  availabilityMode: PublicMarketingMode;
  checkoutVisible: boolean;
  firebaseEnabled: boolean;
  plans: PlatformPlan[];
  pricingVisible: boolean;
  signupAvailable: boolean;
  waitlistOpen: boolean;
}): PublicMarketingContent {
  const primaryPlanName = input.plans[0]?.name ?? "Growth";
  const comparisonRows = buildComparisonRows({
    activationReady: input.activationReady,
    availabilityMode: input.availabilityMode,
    checkoutVisible: input.checkoutVisible,
    firebaseEnabled: input.firebaseEnabled,
    pricingVisible: input.pricingVisible,
    primaryPlanName,
  });

  return {
    home: {
      founderFit: [
        {
          title: "Built for one accountable founder",
          detail:
            "The workspace is designed for the founder making the calls, so the product keeps scope tight, tradeoffs visible, and next actions obvious.",
        },
        {
          title: "Commercial clarity before automation",
          detail:
            "Founders should understand pricing, access, and the next step before automation is asked to carry trust.",
        },
        {
          title: "Launch truth stays visible",
          detail:
            "Readiness, fallback paths, and launch blockers stay visible in the product story instead of disappearing behind generic marketing gloss.",
        },
      ],
      proof: [
        {
          title: "Market work stays attached to shipping decisions",
          detail:
            "Opportunity scoring, validation evidence, specing, build readiness, and launch gates stay in one operating loop instead of scattered docs and side tools.",
        },
        {
          title: "Commercialization mirrors actual readiness",
          detail:
            "The public funnel makes it clear what is live, what is staged, and what the founder can do next without guessing.",
        },
        {
          title: "Connected ops stay in the same product surface",
          detail:
            "GitHub, Cloud Run, Stripe, and Resend belong inside the lane the founder is operating, not in a separate side checklist.",
        },
      ],
      faq: [
        {
          question: "Is MicroSaaS Factory fully self-serve today?",
          answer:
            "Not in every environment. Pricing and signup can be public while activation and checkout stay staged until the identity and billing paths are fully ready.",
        },
        {
          question: "Who is the product actually built for?",
          answer:
            "A solo technical founder who wants one operating loop from demand signal to launch gate, not a generic team workspace with blurred accountability.",
        },
        {
          question: "Why keep reviewed fallback visible?",
          answer:
            "Trust improves when the product tells the truth about recovery and reviewed access instead of pretending every environment is already fully automated.",
        },
        {
          question: "What makes the public funnel trustworthy?",
          answer:
            "The same readiness model informs the public copy, founder messaging, and operational health posture, so commercialization stays attached to the real product state.",
        },
      ],
      closing: {
        eyebrow: "Choose the right lane",
        title: "Start with the founder path that matches the current launch state.",
        detail:
          "Use signup when workspace staging is open, waitlist when reviewed intake is the better fit, and founder login when the workspace already exists.",
      },
    },
    pricing: {
      comparisonRows,
      faq: [
        {
          question: "Why show pricing before checkout is live?",
          answer:
            "Public pricing lets founders evaluate the lane and understand the commercial model early, while checkout stays staged until the billing path is fully ready.",
        },
        {
          question: "Does pricing belong to a marketing page or the workspace?",
          answer:
            "Both. Pricing is public for evaluation, but billing only becomes actionable when the workspace state and launch posture both allow it.",
        },
        {
          question: "What does the public plan include today?",
          answer:
            "The current public lane centers one founder workspace with research, validation, specing, launch control, and connected ops in the same product.",
        },
        {
          question: "What changes when checkout is enabled later?",
          answer:
            "The route contract does not change. Eligible founders simply gain the ability to move from pricing into workspace-aware checkout without a new funnel.",
        },
      ],
      closing: {
        eyebrow: "Commercial fit",
        title: "Compare the lane now, then move only as far as the current launch state allows.",
        detail:
          "Commercial clarity should arrive before commercial automation. Pricing stays public even while checkout remains deliberately staged.",
      },
    },
    signup: {
      prep: [
        {
          title: "Use the real founder email",
          detail:
            "The same email carries through signup, activation, and recovery, so duplicate-workspace mistakes stay visible instead of getting silently reprovisioned.",
        },
        {
          title: "Choose the workspace name you plan to keep",
          detail:
            "Signup creates a reusable onboarding record first. If the founder already exists, the flow should recover the existing workspace instead of creating another one.",
        },
        {
          title: "Expect activation to follow live readiness",
          detail:
            "Public signup does not guarantee immediate self-serve. The next step stays tied to the live identity and access posture for the environment.",
        },
      ],
      faq: [
        {
          question: "What happens after I submit signup details?",
          answer:
            "The workspace is staged first. From there, the same route can continue into activation or stay in reviewed mode, depending on the live rollout posture.",
        },
        {
          question: "Why not create a second workspace for the same founder email?",
          answer:
            "That would erode trust and make billing, recovery, and founder identity ambiguous. The flow now favors recovery to the existing workspace instead.",
        },
        {
          question: "Do I need Firebase configured to use signup?",
          answer:
            "No. Signup can still stage the founder record publicly while activation remains deliberate. Firebase only matters when self-serve activation is actually ready.",
        },
        {
          question: "When should I use the waitlist instead?",
          answer:
            "Use waitlist when you want reviewed intake first, when your fit is still unclear, or when a slower handoff is the better path.",
        },
      ],
      closing: {
        eyebrow: "Activation discipline",
        title: "Public signup should feel clear even when activation is still staged.",
        detail:
          "The product should explain what happens next, why it happens, and how the founder recovers if a workspace already exists.",
      },
    },
    login: {
      recovery: [
        {
          title: "Return through the same product story",
          detail:
            "Founder recovery should not feel like a hidden support flow. Login stays linked to pricing, signup, and waitlist so the path remains coherent.",
        },
        {
          title: "Keep fallback visible, not buried",
          detail:
            "Invite-token access remains a first-class recovery option whenever the faster identity path is incomplete, staged, or simply not the right fit for this founder.",
        },
        {
          title: "Match identity to the real workspace",
          detail:
            "The recovery path should reinforce that founder access is workspace-aware and identity-bound, not a detached marketing login.",
        },
      ],
      faq: [
        {
          question: "Should returning founders use Firebase or invite-token access?",
          answer:
            "Use the path the environment actually supports. When Firebase is fully available it is the faster re-entry path, but invite-token access remains valid for fallback and recovery.",
        },
        {
          question: "Why does login still mention rollout posture?",
          answer:
            "Because founder trust improves when the login page explains the current access contract instead of pretending every environment is already fully self-serve.",
        },
        {
          question: "What if the founder already completed signup but not activation?",
          answer:
            "The founder can return here and use the supported activation or fallback path rather than trying to restart onboarding from scratch.",
        },
      ],
      closing: {
        eyebrow: "Founder recovery",
        title: "Re-entry should feel deliberate, not improvised.",
        detail:
          "The login surface should make the supported path obvious while preserving a safe fallback whenever self-serve is incomplete.",
      },
    },
    waitlist: {
      review: [
        {
          title: "Use waitlist for higher-context founders",
          detail:
            "The strongest waitlist submissions explain the current bottleneck, the stack already in motion, and where founder attention is currently leaking.",
        },
        {
          title: "Keep a reviewed intake lane open",
          detail:
            "Even with public signup available, reviewed intake still matters for edge cases, recovery, and founders who should not be pushed directly into self-serve.",
        },
        {
          title: "Make the next step explicit",
          detail:
            "Waitlist should explain that the next step may be review, invite, or a redirect to signup instead of pretending every request is immediate access.",
        },
      ],
      faq: [
        {
          question: "When is waitlist the right path?",
          answer:
            "When the founder wants review before committing to signup, when fit still needs inspection, or when direct signup is not the best first step.",
        },
        {
          question: "Does waitlist replace the public signup flow?",
          answer:
            "No. Waitlist is the manual lane beside signup, not a duplicate of the same workflow.",
        },
        {
          question: "What should a strong waitlist submission include?",
          answer:
            "The current bottleneck, the stack already running, and why the founder needs a tighter operating rhythm rather than another generic startup tool.",
        },
      ],
      closing: {
        eyebrow: "Reviewed intake",
        title: "Use waitlist when context should come before automation.",
        detail:
          "A polished commercial surface still needs a deliberate reviewed lane for edge cases, recovery, and higher-context founders.",
      },
    },
  };
}
