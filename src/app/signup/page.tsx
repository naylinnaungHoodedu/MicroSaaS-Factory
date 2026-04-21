import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildPublicPageMetadata } from "@/app/public-metadata";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicSignupForm } from "@/components/public-signup-form";
import { PublicHeroPanel, PublicJourneyRail } from "@/components/public-ui";
import { Section } from "@/components/ui";
import {
  createSignupIntentAction,
  initialSignupActionState,
} from "@/lib/server/public-actions";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Signup",
  description:
    "Create a founder workspace or record signup intent based on the current MicroSaaS Factory activation posture.",
  path: "/signup",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const resolved = await searchParams;
  const funnel = await getPublicFunnelState({ signupIntentId: resolved.intent });

  if (!funnel.signupAvailable || funnel.plans.length === 0) {
    redirect("/waitlist");
  }

  const defaultPlanId = funnel.plans[0]?.id ?? "";
  const signupIntent = funnel.signupIntent;
  const selfServeEnabled = funnel.availabilityMode === "self_serve";

  return (
    <PublicSiteShell mainClassName="page-shell py-10">
      <PublicHeroPanel
        state={funnel}
        auxiliary={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Activation posture
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {selfServeEnabled
                  ? funnel.activationReady
                    ? "Identity verification can activate the workspace immediately."
                    : "Signup is visible, but activation still depends on Firebase readiness."
                  : "Signup records the founder and workspace before operator provisioning."}
              </p>
            </div>
            <p className="leading-7 text-slate-300">{funnel.activationDetail}</p>
          </div>
        }
      >
        <PublicJourneyRail state={funnel} />
      </PublicHeroPanel>

      <Section
        eyebrow="Signup"
        title={selfServeEnabled ? "Create your founder workspace" : "Register a founder intent"}
        description={
          selfServeEnabled
            ? "Public signup now provisions a real founder workspace. Complete the plan and identity step here, then activate the workspace with Firebase."
            : "This path captures public demand without skipping operator control. Submit the target workspace and plan, and the operator can convert it into an invite or later open self-serve activation."
        }
      >
        {selfServeEnabled && !funnel.auth.firebaseEnabled ? (
          <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            Self-serve workspace activation is enabled, but Firebase sign-in is not configured for this environment yet. Operators need to finish Firebase setup before public provisioning is usable.
          </div>
        ) : null}

        <PublicSignupForm
          action={createSignupIntentAction}
          defaultPlanId={defaultPlanId}
          firebaseEnabled={funnel.auth.firebaseEnabled}
          firebaseTestMode={Boolean(funnel.auth.firebaseTestMode)}
          initialSignupIntent={signupIntent}
          initialState={initialSignupActionState}
          plans={funnel.plans}
          selfServeEnabled={selfServeEnabled}
        />
      </Section>
    </PublicSiteShell>
  );
}
