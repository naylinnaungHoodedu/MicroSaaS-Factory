import Link from "next/link";
import { redirect } from "next/navigation";

import { Section } from "@/components/ui";
import { getPublicPricingData } from "@/lib/server/services";
import { formatCurrency } from "@/lib/utils";

export default async function PricingPage() {
  const { flags, plans } = await getPublicPricingData();

  if (!flags.platformBillingEnabled) {
    redirect("/");
  }

  return (
    <main className="page-shell py-10">
      <Section
        eyebrow="Pricing"
        title="Choose the MicroSaaS Factory lane"
        description="Public pricing is now operator-visible. Checkout still stays out of scope here, but the operator can open either queue-based signup or direct self-serve workspace provisioning."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                {plan.hidden ? "Beta plan" : "Public plan"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{plan.name}</h2>
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
                <Link
                  href={flags.publicSignupEnabled ? "/signup" : "/waitlist"}
                  className="button-primary"
                >
                  {flags.publicSignupEnabled && flags.selfServeProvisioningEnabled
                    ? "Create workspace"
                    : flags.publicSignupEnabled
                      ? "Continue to signup"
                      : "Request invite"}
                </Link>
                <Link href="/" className="button-secondary">
                  Back home
                </Link>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-[1.4rem] border border-amber-400/25 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
          Checkout remains out of scope in this milestone. Public pricing and signup are flag-gated, and self-serve workspace activation can be enabled separately from live billing.
        </div>
      </Section>
    </main>
  );
}
