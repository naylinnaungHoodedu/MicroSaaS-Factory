import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  buildPublicPageMetadata,
  buildPublicStructuredData,
  getPublicRouteSeoContent,
} from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicStructuredData } from "@/components/public-structured-data";
import { PublicSignupForm } from "@/components/public-signup-form";
import {
  PublicClosingCta,
  PublicFaqList,
  PublicHeroPanel,
  PublicInfoCard,
  PublicJourneyRail,
  PublicLaunchBoard,
  PublicSignalStrip,
} from "@/components/public-ui";
import { Section } from "@/components/ui";
import { buildPublicMarketingContent } from "@/lib/public-content";
import {
  createSignupIntentAction,
  initialSignupActionState,
} from "@/lib/server/public-actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  return buildPublicPageMetadata(getPublicRouteSeoContent("signup", funnel));
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const resolved = await searchParams;
  const funnel = await getPublicFunnelState({ signupIntentId: resolved.intent });
  const seo = getPublicRouteSeoContent("signup", funnel);
  const signupSurface = funnel.surfaces.signup;
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

  if (!funnel.signupAvailable || funnel.plans.length === 0) {
    redirect("/waitlist");
  }

  const defaultPlanId = funnel.plans[0]?.id ?? "";

  return (
    <PublicSiteShell mainClassName="page-shell py-10 md:py-12" footerState={funnel}>
      <PublicStructuredData
        data={buildPublicStructuredData({
          title: seo.title,
          path: "/signup",
          description: seo.description,
          faqItems: marketing.signup.faq,
          plans: funnel.pricingVisible ? funnel.plans : [],
        })}
      />

        <PublicHeroPanel
          state={funnel}
          auxiliary={
            <div className="space-y-4">
            <div>
              <p className="eyebrow text-slate-400">{signupSurface.posture.eyebrow}</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {signupSurface.posture.title}
              </p>
            </div>
            <p className="leading-7 text-slate-300">{signupSurface.posture.detail}</p>
            {signupSurface.notice ? (
              <div className="rounded-[1.35rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                {signupSurface.notice}
              </div>
            ) : null}
          </div>
          }
        >
          <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Signup should create clarity, not ambiguity. This route stages the founder
            identity, the workspace, and the commercial lane first, then hands off into
            either activation or reviewed follow-through based on the live environment.
          </p>
        <div className="mt-6">
          <PublicJourneyRail state={funnel} />
        </div>
      </PublicHeroPanel>

      <div className="mt-8">
        <PublicSignalStrip
          items={[
            {
              label: "Plan context",
              value: funnel.plans[0]?.name ?? "Growth",
              detail:
                "Signup keeps plan choice attached to the workspace from the first step.",
              tone: "cyan",
            },
            {
              label: "Founder email",
              value: "Recovery anchor",
              detail:
                "The same founder email should carry through signup, activation, login, and billing follow-through.",
              tone: "cyan",
            },
            {
              label: "Activation",
              value: funnel.activationReady ? "Ready now" : "Readiness-gated",
              detail: signupSurface.notice || signupSurface.posture.detail,
              tone: funnel.activationReady ? "emerald" : "amber",
            },
            {
              label: "Fallback",
              value: funnel.auth.firebaseEnabled ? "Invite fallback preserved" : "Invite path primary",
              detail:
                "Duplicate founders should recover the existing workspace instead of creating a second one.",
              tone: "cyan",
            },
          ]}
        />
      </div>

        <div className="mt-8">
          <PublicLaunchBoard
            blockers={funnel.launch.blockers}
            detail="Signup inherits the same launch truth as the rest of the public funnel. Founders should see why staging, activation, or reviewed access behave differently across environments."
            title="Activation and commercialization posture stay visible during signup."
          />
        </div>

      <Section
        eyebrow="Signup"
        title={signupSurface.sectionTitle}
        description={signupSurface.sectionDescription}
        className="mt-8"
      >
        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-6">
            {marketing.signup.prep.map((item) => (
              <PublicInfoCard
                key={item.title}
                eyebrow="Before you continue"
                title={item.title}
                detail={item.detail}
              />
            ))}
          </div>

          <div>
            <PublicSignupForm
              action={createSignupIntentAction}
              defaultPlanId={defaultPlanId}
              firebaseEnabled={funnel.auth.firebaseEnabled}
              firebaseTestMode={Boolean(funnel.auth.firebaseTestMode)}
              initialSignupIntent={funnel.signupIntent}
              initialState={initialSignupActionState}
              plans={funnel.plans}
              selfServeEnabled={funnel.availabilityMode === "self_serve"}
              modeCard={signupSurface.modeCard}
            />
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Recovery model"
        title="Signup should explain the next step before the founder commits."
        description="A polished signup flow makes staging, recovery, and activation posture obvious instead of forcing the founder to infer them after submission."
        className="mt-8"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PublicInfoCard
            eyebrow="Workspace continuity"
            title="The route should preserve one founder record."
            detail="When the founder already exists, the product should route to recovery instead of silently creating duplicate workspace ownership."
          />
          <PublicInfoCard
            eyebrow="Commercial continuity"
            title="The plan should stay attached."
            detail="Signup should stage the commercial context early so pricing, activation, and billing return states all point back to the same lane."
          />
          <PublicInfoCard
            eyebrow="Activation continuity"
            title="The next step should stay explicit."
            detail="Whether activation is self-serve or reviewed, the page should make the supported next move obvious."
          />
        </div>
      </Section>

      <Section
        eyebrow="FAQ"
        title="Signup questions founders should not have to guess at."
        description="This flow should explain the supported path, the fallback, and what happens when a workspace already exists."
        className="mt-8"
      >
        <PublicFaqList items={marketing.signup.faq} />
      </Section>

      <div className="mt-8">
        <PublicClosingCta
          block={marketing.signup.closing}
          primaryAction={{
            href: "/pricing",
            label: "Review pricing",
            kind: "pricing",
          }}
          secondaryAction={{
            href: funnel.waitlistOpen ? "/waitlist" : "/login",
            label: funnel.waitlistOpen ? "Request invite" : "Founder login",
            kind: funnel.waitlistOpen ? "waitlist" : "login",
          }}
        />
      </div>
    </PublicSiteShell>
  );
}
