import type { Metadata } from "next";

import {
  buildPublicPageMetadata,
  buildPublicStructuredData,
  getPublicRouteSeoContent,
} from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicStructuredData } from "@/components/public-structured-data";
import {
  PublicClosingCta,
  PublicEvidenceGrid,
  PublicFaqList,
  PublicHeroPanel,
  PublicInfoCard,
  PublicJourneyRail,
  PublicLaunchBoard,
  PublicSignalStrip,
  PublicTrustGrid,
} from "@/components/public-ui";
import { Section } from "@/components/ui";
import { buildPublicMarketingContent } from "@/lib/public-content";
import { getPublicFunnelState } from "@/lib/server/funnel";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  return buildPublicPageMetadata(getPublicRouteSeoContent("home", funnel));
}

export default async function Home() {
  const funnel = await getPublicFunnelState();
  const seo = getPublicRouteSeoContent("home", funnel);
  const homeSurface = funnel.surfaces.home;
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

  return (
    <PublicSiteShell mainClassName="pb-16 md:pb-20" footerState={funnel}>
      <div className="page-shell pt-8 md:pt-10">
        <PublicStructuredData
          data={buildPublicStructuredData({
            title: seo.title,
            path: "/",
            description: seo.description,
            faqItems: marketing.home.faq,
            plans: funnel.pricingVisible ? funnel.plans : [],
          })}
        />

        <PublicHeroPanel
          state={funnel}
          auxiliary={
            <div className="space-y-5">
              <div>
                <p className="eyebrow text-slate-400">{homeSurface.posture.eyebrow}</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {homeSurface.posture.title}
                </p>
              </div>
              <p className="leading-7 text-slate-300">{homeSurface.posture.detail}</p>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <p className="eyebrow text-slate-500">What founders should expect</p>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
                  <p>{homeSurface.operator.detail}</p>
                  <p>
                    The path is intentionally simple: evaluate the lane, open the workspace,
                    and keep the same commercial context through activation and return.
                  </p>
                </div>
              </div>
            </div>
          }
        >
          <p className="max-w-4xl text-base leading-8 text-slate-300 md:text-lg">
            MicroSaaS Factory replaces the scattered founder stack with one product
            surface for research, validation, specing, launch control, connected ops,
            and workspace-aware billing.
          </p>
          <div className="mt-6">
            <PublicTrustGrid cards={funnel.launch.trustCards} />
          </div>
          <div className="mt-6">
            <PublicJourneyRail state={funnel} />
          </div>
        </PublicHeroPanel>

        <div className="mt-8">
          <PublicSignalStrip
            items={[
            {
                label: "Founder lane",
                value: funnel.plans[0]
                  ? `${funnel.plans[0].name} / ${formatCurrency(funnel.plans[0].monthlyPrice)} per month`
                  : "Plan staging",
                detail:
                  "Keep one clear commercial lane live so pricing, signup, activation, and billing stay legible.",
                tone: "cyan",
              },
              {
                label: "Launch mode",
                value: funnel.summary.eyebrow,
                detail: funnel.summary.detail,
                tone: funnel.summary.tone,
              },
              {
                label: "Founder return",
                value: funnel.founder.loggedIn ? "Workspace linked" : "Public discovery",
                detail:
                  "The same route contract should support first discovery, staged signup, recovery, and workspace re-entry.",
                tone: funnel.founder.loggedIn ? "emerald" : "cyan",
              },
              {
                label: "Checkout state",
                value: funnel.checkoutVisible ? "Checkout visible" : "Checkout controlled",
                detail: funnel.launch.blockerSummary,
                tone: funnel.checkoutVisible ? "emerald" : "amber",
              },
            ]}
          />
        </div>

        <div className="mt-8">
          <PublicLaunchBoard
            blockers={funnel.launch.blockers}
            detail="Readiness stays prominent on purpose. Founders should see what is already live, what is still staged, and why activation or checkout behave the way they do before they commit."
            title="Readiness stays attached to the public promise."
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <Section
            eyebrow="Founder fit"
            title="Built for founders who already have signal and want a tighter operating rhythm."
            description="The product is intentionally narrow: one accountable founder, one workspace, and one operating loop that keeps customer evidence close to shipping and revenue decisions."
          >
            <PublicEvidenceGrid cards={marketing.home.founderFit} />
          </Section>

          <div className="space-y-6">
            <PublicInfoCard
              eyebrow={homeSurface.currentMode.eyebrow}
              title={homeSurface.currentMode.title}
              detail={homeSurface.currentMode.detail}
            >
              <div className="space-y-3">
                {[
                  "Understand the lane before you create or reopen a workspace.",
                  "Keep pricing, signup, and recovery attached to one commercial story.",
                  "See what is staged before you hit a dead-end later in the flow.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </PublicInfoCard>

            <PublicInfoCard
              eyebrow={homeSurface.operator.eyebrow}
              title={homeSurface.operator.title}
              detail={homeSurface.operator.detail}
            >
              <div className="space-y-3">
                {marketing.home.proof.slice(0, 2).map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                  >
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-2 leading-7 text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </PublicInfoCard>
          </div>
        </div>

        <Section
          eyebrow="Workflow spine"
          title="One operating rhythm from market signal to live revenue."
          description="The workspace keeps market evidence, customer validation, scope control, launch readiness, and connected systems in one accountable product flow."
          className="mt-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {homeSurface.workflowItems.map((item) => (
              <div
                key={item}
                className="rounded-[1.35rem] border border-white/10 bg-slate-950/55 p-5 text-sm leading-7 text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Operating proof"
          title="What gets materially better once the workspace is live."
          description="The founder should understand why the product exists, why commercialization stays deliberate where needed, and why connected tooling belongs in the same surface."
          className="mt-8"
        >
          <PublicEvidenceGrid cards={marketing.home.proof} />
        </Section>

        <Section
          eyebrow="FAQ"
          title="Questions founders should be able to answer before they commit."
          description="A polished launch surface should answer the hard questions directly instead of hiding them behind signup."
          className="mt-8"
        >
          <PublicFaqList items={marketing.home.faq} />
        </Section>

        <div className="mt-8">
          <PublicClosingCta
            block={marketing.home.closing}
            primaryAction={funnel.primaryAction}
            secondaryAction={
              funnel.founder.loggedIn
                ? {
                    href: "/app",
                    label: "Open workspace",
                    kind: "app",
                  }
                : funnel.signupAvailable
                  ? {
                      href: "/login",
                      label: "Founder login",
                      kind: "login",
                    }
                  : funnel.secondaryAction
            }
          />
        </div>
      </div>
    </PublicSiteShell>
  );
}
