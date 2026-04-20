import Link from "next/link";

import { Section } from "@/components/ui";
import { submitWaitlistAction } from "@/lib/server/actions";

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const resolved = await searchParams;

  return (
    <main className="page-shell py-10">
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

          <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6 text-sm leading-7 text-slate-300">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Beta Fit</p>
            <p>The strongest beta candidates already have one product idea or one live product and need better operating discipline rather than generic idea generation.</p>
            <p>Invite beta includes one owner workspace, one or more products, connected ops, and internal billing readiness with public checkout disabled.</p>
            <Link href="/" className="inline-flex rounded-full border border-white/10 px-4 py-2 text-white transition hover:border-white/25">
              Back to overview
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
