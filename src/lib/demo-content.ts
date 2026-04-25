import type { PublicFaqItem } from "@/lib/public-content";

export type DemoAnchor = {
  href: string;
  label: string;
};

export type DemoPriorityItem = {
  detail: string;
  href?: string;
  label: string;
  signal: string;
};

export type DemoOperatingModelCard = {
  detail: string;
  label: string;
  value: string;
};

export type DemoWorkflowItem = {
  detail: string;
  href?: string;
  label: string;
};

export type DemoTourStep = {
  detail: string;
  href?: string;
  metricDetail: string;
  metricLabel: string;
  metricTone: "amber" | "cyan" | "emerald";
  metricValue: string;
  proofPoints: string[];
  title: string;
};

export type DemoProofCard = {
  detail: string;
  signal: string;
  title: string;
};

export const DEMO_ANCHORS: DemoAnchor[] = [
  { href: "#demo-quick-start", label: "Quick start" },
  { href: "#demo-guided-tour", label: "Guided tour" },
  { href: "#demo-readiness", label: "Readiness" },
  { href: "#demo-workflow-spine", label: "Workflow spine" },
  { href: "#demo-operating-proof", label: "Operating proof" },
  { href: "#demo-faq", label: "FAQ" },
] as const;

export const DEMO_PRIORITY_PATHS: Record<"public" | "workspace", readonly DemoPriorityItem[]> = {
  public: [
    {
      label: "Understand the lane",
      signal: "Start",
      detail:
        "Review who MicroSaaS Factory is for, what is live now, and how the product keeps founder work in one operating loop.",
      href: "/",
    },
    {
      label: "Choose the commercial path",
      signal: "Pricing",
      detail:
        "Compare the visible Growth lane, then use signup, waitlist, or founder login based on the current launch posture.",
      href: "/pricing",
    },
    {
      label: "Open or recover the workspace",
      signal: "Access",
      detail:
        "Use the same founder identity through signup and login so activation, billing, and recovery do not fork the workspace.",
      href: "/signup",
    },
  ],
  workspace: [
    {
      label: "Read the control tower",
      signal: "Dashboard",
      detail:
        "Start from portfolio counts, next action, billing posture, launch gates, and active product pressure before changing scope.",
      href: "/app",
    },
    {
      label: "Triage validation pressure",
      signal: "CRM",
      detail:
        "Resolve overdue, due-today, and pending analysis work before adding more founder motion to the portfolio.",
      href: "/app/crm",
    },
    {
      label: "Open the active lane",
      signal: "Product",
      detail:
        "Move into the product lane with the clearest evidence, integration, launch, or revenue gap.",
      href: "/app",
    },
  ],
} as const;

export const DEMO_OPERATING_MODEL_CARDS: DemoOperatingModelCard[] = [
  {
    label: "Operating model",
    value: "Guided signup",
    detail:
      "Pricing and signup can be public while final activation still follows launch readiness.",
  },
  {
    label: "Commercial posture",
    value: "Public pricing",
    detail:
      "Founders can compare the Growth lane before activation or checkout asks them to commit.",
  },
  {
    label: "Founder access",
    value: "Invite-aware",
    detail:
      "Founder login and invite-token fallback stay visible while faster identity paths mature.",
  },
] as const;

export const DEMO_WORKFLOW_SPINE: DemoWorkflowItem[] = [
  {
    label: "Score market demand",
    detail:
      "Use a repeatable opportunity rubric and AI-backed readouts before product scope grows.",
    href: "/app",
  },
  {
    label: "Run validation in one lane",
    detail:
      "Keep leads, interviews, objections, transcripts, and follow-up work attached to product decisions.",
    href: "/app/crm",
  },
  {
    label: "Turn evidence into scope",
    detail:
      "Convert market signal into a one-page spec with launch criteria and explicit exclusions.",
    href: "/app",
  },
  {
    label: "Attach connected operations",
    detail:
      "Review GitHub, Cloud Run, Stripe, and Resend posture beside the product instead of in side documents.",
    href: "/app",
  },
  {
    label: "Evaluate launch truth",
    detail:
      "Use gate status, checkout posture, CRM pressure, and external verification before public motion.",
    href: "/pricing",
  },
  {
    label: "Operate the portfolio",
    detail:
      "Compare active lanes, support load, billing posture, and readiness for the next product slot.",
    href: "/app",
  },
] as const;

export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    title: "Signal",
    detail:
      "Start with the market thesis, target buyer, pricing hypothesis, and the one problem the founder is trying to prove.",
    href: "/app",
    metricLabel: "First readout",
    metricValue: "Opportunity score",
    metricDetail: "Demand, urgency, pain, and moat are reviewed before scope grows.",
    metricTone: "cyan",
    proofPoints: [
      "Capture product thesis and target user in one lane.",
      "Keep pricing and moat assumptions visible from the first pass.",
      "Separate real signal from founder enthusiasm before build work expands.",
    ],
  },
  {
    title: "Validate",
    detail:
      "Move customer discovery into a CRM lane that keeps leads, touchpoints, transcripts, objections, and follow-up work together.",
    href: "/app/crm",
    metricLabel: "CRM loop",
    metricValue: "Follow-up debt",
    metricDetail: "Due work, objections, and buying signals stay attached to product decisions.",
    metricTone: "amber",
    proofPoints: [
      "Track validation targets and touchpoints beside transcript analysis.",
      "Turn sessions into CRM intelligence and follow-up tasks.",
      "Use recurring objections to tighten positioning and scope.",
    ],
  },
  {
    title: "Spec",
    detail:
      "Translate validation evidence into scope, exclusions, launch criteria, and a definition of done the founder can actually operate.",
    href: "/app",
    metricLabel: "Scope control",
    metricValue: "One-page spec",
    metricDetail: "Evidence becomes a build contract instead of a loose backlog.",
    metricTone: "cyan",
    proofPoints: [
      "Keep v1 features and exclusions explicit.",
      "Connect launch criteria to the customer evidence already collected.",
      "Stop unreviewed ideas from becoming hidden delivery commitments.",
    ],
  },
  {
    title: "Build",
    detail:
      "Attach delivery state to the same product lane so repository, Cloud Run, Stripe, and Resend posture do not drift away from the launch decision.",
    href: "/app",
    metricLabel: "Connected ops",
    metricValue: "4 lanes",
    metricDetail: "GitHub, Cloud Run, Stripe, and Resend can be reviewed beside the product.",
    metricTone: "emerald",
    proofPoints: [
      "Review implementation state without leaving the product lane.",
      "Refresh provider snapshots before trusting old operational evidence.",
      "Keep billing and onboarding readiness visible during delivery.",
    ],
  },
  {
    title: "Launch",
    detail:
      "Use launch gates, checkout posture, CRM pressure, and external verification to decide whether the product is ready for public motion.",
    href: "/pricing",
    metricLabel: "Launch gate",
    metricValue: "Pass / review",
    metricDetail: "Readiness is shown as an operating decision, not a marketing claim.",
    metricTone: "amber",
    proofPoints: [
      "Inspect blockers before moving a product toward revenue.",
      "Keep checkout controlled until workspace and runtime readiness are true.",
      "Use final edge and sender-domain checks as explicit launch evidence.",
    ],
  },
  {
    title: "Operate",
    detail:
      "Return to the founder control tower to compare active lanes, support load, billing posture, and readiness for the next product slot.",
    href: "/app",
    metricLabel: "Factory rhythm",
    metricValue: "Portfolio view",
    metricDetail: "The workspace compounds only when current lanes are calm enough.",
    metricTone: "emerald",
    proofPoints: [
      "Review active, archived, passed-gate, and ready-for-next counts.",
      "Use activity history to see what changed and why.",
      "Open another lane only when support, CRM, and launch posture allow it.",
    ],
  },
];

export const DEMO_PROOF_CARDS: DemoProofCard[] = [
  {
    signal: "Continuity",
    title: "One founder record carries the journey.",
    detail:
      "Pricing, signup, login, workspace recovery, and product lanes stay tied to one founder context instead of fragmenting into separate tools.",
  },
  {
    signal: "Readiness",
    title: "Launch truth stays visible.",
    detail:
      "The demo keeps staged activation, controlled checkout, and external verification in view so founders understand what is live, staged, or still under review.",
  },
  {
    signal: "Operations",
    title: "Connected systems stay inside the lane.",
    detail:
      "GitHub, Cloud Run, Stripe, Resend, CRM intelligence, and billing posture are treated as product operating evidence, not a side checklist.",
  },
];

export const DEMO_FAQ: PublicFaqItem[] = [
  {
    question: "Does the Demo tab create or mutate workspace data?",
    answer:
      "No. The Demo tab is a read-only walkthrough. It links to existing signup, pricing, login, dashboard, CRM, and product-lane surfaces without creating new records.",
  },
  {
    question: "Why is there a public demo and a workspace demo?",
    answer:
      "The public demo explains the operating loop before signup. The workspace demo uses current founder context so signed-in founders can see the same loop with their own portfolio signals.",
  },
  {
    question: "Does this replace the Help Center?",
    answer:
      "No. Help is recovery and operating guidance. Demo is a guided tour of how MicroSaaS Factory moves from signal to validation, build, launch, and ongoing operation.",
  },
  {
    question: "Why does the demo mention staged or controlled states?",
    answer:
      "MicroSaaS Factory keeps rollout truth visible. Staged activation or controlled checkout are shown as readiness states, not hidden failures.",
  },
  {
    question: "Why does Demo link back to existing surfaces?",
    answer:
      "The Demo tab should explain the product without inventing a second workflow. Every path points back to signup, pricing, dashboard, CRM, or product lanes that already exist.",
  },
];
