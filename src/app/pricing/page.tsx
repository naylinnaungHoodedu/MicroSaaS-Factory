import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildPublicPageMetadata } from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicHeroPanel, PublicInfoCard, PublicJourneyRail } from "@/components/public-ui";
import { Section } from "@/components/ui";
import { startPlatformCheckoutAction } from "@/lib/server/actions";
import { getPublicFunnelState } from "@/lib/server/funnel";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Pricing",
  description:
    "Compare MicroSaaS Factory plan visibility, billing posture, and founder upgrade paths.",
  path: "/pricing",
});

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string; reason?: string }>;
}) {
  const funnel = await getPublicFunnelState();
  const resolved = await searchParams;

  if (!funnel.pricingVisible || funnel.plans.length === 0) {
    redirect("/");
  }

  return (
    <PublicSiteShell mainClassName="page-shell py-10">
      <PublicHeroPanel
        state={funnel}
        auxiliary={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Pricing posture
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {funnel.checkoutVisible
                  ? "Plans are visible and checkout can open when workspace status allows it."
                  : "Plans are visible, but checkout still stays operator-controlled."}
              </p>
            </div>
            <p className="leading-7 text-slate-300">
              {funnel.founder.loggedIn
                ? funnel.founder.canStartCheckout
                  ? "This founder workspace is eligible to start checkout directly from the pricing cards below."
                  : funnel.founder.hasActiveSubscription
                    ? "This founder workspace already has an active paid subscription."
                    : "This founder workspace is provisioned, but checkout still depends on the current workspace subscription state and operator flags."
                : "Public visitors can compare plans here, then continue through signup or waitlist based on the live environment mode."}
            </p>
          </div>
        }
      >
        <PublicJourneyRail state={funnel} />
      </PublicHeroPanel>

      <Section
        eyebrow="Pricing"
        title="Choose the MicroSaaS Factory lane"
        description="This pricing surface stays consistent with the public funnel state. Founders either move into signup, return to an existing workspace, or start checkout when the environment and workspace status both allow it."
      >
        {resolved.billing === "cancelled" ? (
          <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            Checkout was canceled before completion. Your current workspace status has not changed.
          </div>
        ) : null}
        {resolved.billing === "error" ? (
          <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            {resolved.reason ?? "Checkout could not be started from this pricing page."}
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
          {funnel.plans.map((plan) => (
            <article
              key={plan.id}
              className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-black/10"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                {plan.hidden ? "Beta plan" : "Public plan"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{plan.name}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Built for a single accountable founder workspace with the full research to launch operating loop.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Monthly</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {formatCurrency(plan.monthlyPrice)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Annual</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    {formatCurrency(plan.annualPrice)}
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
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
                    Invite-beta workspaces still upgrade through operator review rather than self-serve checkout.
                  </div>
                ) : (
                  <Link
                    href={funnel.primaryAction.href}
                    className="button-primary"
                  >
                    {funnel.primaryAction.label}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <PublicInfoCard
            eyebrow="Current State"
            title="The next step stays aligned with the live funnel."
            detail={
              funnel.founder.loggedIn
                ? `Current workspace subscription state: ${funnel.founder.subscriptionStatus ?? "beta"}.`
                : "Visitors can compare plans here before moving into signup or the waitlist path."
            }
          />
          <PublicInfoCard
            eyebrow="Operator Control"
            title="Billing visibility and checkout are still separate controls."
            detail="Pricing can be visible before checkout is opened. That keeps plan communication public while self-serve billing rollout remains deliberate."
          />
        </div>
      </Section>
    </PublicSiteShell>
  );
}
