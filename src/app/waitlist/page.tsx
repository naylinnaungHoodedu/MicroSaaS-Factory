import Link from "next/link";
import type { Metadata } from "next";

import { buildPublicPageMetadata } from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicHeroPanel, PublicInfoCard, PublicJourneyRail } from "@/components/public-ui";
import { PublicWaitlistForm } from "@/components/public-waitlist-form";
import { Section } from "@/components/ui";
import {
  initialWaitlistActionState,
  submitWaitlistAction,
} from "@/lib/server/public-actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Request Invite",
  description:
    "Join the MicroSaaS Factory founder beta and describe the workflow bottleneck you need to fix.",
  path: "/waitlist",
});

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await searchParams;
  const funnel = await getPublicFunnelState();

  return (
    <PublicSiteShell mainClassName="page-shell py-10">
      <PublicHeroPanel
        state={funnel}
        auxiliary={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Invite queue
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {funnel.signupAvailable
                  ? "The waitlist remains available beside the public signup path."
                  : "The waitlist is the current public path into the beta."}
              </p>
            </div>
            <p className="leading-7 text-slate-300">
              Founders can still request invite review even when pricing or signup is visible, which keeps high-intent beta candidates flowing through the operator-controlled path.
            </p>
          </div>
        }
      >
        <PublicJourneyRail state={funnel} />
      </PublicHeroPanel>

        <Section
          eyebrow="Request Invite"
          title="Join the founder beta."
          description="Tell us what you are building, where your current bottleneck sits, and what stack you are already operating. The beta is designed for solo technical founders shipping on GitHub and GCP."
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr]">
            <PublicWaitlistForm
              action={submitWaitlistAction}
              initialState={initialWaitlistActionState}
            />

            <div className="space-y-6">
              <PublicInfoCard
                eyebrow="Beta Fit"
                title="The strongest candidates already feel workflow drag."
                detail="The best beta founders already have one product idea or one live product and need better operating discipline rather than generic idea generation."
              />
              <PublicInfoCard
                eyebrow="Current Public Path"
                title="Invite review can coexist with pricing and signup."
                detail="The waitlist remains useful even when public pricing or signup is visible, because the operator may still want to selectively issue invites to higher-signal founders."
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
    </PublicSiteShell>
  );
}
