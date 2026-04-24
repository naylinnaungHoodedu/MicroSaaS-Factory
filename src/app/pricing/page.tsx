import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  buildPublicPageMetadata,
  buildPublicStructuredData,
  getPublicRouteSeoContent,
} from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicStructuredData } from "@/components/public-structured-data";
import {
  PublicClosingCta,
  PublicComparisonTable,
  PublicFaqList,
  PublicHeroPanel,
  PublicInfoCard,
  PublicJourneyRail,
  PublicLaunchBoard,
  PublicSignalStrip,
} from "@/components/public-ui";
import { Section } from "@/components/ui";
import { buildPublicMarketingContent } from "@/lib/public-content";
import { startPlatformCheckoutAction } from "@/lib/server/actions";
import { getPublicFunnelState } from "@/lib/server/funnel";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  return buildPublicPageMetadata(getPublicRouteSeoContent("pricing", funnel));
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string; reason?: string }>;
}) {
  const funnel = await getPublicFunnelState();
  const seo = getPublicRouteSeoContent("pricing", funnel);
  const resolved = await searchParams;
  const pricingSurface = funnel.surfaces.pricing;
  const marketing = buildPublicMarketingContent({
    activationReady: funnel.activationReady,
    availabilityMode: funnel.availabilityMode,
    checkoutVisible: funnel.checkoutVisible,
    firebaseEnabled: funnel.auth.firebaseEnabled,
    plans: funnel.plans,
    pricingVisible: funnel.pricingVisible,
    signupAvailable: funnel.signupAvailable,
    waitlistOpen: funnel.waitlistOpen,
  });

  if (!funnel.pricingVisible || funnel.plans.length === 0) {
    redirect("/");
  }

  return (
    <PublicSiteShell mainClassName="page-shell py-10 md:py-12" footerState={funnel}>
      <PublicStructuredData
        data={buildPublicStructuredData({
          title: seo.title,
          path: "/pricing",
          description: seo.description,
          faqItems: marketing.pricing.faq,
          plans: funnel.pricingVisible ? funnel.plans : [],
        })}
      />

        <PublicHeroPanel
          state={funnel}
          auxiliary={
            <div className="space-y-4">
              <div>
              <p className="eyebrow text-slate-400">{pricingSurface.posture.eyebrow}</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {pricingSurface.posture.title}
              </p>
              </div>
              <p className="leading-7 text-slate-300">{pricingSurface.posture.detail}</p>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p className="eyebrow text-slate-500">What founders should expect</p>
                <p className="mt-3 leading-7">{pricingSurface.checkoutGuidance}</p>
              </div>
            </div>
          }
        >
          <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            This page exists to make the commercial lane legible before automation opens.
            Founders should be able to compare the Growth plan, understand the current
            billing posture, and know exactly how pricing reconnects to the workspace.
          </p>
        <div className="mt-6">
          <PublicJourneyRail state={funnel} />
        </div>
      </PublicHeroPanel>

      <div className="mt-8">
        <PublicSignalStrip
          items={[
            {
              label: "Public plan",
              value: funnel.plans[0]?.name ?? "Growth",
              detail:
                "Keep one founder lane visible so pricing, signup, and billing posture are easy to read.",
              tone: "cyan",
            },
            {
              label: "Monthly anchor",
              value: funnel.plans[0] ? formatCurrency(funnel.plans[0].monthlyPrice) : "TBD",
              detail:
                "Packaging should be clear before checkout becomes the next step.",
              tone: "cyan",
            },
            {
              label: "Checkout posture",
              value: funnel.checkoutVisible ? "Visible" : "Controlled",
              detail: pricingSurface.checkoutGuidance,
              tone: funnel.checkoutVisible ? "emerald" : "amber",
            },
            {
              label: "Workspace path",
              value: funnel.founder.loggedIn ? "Linked workspace" : "Public evaluation",
              detail:
                "The same pricing route should support discovery, return-state messaging, and eventual upgrade.",
              tone: funnel.founder.loggedIn ? "emerald" : "cyan",
            },
          ]}
        />
      </div>

        <div className="mt-8">
          <PublicLaunchBoard
            blockers={funnel.launch.blockers}
            detail="Pricing stays connected to launch truth. Founders can compare the lane now, while the status board keeps checkout, activation, redirect, and sender-domain readiness explicit."
            title="Billing posture stays attached to launch readiness."
          />
        </div>

      <Section
        eyebrow="Pricing"
        title="Choose the Growth lane without losing sight of the workspace path."
        description="This surface is the commercial layer for the founder workspace. Compare the lane, see the current posture, and move into checkout only when both workspace eligibility and runtime readiness allow it."
        className="mt-8"
      >
        {resolved.billing === "cancelled" ? (
          <div className="mb-6 rounded-[1.35rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            Checkout was canceled before completion. Your current workspace status has not changed.
          </div>
        ) : null}
        {resolved.billing === "error" ? (
          <div className="mb-6 rounded-[1.35rem] border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            {resolved.reason ?? "Checkout could not be started from this pricing page."}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="grid gap-6">
            {funnel.plans.map((plan) => (
              <article
                key={plan.id}
                className="glass-panel rounded-[1.9rem] p-6 shadow-xl shadow-black/15"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow text-cyan-300/80">
                    {plan.hidden ? "Beta plan" : "Public plan"}
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    {funnel.checkoutVisible ? "checkout visible" : "checkout controlled"}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <h2 className="text-3xl font-semibold tracking-tight text-white">{plan.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Built for one accountable founder workspace with research, validation,
                      specing, launch control, and connected ops in the same product.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                      <p className="eyebrow text-slate-500">Monthly</p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {formatCurrency(plan.monthlyPrice)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Start lean
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                      <p className="eyebrow text-slate-500">Annual</p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {formatCurrency(plan.annualPrice)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Commit with intent
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="rounded-[1.25rem] border border-white/10 bg-slate-950/45 px-4 py-4 text-sm text-slate-200"
                    >
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {funnel.founder.canStartCheckout ? (
                    <>
                      <form action={startPlatformCheckoutAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="billingInterval" value="monthly" />
                        <input type="hidden" name="returnPath" value="/pricing" />
                        <button type="submit" className="button-primary">
                          Start monthly checkout
                        </button>
                      </form>
                      <form action={startPlatformCheckoutAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="billingInterval" value="annual" />
                        <input type="hidden" name="returnPath" value="/pricing" />
                        <button type="submit" className="button-secondary">
                          Start annual checkout
                        </button>
                      </form>
                    </>
                  ) : funnel.founder.hasActiveSubscription ? (
                    <div className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                      Your founder workspace is already on an active paid plan.
                    </div>
                  ) : funnel.founder.subscriptionStatus === "beta" ? (
                    <div className="rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                      Reviewed founder workspaces still move through a staged billing handoff rather than instant checkout.
                    </div>
                  ) : (
                    <Link href={funnel.primaryAction.href} className="button-primary">
                      {funnel.primaryAction.label}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-6">
            <PublicInfoCard
              eyebrow={pricingSurface.currentState.eyebrow}
              title={pricingSurface.currentState.title}
              detail={pricingSurface.currentState.detail}
            />
            <PublicInfoCard
              eyebrow={pricingSurface.operator.eyebrow}
              title={pricingSurface.operator.title}
              detail={pricingSurface.operator.detail}
            >
              <div className="space-y-3">
                {[
                  "Compare the public plan and choose the lane that matches the founder workspace.",
                  "Create or reopen the workspace from signup or founder login.",
                  "Start checkout only when the workspace status and launch readiness both allow it.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </PublicInfoCard>
          </div>
        </div>
      </Section>

        <Section
          eyebrow="Commercial posture"
          title="What founders can do now versus what the launch target unlocks later."
          description="The product should make commercialization legible before it automates it. This comparison keeps the current rollout posture and the target posture in the same view."
          className="mt-8"
        >
          <PublicComparisonTable rows={marketing.pricing.comparisonRows} />
      </Section>

      <Section
        eyebrow="FAQ"
        title="Pricing questions that should be answered before checkout opens."
        description="The pricing surface should reduce ambiguity, not force founders to infer billing posture from missing buttons."
        className="mt-8"
      >
        <PublicFaqList items={marketing.pricing.faq} />
      </Section>

      <div className="mt-8">
        <PublicClosingCta
          block={marketing.pricing.closing}
          primaryAction={funnel.primaryAction}
          secondaryAction={{
            href: funnel.founder.loggedIn ? "/app" : "/login",
            label: funnel.founder.loggedIn ? "Open workspace" : "Founder login",
            kind: funnel.founder.loggedIn ? "app" : "login",
          }}
        />
      </div>
    </PublicSiteShell>
  );
}
