import Link from "next/link";
import type { Metadata } from "next";

import { PublicSiteShell } from "@/components/public-shell";
import { PublicHeroPanel, PublicInfoCard, PublicJourneyRail } from "@/components/public-ui";
import { buildPublicPageMetadata } from "@/app/public-metadata";
import { Section, StatCard } from "@/components/ui";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "MicroSaaS Factory",
  description:
    "Invite-beta founder operating system for research, validation, launch gating, and connected ops.",
  path: "/",
  useAbsoluteTitle: true,
});

export default async function Home() {
  const funnel = await getPublicFunnelState();

  return (
    <PublicSiteShell mainClassName="pb-16">
      <div className="page-shell pt-8">
        <PublicHeroPanel
          state={funnel}
          auxiliary={
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Operating posture
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {funnel.availabilityMode === "self_serve"
                    ? funnel.activationReady
                      ? "Self-serve activation is live"
                      : "Self-serve is visible but not fully activation-ready"
                    : funnel.availabilityMode === "signup_intent"
                      ? "Public signup records intent behind operator review"
                      : "Invite-only beta remains active"}
                </p>
              </div>
              <p className="leading-7 text-slate-300">{funnel.activationDetail}</p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Founder login
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {funnel.auth.firebaseEnabled
                    ? "Invite access and Firebase sign-in are both available in this environment."
                    : "Invite-token access remains the active founder path until Firebase is fully configured."}
                </p>
              </div>
            </div>
          }
        >
          <p className="max-w-4xl text-base leading-8 text-slate-300 md:text-lg">
            MicroSaaS Factory turns the document strategy into a live founder workflow:
            research, validation, one-page specing, GitHub and Cloud Run ops, Stripe
            readiness, onboarding sequence management, and a hard launch gate before a
            product enters maintenance mode.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatCard
              label="Workspaces"
              value={String(funnel.metrics.workspaceCount)}
              detail="Single-owner invite-beta workspaces"
            />
            <StatCard
              label="Tracked products"
              value={String(funnel.metrics.productCount)}
              detail="Research-to-launch pipelines already in the system"
            />
            <StatCard
              label="Waitlist"
              value={String(funnel.metrics.waitlistCount)}
              detail="Founders queued for the beta"
            />
          </div>
        </PublicHeroPanel>

        <div className="mt-8">
          <PublicJourneyRail state={funnel} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Section
            eyebrow="Workflow Spine"
            title="One operating rhythm from market signal to maintenance mode."
            description="The product stays narrow on purpose: a solo technical founder gets disciplined throughput instead of a generic startup dashboard."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "Structured opportunity scoring with competition and moat calibration",
                "Validation lead logging with explicit 3-of-10 gate tracking",
                "One-page spec builder with exclusions and definition of done",
                "GitHub, Cloud Run / Cloud Build, Stripe, and Resend connection lanes",
                "Launch gate evaluation and 'ready for next product' checks",
                "Portfolio dashboard with deployment and revenue snapshots",
              ].map((item) => (
                <div key={item} className="rounded-[1.35rem] border border-white/10 bg-slate-950/55 p-5 text-sm leading-7 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </Section>

          <div className="space-y-6">
            <PublicInfoCard
              eyebrow="Current Mode"
              title="The public funnel only opens as far as the operator has actually enabled it."
              detail="Landing, pricing, signup, waitlist, and founder login now read from the same public funnel contract, so the next step stays consistent across the entire surface."
            >
              <ul className="space-y-3 text-sm leading-7 text-slate-300">
                <li>
                  Public pricing is {funnel.pricingVisible ? "visible" : "hidden"} in this
                  environment.
                </li>
                <li>
                  Checkout is {funnel.checkoutVisible ? "available when workspace status allows it" : "not visible yet"}.
                </li>
                <li>
                  Activation is {funnel.activationReady ? "ready for self-serve founders" : "still controlled by environment readiness"}.
                </li>
              </ul>
            </PublicInfoCard>

            <PublicInfoCard
              eyebrow="Why It Is Narrow"
              title="The beta is optimized for one accountable founder, not team sprawl."
              detail="MicroSaaS Factory assumes one founder, one workspace, and product lanes that must earn the right to stop consuming attention."
            >
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="button-secondary">
                  Founder login
                </Link>
                {funnel.pricingVisible ? (
                  <Link href="/pricing" className="button-secondary">
                    Review pricing
                  </Link>
                ) : null}
              </div>
            </PublicInfoCard>
          </div>
        </div>
      </div>
    </PublicSiteShell>
  );
}
