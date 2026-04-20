import Link from "next/link";

import { Section, StatCard } from "@/components/ui";
import { listPublicMetrics } from "@/lib/server/services";

export default async function Home() {
  const metrics = await listPublicMetrics();
  const signupCta =
    metrics.featureFlags.publicSignupEnabled && metrics.featureFlags.selfServeProvisioningEnabled
      ? "Create workspace"
      : metrics.featureFlags.publicSignupEnabled
        ? "Start signup"
        : "Request invite";

  return (
    <main className="pb-16">
      <div className="page-shell pt-8">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(140deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-6 py-8 shadow-2xl shadow-black/20 md:px-10 md:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
                Invite Beta
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Operating system for solo founders building on GitHub and GCP.
              </h1>
            </div>
            <div className="flex gap-3">
              {metrics.featureFlags.platformBillingEnabled ? (
                <Link href="/pricing" className="button-secondary">
                  Pricing
                </Link>
              ) : null}
              <Link href="/login" className="button-secondary">
                Founder login
              </Link>
              <Link
                href={metrics.featureFlags.publicSignupEnabled ? "/signup" : "/waitlist"}
                className="button-primary"
              >
                {signupCta}
              </Link>
            </div>
          </div>
          <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            MicroSaaS Factory turns the document strategy into a live founder workflow:
            research, validation, one-page specing, GitHub and Cloud Run ops, Stripe
            readiness, onboarding sequence management, and a hard launch gate before a
            product enters maintenance mode. Invite access remains available, and public
            self-serve provisioning can be opened independently when the operator is ready.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Workspaces"
              value={String(metrics.workspaceCount)}
              detail="Single-owner invite-beta workspaces"
            />
            <StatCard
              label="Tracked products"
              value={String(metrics.productCount)}
              detail="Research-to-launch pipelines already in the system"
            />
            <StatCard
              label="Waitlist"
              value={String(metrics.waitlistCount)}
              detail="Founders queued for the beta"
            />
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Section
            eyebrow="What V1 Covers"
            title="One product, one workspace, one accountable operator."
            description="The beta is intentionally narrow: no multi-team collaboration, no public checkout, and no multi-cloud sprawl. The application is optimized for a solo technical founder who wants disciplined throughput instead of another dashboard."
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

          <Section
            eyebrow="Beta Rules"
            title="Invite-only by design."
            description="Beta access is controlled so founders can wire real GitHub, GCP, Stripe, and Resend credentials without public self-serve risk."
          >
            <ul className="space-y-4 text-sm leading-7 text-slate-300">
              <li>
                Public waitlist is open. Public signup can operate as queue-only or real
                self-serve provisioning depending on operator flags.
              </li>
              <li>
                Founders authenticate through invite-token access, with optional Firebase sign-in
                when the operator has configured it.
              </li>
              <li>Platform billing objects exist internally but remain hidden until enabled.</li>
              <li>Pro-model generation is feature-flagged separately from the default Flash path.</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Auth mode: {metrics.auth.firebaseEnabled ? "Invite beta + Firebase" : "Invite token only"}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
