import type { Metadata } from "next";

import { buildPublicPageMetadata } from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { Section } from "@/components/ui";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Terms",
  description:
    "Launch-baseline terms for MicroSaaS Factory founder access, billing, integrations, and operator-controlled rollout.",
  path: "/terms",
});

const sections = [
  {
    title: "Service posture",
    body:
      "MicroSaaS Factory is a web application for solo founders managing research, validation, specing, launch readiness, and connected operating workflows. Access can remain operator-controlled in some environments even when public pricing or signup is visible.",
  },
  {
    title: "Accounts and access",
    body:
      "Founder access uses invite-token workflows, Firebase Google sign-in, or Firebase email-link sign-in depending on the live environment configuration. You are responsible for controlling access to the founder email tied to your workspace.",
  },
  {
    title: "Billing and subscriptions",
    body:
      "When platform billing is enabled, paid access is processed through Stripe Checkout. Invite-beta workspaces, trial workspaces, and active paid workspaces can follow different upgrade paths based on the current subscription state and operator rollout controls.",
  },
  {
    title: "Connected systems",
    body:
      "You may connect external systems such as GitHub, Google Cloud Run or Cloud Build, Stripe, and Resend. You are responsible for the credentials and permissions supplied for those integrations and for the consequences of actions taken in those connected services.",
  },
  {
    title: "Availability and rollout",
    body:
      "Features can be staged, hidden, or operator-gated while production readiness is verified. Public pricing, self-serve provisioning, checkout visibility, and automation can be enabled independently.",
  },
  {
    title: "Acceptable use",
    body:
      "You may not use the service to interfere with infrastructure, violate third-party terms, send abusive traffic, or store credentials or materials you do not have authority to use.",
  },
  {
    title: "Changes",
    body:
      "These baseline terms can be updated as the production launch matures. Continued use of the application after changes are published means you accept the updated terms.",
  },
] as const;

export default function TermsPage() {
  return (
    <PublicSiteShell mainClassName="page-shell py-10">
      <Section
        eyebrow="Terms"
        title="Launch-baseline terms for founder access"
        description="This is the in-app baseline for the current launch posture. It reflects the actual feature set and rollout model in the product today and can receive legal review later."
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
