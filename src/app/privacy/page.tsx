import type { Metadata } from "next";

import { buildPublicPageMetadata } from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { Section } from "@/components/ui";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Privacy",
  description:
    "Launch-baseline privacy disclosure for MicroSaaS Factory self-serve onboarding, authentication, billing, integrations, and essential storage.",
  path: "/privacy",
});

const sections = [
  {
    title: "What this baseline covers",
    body:
      "This privacy page describes the current MicroSaaS Factory launch posture. It covers self-serve founder onboarding, Firebase authentication, Firestore persistence, Stripe billing, Resend onboarding email flows, GitHub or GCP integration data, session cookies, and the email-link localStorage helper used during Firebase email-link sign-in.",
  },
  {
    title: "Account and workspace data",
    body:
      "The application stores founder identity details such as name, email address, workspace name, invite/signup status, activation state, subscription status, and session metadata needed to let founders reopen their workspace.",
  },
  {
    title: "Product and operating data",
    body:
      "Workspace records can include product descriptions, validation leads, touchpoints, CRM tasks, spec content, build notes, launch gates, activity history, and integration health data.",
  },
  {
    title: "Payments and transactional services",
    body:
      "When billing is enabled, Stripe handles checkout and subscription events. Resend can be used for onboarding or test email delivery. The application stores only the billing and delivery data needed to track workspace status, not full card details.",
  },
  {
    title: "Connected integrations",
    body:
      "If you connect GitHub, Google Cloud, Stripe, or Resend to a product lane, the application stores encrypted credentials and operational metadata required to sync connection health, deployment status, billing summaries, and onboarding readiness.",
  },
  {
    title: "Cookies and local storage",
    body:
      "MicroSaaS Factory currently uses essential session cookies for founder or admin access and uses localStorage only for the Firebase email-link sign-in helper. Non-essential analytics, ad tracking, and marketing pixels are not enabled by default in this release.",
  },
  {
    title: "Retention and access",
    body:
      "Data remains in the configured backing store for the environment, which can be local JSON in development or Firestore in production. Access is limited by application authentication, runtime secrets, and the live rollout posture for self-serve, billing, and invite-assisted access.",
  },
  {
    title: "Future updates",
    body:
      "This is a launch-baseline privacy disclosure and can be revised as the production environment, analytics posture, or legal requirements evolve.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <PublicSiteShell mainClassName="page-shell py-10">
      <Section
        eyebrow="Privacy"
        title="Launch-baseline privacy disclosure"
        description="This in-app baseline matches the product behavior in the current codebase and deployment model. It is intentionally explicit about essential cookies and the absence of non-essential analytics by default."
      >
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
            </div>
          ))}
        </div>
      </Section>
    </PublicSiteShell>
  );
}
