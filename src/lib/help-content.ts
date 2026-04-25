import type { PublicFaqItem } from "@/lib/public-content";

export type HelpAnchor = {
  href: string;
  label: string;
};

export type HelpArea = {
  capabilities: string[];
  href?: string;
  recommendedSteps: string[];
  title: string;
};

export type HelpPriorityItem = {
  detail: string;
  href?: string;
  label: string;
  signal: string;
};

export type HelpStatusGroup = {
  detail: string;
  items: Array<{
    detail: string;
    label: string;
  }>;
  title: string;
};

export type HelpTroubleshootingItem = {
  recovery: string;
  symptom: string;
};

export type HelpWorkflowStep = {
  detail: string;
  href?: string;
  label: string;
};

export const HELP_PRIORITY_PATHS: Record<"public" | "workspace", readonly HelpPriorityItem[]> = {
  public: [
    {
      label: "Confirm the supported entry path",
      signal: "Start",
      detail:
        "Use pricing, signup, waitlist, or founder login based on the launch posture shown today.",
      href: "/pricing",
    },
    {
      label: "Preserve the same founder email",
      signal: "Identity",
      detail:
        "Return with the same email if signup says a workspace already exists, so activation does not fork ownership.",
      href: "/login",
    },
    {
      label: "Read staged states as instructions",
      signal: "Recovery",
      detail:
        "Controlled checkout, staged activation, or review labels mean the next safe step is visible, not missing.",
    },
  ],
  workspace: [
    {
      label: "Triage CRM pressure",
      signal: "Attention",
      detail:
        "Handle overdue, due-today, and pending-analysis work before creating more product motion.",
      href: "/app/crm",
    },
    {
      label: "Open the lane with the clearest gap",
      signal: "Lane",
      detail:
        "Move from Help into the product lane whose launch, evidence, or integration state needs attention now.",
      href: "/app",
    },
    {
      label: "Check launch and billing posture",
      signal: "Readiness",
      detail:
        "Use gate status, checkout posture, MRR, and support load before opening another product lane.",
      href: "/pricing",
    },
  ],
} as const;

export const HELP_ANCHORS: HelpAnchor[] = [
  { href: "#quick-start", label: "Quick start" },
  { href: "#workspace-map", label: "Workspace map" },
  { href: "#workflow-map", label: "Workflow map" },
  { href: "#status-meanings", label: "Status meanings" },
  { href: "#troubleshooting", label: "Troubleshooting" },
] as const;

export const HELP_WORKFLOW_STEPS: HelpWorkflowStep[] = [
  {
    label: "Choose the entry path",
    detail:
      "Use pricing, signup, waitlist, or founder login based on the launch posture shown now.",
    href: "/pricing",
  },
  {
    label: "Open the founder workspace",
    detail:
      "Activate through the supported identity path and keep one workspace tied to one founder email.",
    href: "/app",
  },
  {
    label: "Create a product lane",
    detail:
      "Capture the product thesis, target user, pricing hypothesis, core problem, and moat.",
    href: "/app",
  },
  {
    label: "Run research and validation",
    detail:
      "Score opportunities, capture leads, analyze transcripts, and keep follow-up work visible.",
    href: "/app/crm",
  },
  {
    label: "Spec, build, and connect ops",
    detail:
      "Turn evidence into a spec, then connect GitHub, Cloud Run, Stripe, and Resend where applicable.",
  },
  {
    label: "Evaluate launch readiness",
    detail:
      "Use launch checks, billing posture, CRM pressure, and operational blockers before opening the next lane.",
  },
] as const;

export const HELP_AREAS: HelpArea[] = [
  {
    title: "Dashboard",
    href: "/app",
    capabilities: [
      "Review portfolio health, launch gates, billing posture, and recent activity in one place.",
      "Create or reopen product lanes without losing the workspace context.",
      "Decide whether the portfolio can support another product lane.",
    ],
    recommendedSteps: [
      "Start every work session here before changing scope or billing.",
      "Use active, archived, and ready-for-next counts to decide where attention goes first.",
      "Open the product lane that has the clearest next operating move.",
    ],
  },
  {
    title: "Workspace CRM",
    href: "/app/crm",
    capabilities: [
      "Track due, overdue, snoozed, and pending validation work across active products.",
      "Review transcript analyses, objections, pain points, and follow-up tasks.",
      "Keep repeated customer signals close to product and launch decisions.",
    ],
    recommendedSteps: [
      "Check overdue and due-today work before creating new research.",
      "Review pending analysis when CRM insight looks incomplete or stale.",
      "Use objection clusters to sharpen positioning and scope.",
    ],
  },
  {
    title: "Product lanes",
    href: "/app",
    capabilities: [
      "Move one product through research, validation, spec, build, ops, and launch.",
      "Keep the product thesis, target user, pricing, and launch checklist together.",
      "Archive lanes without losing their operating record or recovery path.",
    ],
    recommendedSteps: [
      "Open the lane with the largest launch, evidence, or integration gap.",
      "Use the stage navigation instead of jumping across unrelated forms.",
      "Archive lanes that should not affect active portfolio decisions.",
    ],
  },
  {
    title: "Pricing and billing",
    href: "/pricing",
    capabilities: [
      "Compare the public Growth lane and current checkout posture.",
      "Keep billing eligibility tied to workspace state and runtime readiness.",
      "Return to the workspace without losing the commercial context.",
    ],
    recommendedSteps: [
      "Use public pricing to understand the active commercial lane.",
      "Start checkout only when workspace eligibility and runtime posture allow it.",
      "Treat controlled checkout as a readiness signal, not as missing navigation.",
    ],
  },
  {
    title: "Connected operations",
    capabilities: [
      "Inspect GitHub, Cloud Run, Stripe, and Resend connection status inside product lanes.",
      "Refresh integration snapshots before trusting stale launch evidence.",
      "Keep deployment, billing, and onboarding signals attached to product readiness.",
    ],
    recommendedSteps: [
      "Connect only the systems needed for the current lane stage.",
      "Refresh stale integrations before evaluating launch readiness.",
      "Resolve provider warnings before treating a launch gate as complete.",
    ],
  },
  {
    title: "Recovery and access",
    href: "/login",
    capabilities: [
      "Return to an existing workspace through Firebase or invite-token fallback.",
      "Recover staged signup work without creating duplicate founder ownership.",
      "Keep the supported access path visible while self-serve rollout evolves.",
    ],
    recommendedSteps: [
      "Use founder login if signup reports an existing workspace.",
      "Keep invite-token fallback visible for reviewed recovery.",
      "Use the same founder email across signup, login, pricing, and billing.",
    ],
  },
] as const;

export const HELP_STATUS_GROUPS: HelpStatusGroup[] = [
  {
    title: "Product stages",
    detail:
      "Stages describe where a product lane is in the factory workflow, not whether the idea is good.",
    items: [
      {
        label: "Research",
        detail: "Capture opportunity evidence, pain, audience, competition, and pricing signals.",
      },
      {
        label: "Validate",
        detail: "Log leads, touchpoints, transcripts, CRM tasks, objections, and buying signals.",
      },
      {
        label: "Spec",
        detail: "Turn evidence into scope, exclusions, launch criteria, and definition of done.",
      },
      {
        label: "Build",
        detail: "Track repository, delivery, and connected-ops posture before calling the product launch-ready.",
      },
      {
        label: "Launch",
        detail: "Evaluate integrations, revenue, support load, blockers, and final readiness checks.",
      },
      {
        label: "Stabilize",
        detail: "Keep support load, revenue, blockers, and ops calm enough to consider the next lane.",
      },
    ],
  },
  {
    title: "CRM states",
    detail:
      "CRM state explains what validation work needs founder attention across all active lanes.",
    items: [
      {
        label: "Due today",
        detail: "A follow-up is ready for action now and should be handled before new outreach.",
      },
      {
        label: "Overdue",
        detail: "A validation task missed its intended window and may be damaging follow-through.",
      },
      {
        label: "Snoozed",
        detail: "A task was intentionally delayed and will return when its reminder window arrives.",
      },
      {
        label: "Pending analysis",
        detail: "A transcript was captured, but CRM intelligence extraction is not complete yet.",
      },
    ],
  },
  {
    title: "Launch and billing posture",
    detail:
      "Readiness labels explain what is live, staged, controlled, or blocked in the current environment.",
    items: [
      {
        label: "Live",
        detail: "The surface is available in the current environment and can be used directly.",
      },
      {
        label: "Staged",
        detail: "The route or workflow exists, but final activation depends on readiness checks.",
      },
      {
        label: "Controlled",
        detail: "The action is intentionally hidden or gated until credentials, webhooks, policy, or readiness proof is complete.",
      },
      {
        label: "Blocked",
        detail: "A concrete issue must be resolved before the product should claim launch readiness.",
      },
    ],
  },
  {
    title: "Integration states",
    detail:
      "Integration state tells you whether external proof can be trusted for launch decisions.",
    items: [
      {
        label: "Connected",
        detail: "The provider has an active snapshot or configuration that can support workspace evidence.",
      },
      {
        label: "Pending",
        detail: "The setup path exists, but a refresh, provider response, or missing value is still needed.",
      },
      {
        label: "Error",
        detail: "The provider call or saved configuration failed and should be fixed before launch review.",
      },
      {
        label: "Not connected",
        detail: "The product lane has not attached that provider yet, so the related proof is unavailable.",
      },
    ],
  },
] as const;

export const HELP_TROUBLESHOOTING: HelpTroubleshootingItem[] = [
  {
    symptom: "Signup says a workspace already exists.",
    recovery:
      "Use Founder login with the same founder email. MicroSaaS Factory recovers the existing workspace instead of creating duplicate ownership.",
  },
  {
    symptom: "Checkout buttons are not visible.",
    recovery:
      "Open Pricing and the workspace billing section. Checkout stays controlled until workspace eligibility and runtime billing readiness are both true.",
  },
  {
    symptom: "CRM insight looks incomplete.",
    recovery:
      "Open Workspace CRM, review pending analysis, then return to the product validation lane if a transcript needs retry or more context.",
  },
  {
    symptom: "A launch gate is blocked.",
    recovery:
      "Review the launch checklist, integration status, revenue metrics, support load, and critical blockers before re-running the launch gate.",
  },
  {
    symptom: "GitHub, Cloud Run, Stripe, or Resend data looks stale.",
    recovery:
      "Refresh the specific integration inside the product ops or build stage before trusting the snapshot in a launch decision.",
  },
  {
    symptom: "A product is no longer part of active work.",
    recovery:
      "Archive the lane to remove it from active rollups while preserving the URL, activity record, and restore path.",
  },
] as const;

export const HELP_FAQ: PublicFaqItem[] = [
  {
    question: "Is Help public or workspace-only?",
    answer:
      "Both. Public Help explains the product path before a founder signs in, while workspace Help adds current portfolio, CRM, launch, and billing context.",
  },
  {
    question: "Why does Help mention staged or controlled features?",
    answer:
      "MicroSaaS Factory keeps launch truth visible. If activation, checkout, or provider proof is staged, Help should explain the next recoverable step.",
  },
  {
    question: "Where should a founder start after opening the workspace?",
    answer:
      "Start on the Dashboard, review CRM pressure and launch posture, then open the product lane with the clearest evidence, integration, or billing gap.",
  },
  {
    question: "Does Help create support tickets or change workspace data?",
    answer:
      "No. The Help Center is read-only guidance. It links back to the existing workspace, CRM, pricing, login, and product-lane surfaces.",
  },
] as const;
