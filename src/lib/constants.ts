import type {
  FeatureFlags,
  IntegrationProvider,
  PlatformPlan,
  ProductStage,
  ValidationLeadStatus,
  ValidationSessionChannel,
  ValidationTouchpointOutcome,
  ValidationTouchpointType,
  ValidationTaskState,
  ValidationTaskType,
} from "@/lib/types";

export const PRODUCT_STAGES: ProductStage[] = [
  "research",
  "validate",
  "spec",
  "build",
  "launch",
  "stabilize",
];

export const STAGE_LABELS: Record<ProductStage, string> = {
  research: "Research",
  validate: "Validate",
  spec: "Spec",
  build: "Build",
  launch: "Launch",
  stabilize: "Stabilize",
};

export const INTEGRATION_LABELS: Record<IntegrationProvider, string> = {
  github: "GitHub",
  gcp: "Google Cloud",
  stripe: "Stripe",
  resend: "Resend",
};

export const VALIDATION_STATUSES: ValidationLeadStatus[] = [
  "queued",
  "contacted",
  "interested",
  "enthusiastic",
  "declined",
];

export const VALIDATION_TOUCHPOINT_TYPES: ValidationTouchpointType[] = [
  "dm",
  "email",
  "call",
  "follow-up",
  "demo",
  "reservation",
];

export const VALIDATION_TOUCHPOINT_OUTCOMES: ValidationTouchpointOutcome[] = [
  "sent",
  "replied",
  "positive",
  "booked",
  "declined",
  "no-response",
];

export const VALIDATION_SESSION_CHANNELS: ValidationSessionChannel[] = [
  "call",
  "demo",
  "email",
  "dm",
  "follow-up",
  "other",
];

export const VALIDATION_TASK_TYPES: ValidationTaskType[] = [
  "email",
  "dm",
  "call",
  "follow-up",
];

export const VALIDATION_TASK_STATES: ValidationTaskState[] = [
  "queued",
  "due",
  "snoozed",
  "done",
  "canceled",
];

export const LEGACY_INVITE_ONLY_FEATURE_FLAGS: FeatureFlags = {
  inviteOnlyBeta: true,
  publicWaitlist: true,
  publicSignupEnabled: false,
  selfServeProvisioningEnabled: false,
  checkoutEnabled: false,
  platformBillingEnabled: false,
  proAiEnabled: false,
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  inviteOnlyBeta: true,
  publicWaitlist: true,
  publicSignupEnabled: true,
  selfServeProvisioningEnabled: false,
  checkoutEnabled: false,
  platformBillingEnabled: true,
  proAiEnabled: false,
};

export const DEFAULT_EMAIL_SEQUENCE = [
  { day: 0, key: "day-0", title: "Welcome", subject: "Welcome to your launch lane" },
  { day: 1, key: "day-1", title: "Nudge", subject: "Have you completed the core task?" },
  { day: 3, key: "day-3", title: "Case study", subject: "How founders use this workflow" },
  { day: 7, key: "day-7", title: "Upgrade cue", subject: "What unlocks on the Pro tier" },
  { day: 14, key: "day-14", title: "Roadmap feedback", subject: "What is still blocking value?" },
] as const;

export const BETA_PLATFORM_PLAN_ID = "beta-invite";
export const DEFAULT_BETA_PLATFORM_PLAN = {
  id: BETA_PLATFORM_PLAN_ID,
  name: "Invite Beta",
  hidden: true,
  monthlyPrice: 49,
  annualPrice: 490,
  features: [
    "Single-founder workspace",
    "GitHub + GCP + Stripe + Resend connections",
    "Research, spec, launch gate, and portfolio views",
  ],
} satisfies PlatformPlan;

export const DEFAULT_PUBLIC_GROWTH_PLAN = {
  id: "growth",
  name: "Growth",
  hidden: false,
  monthlyPrice: 99,
  annualPrice: 990,
  features: [
    "Single-founder workspace",
    "Operator-reviewed signup and invite conversion",
    "Research, spec, launch gate, and portfolio views",
  ],
} satisfies PlatformPlan;
