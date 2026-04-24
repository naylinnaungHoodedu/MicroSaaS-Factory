import Link from "next/link";
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
} from "@/components/public-ui";
import { PublicWaitlistForm } from "@/components/public-waitlist-form";
import { Section } from "@/components/ui";
import { buildPublicMarketingContent } from "@/lib/public-content";
import {
  initialWaitlistActionState,
  submitWaitlistAction,
} from "@/lib/server/public-actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  return buildPublicPageMetadata(getPublicRouteSeoContent("waitlist", funnel));
}

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await searchParams;
  const funnel = await getPublicFunnelState();
  const seo = getPublicRouteSeoContent("waitlist", funnel);
  const waitlistSurface = funnel.surfaces.waitlist;
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
    <PublicSiteShell mainClassName="page-shell py-10 md:py-12" footerState={funnel}>
      <PublicStructuredData
        data={buildPublicStructuredData({
          title: seo.title,
          path: "/waitlist",
          description: seo.description,
          faqItems: marketing.waitlist.faq,
          plans: funnel.pricingVisible ? funnel.plans : [],
        })}
      />

      <PublicHeroPanel
        state={funnel}
        auxiliary={
          <div className="space-y-4">
            <div>
              <p className="eyebrow text-slate-400">{waitlistSurface.posture.eyebrow}</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {waitlistSurface.posture.title}
              </p>
            </div>
            <p className="leading-7 text-slate-300">{waitlistSurface.posture.detail}</p>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="eyebrow text-slate-500">Current public path</p>
              <p className="mt-3 leading-7">{waitlistSurface.currentPathCard.detail}</p>
            </div>
          </div>
        }
        >
          <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Waitlist is the reviewed intake lane for founders who need more context, more
            review, or a more deliberate path than direct signup can offer in the current
            environment.
          </p>
        <div className="mt-6">
          <PublicJourneyRail state={funnel} />
        </div>
      </PublicHeroPanel>

      <div className="mt-8">
        <PublicSignalStrip
          items={[
            {
              label: "Use waitlist when",
              value: "Context matters first",
              detail:
                "This lane is for founders who want review before direct signup or need a more guided activation path.",
              tone: "cyan",
            },
            {
              label: "Best submissions",
              value: "Concrete bottleneck",
              detail:
                "Tell us what is already running, where attention is leaking, and why a tighter operating loop matters now.",
              tone: "cyan",
            },
            {
              label: "Manual path",
              value: funnel.signupAvailable ? "Secondary lane" : "Primary lane",
              detail: waitlistSurface.currentPathCard.detail,
              tone: funnel.signupAvailable ? "amber" : "cyan",
            },
            {
              label: "Next step",
              value: "Review or redirect",
              detail:
                "Waitlist can lead to invite issuance, manual follow-up, or a redirect back to signup when self-serve is the better fit.",
              tone: "cyan",
            },
          ]}
        />
      </div>

        <div className="mt-8">
          <PublicLaunchBoard
            blockers={funnel.launch.blockers}
            detail="Waitlist should not feel like a dead-end form. It inherits the same launch truth as the rest of the funnel and explains why reviewed intake still exists."
            title="Reviewed intake remains part of the launch posture."
          />
        </div>

      <Section
        eyebrow="Request invite"
        title="Use the reviewed intake lane when context should come before direct signup."
        description="Use waitlist when reviewed intake is the right path for this founder. Tell us what you are building, where the workflow is dragging, and what stack is already in flight."
        className="mt-8"
      >
        <div className="grid gap-8 xl:grid-cols-[1fr_0.84fr]">
          <div>
            <PublicWaitlistForm
              action={submitWaitlistAction}
              initialState={initialWaitlistActionState}
            />
          </div>

          <div className="space-y-6">
            <PublicInfoCard
              eyebrow={waitlistSurface.fitCard.eyebrow}
              title={waitlistSurface.fitCard.title}
              detail={waitlistSurface.fitCard.detail}
            />
            <PublicInfoCard
              eyebrow={waitlistSurface.currentPathCard.eyebrow}
              title={waitlistSurface.currentPathCard.title}
              detail={waitlistSurface.currentPathCard.detail}
            >
              <div className="flex flex-wrap gap-3">
                {funnel.signupAvailable ? (
                  <Link href="/signup" className="button-secondary">
                    Open signup instead
                  </Link>
                ) : null}
                <Link href="/" className="button-secondary">
                  Back to overview
                </Link>
              </div>
            </PublicInfoCard>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Manual review"
        title="The waitlist lane should add clarity, not duplicate signup."
        description="Reviewed intake still matters when the founder needs more context, when fit is unclear, or when activation should move more deliberately."
        className="mt-8"
      >
        <PublicEvidenceGrid cards={marketing.waitlist.review} />
      </Section>

      <Section
        eyebrow="FAQ"
        title="Waitlist questions founders should not have to guess at."
        description="If waitlist is the right path, the page should explain why it exists and what happens next."
        className="mt-8"
      >
        <PublicFaqList items={marketing.waitlist.faq} />
      </Section>

      <div className="mt-8">
        <PublicClosingCta
          block={marketing.waitlist.closing}
          primaryAction={
            funnel.signupAvailable
              ? {
                  href: "/signup",
                  label: "Open signup",
                  kind: "signup",
                }
              : {
                  href: "/login",
                  label: "Founder login",
                  kind: "login",
                }
          }
          secondaryAction={{
            href: funnel.pricingVisible ? "/pricing" : "/",
            label: funnel.pricingVisible ? "Review pricing" : "Back to overview",
            kind: funnel.pricingVisible ? "pricing" : "waitlist",
          }}
        />
      </div>
    </PublicSiteShell>
  );
}
