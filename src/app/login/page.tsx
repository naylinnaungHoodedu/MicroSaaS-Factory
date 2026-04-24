import Link from "next/link";
import type { Metadata } from "next";

import {
  buildPublicPageMetadata,
  buildPublicStructuredData,
  getPublicRouteSeoContent,
} from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { FirebaseLoginPanel } from "@/components/firebase-login-panel";
import { PublicStructuredData } from "@/components/public-structured-data";
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
import { loginAction } from "@/lib/server/actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  return buildPublicPageMetadata(getPublicRouteSeoContent("login", funnel));
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolved = await searchParams;
  const funnel = await getPublicFunnelState();
  const seo = getPublicRouteSeoContent("login", funnel);
  const loginSurface = funnel.surfaces.login;
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
          path: "/login",
          description: seo.description,
          faqItems: marketing.login.faq,
          plans: funnel.pricingVisible ? funnel.plans : [],
        })}
      />

      <PublicHeroPanel
        state={funnel}
        auxiliary={
          <div className="space-y-4">
            <div>
              <p className="eyebrow text-slate-400">{loginSurface.posture.eyebrow}</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {loginSurface.posture.title}
              </p>
            </div>
            <p className="leading-7 text-slate-300">{loginSurface.posture.detail}</p>
            {loginSurface.notice ? (
              <div className="rounded-[1.35rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                {loginSurface.notice}
              </div>
            ) : null}
          </div>
        }
        >
          <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Returning founders should see the fastest supported path first, the fallback
            path second, and a clear explanation of why both still exist in this
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
              label: "Primary path",
              value: funnel.auth.firebaseEnabled ? "Firebase sign-in" : "Invite token",
              detail: loginSurface.sectionDescription,
              tone: funnel.auth.firebaseEnabled ? "emerald" : "amber",
            },
            {
              label: "Fallback",
              value: "Always preserved",
              detail:
                "Invite-token recovery stays visible even when Firebase is available, so workspace access never depends on one path only.",
              tone: "cyan",
            },
            {
              label: "Founder identity",
              value: "Workspace-aware",
              detail:
                "Recovery should reinforce that founder access is tied to the real workspace and founder email.",
              tone: "cyan",
            },
            {
              label: "Recovery goal",
              value: "Fast return, no duplicate setup",
              detail:
                "Returning founders should reopen the same workspace instead of restarting onboarding.",
              tone: "cyan",
            },
          ]}
        />
      </div>

        <div className="mt-8">
          <PublicLaunchBoard
            blockers={funnel.launch.blockers}
            detail="The login surface should stay honest about launch posture. Founders need recovery that works even when self-serve or checkout are still partially staged."
            title="Recovery posture stays visible, not buried."
          />
        </div>

      <Section
        eyebrow="Founder access"
        title={loginSurface.sectionTitle}
        description={loginSurface.sectionDescription}
        className="mt-8"
      >
        {resolved.error === "invalid_invite" ? (
          <div className="mb-6 rounded-[1.35rem] border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            The invite email or token is invalid for this workspace.
          </div>
        ) : null}

        {funnel.auth.firebaseEnabled ? (
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              <FirebaseLoginPanel
                enabled={funnel.auth.firebaseEnabled}
                testMode={Boolean(funnel.auth.firebaseTestMode)}
                redirectTo="/login"
                mode="login"
              />
              <PublicInfoCard
                eyebrow={loginSurface.modeCard.eyebrow}
                title={loginSurface.modeCard.title}
                detail={loginSurface.modeCard.detail}
              >
                <p className="text-sm leading-7 text-slate-300">
                  Firebase is the fastest return path for provisioned founders in this
                  environment, but recovery still preserves a deliberate fallback.
                </p>
                {funnel.auth.firebaseError ? (
                  <p className="mt-3 text-sm leading-7 text-amber-100">
                    Firebase is partially configured but not ready: {funnel.auth.firebaseError}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={funnel.primaryAction.href} className="button-primary">
                    {funnel.primaryAction.label}
                  </Link>
                  <Link href="/" className="button-secondary">
                    Back home
                  </Link>
                </div>
              </PublicInfoCard>
            </div>

            <form
              action={loginAction}
              className="glass-panel space-y-5 rounded-[1.7rem] p-6 shadow-lg shadow-black/10"
            >
              <div>
                <p className="eyebrow text-slate-400">Fallback recovery</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  Invite-token access stays available.
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Use the founder email and invite token already tied to this workspace.
                  This path stays active so recovery never depends on one provider alone.
                </p>
              </div>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Invite email</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="founder@company.com"
                  autoComplete="email"
                />
                <span className="field-hint">
                  Use the founder email already associated with the workspace or invite.
                </span>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Invite token</span>
                <input
                  name="token"
                  required
                  placeholder="Paste your invite token"
                  autoComplete="off"
                />
                <span className="field-hint">
                  The invite-token path remains valid for fallback, recovery, and reviewed access.
                </span>
              </label>
              <button type="submit" className="button-primary">
                Enter workspace
              </button>
            </form>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.82fr_1fr]">
            <PublicInfoCard
              eyebrow={loginSurface.modeCard.eyebrow}
              title={loginSurface.modeCard.title}
              detail={loginSurface.modeCard.detail}
            >
              <p className="text-sm leading-7 text-slate-300">
                Firebase sign-in is not configured in this environment, so invite-token
                access remains the supported founder return path.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={funnel.primaryAction.href} className="button-primary">
                  {funnel.primaryAction.label}
                </Link>
                <Link href="/" className="button-secondary">
                  Back home
                </Link>
              </div>
            </PublicInfoCard>

            <form
              action={loginAction}
              className="glass-panel space-y-5 rounded-[1.7rem] p-6 shadow-lg shadow-black/10"
            >
              <div>
                <p className="eyebrow text-slate-400">Invite token</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  Sign in with your invite.
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Use the founder email and invite token already tied to this workspace.
                </p>
              </div>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Invite email</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="founder@company.com"
                  autoComplete="email"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Invite token</span>
                <input
                  name="token"
                  required
                  placeholder="Paste your invite token"
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="button-primary">
                Enter workspace
              </button>
            </form>
          </div>
        )}
      </Section>

      <Section
        eyebrow="Recovery model"
        title="Founder recovery should feel coherent across the whole public surface."
        description="Login is not a detached support page. It should explain the supported path, the fallback, and what the founder should do next if the workspace already exists."
        className="mt-8"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {marketing.login.recovery.map((item) => (
            <PublicInfoCard
              key={item.title}
              eyebrow="Recovery principle"
              title={item.title}
              detail={item.detail}
            />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="FAQ"
        title="Recovery questions should be answered before founders get stuck."
        description="A polished login page tells the truth about rollout posture while still giving provisioned founders a fast path back into the workspace."
        className="mt-8"
      >
        <PublicFaqList items={marketing.login.faq} />
      </Section>

      <div className="mt-8">
        <PublicClosingCta
          block={marketing.login.closing}
          primaryAction={funnel.primaryAction}
          secondaryAction={funnel.secondaryAction}
        />
      </div>
    </PublicSiteShell>
  );
}
