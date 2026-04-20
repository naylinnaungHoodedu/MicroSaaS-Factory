import Link from "next/link";

import { PublicHeroPanel, PublicInfoCard, PublicJourneyRail } from "@/components/public-ui";
import { Section } from "@/components/ui";
import { submitWaitlistAction } from "@/lib/server/actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const resolved = await searchParams;
  const funnel = await getPublicFunnelState();

  return (
    <main className="page-shell py-10">
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
        {resolved.submitted ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Your request has been recorded. You can return to the landing page or wait for an invite.
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr]">
          <form action={submitWaitlistAction} className="space-y-5">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Name</span>
              <input name="name" required placeholder="Founder name" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Email</span>
              <input name="email" type="email" required placeholder="founder@company.com" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Current bottleneck</span>
              <textarea
                name="challenge"
                required
                rows={5}
                placeholder="Where does your current research -> validation -> launch workflow break down?"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Current stack</span>
              <textarea
                name="notes"
                rows={4}
                placeholder="GitHub repos, Cloud Run, Firestore, Stripe, Resend, Firebase, or anything else already in flight."
              />
            </label>
            <button type="submit" className="button-primary">
              Join the waitlist
            </button>
          </form>

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
    </main>
  );
}
