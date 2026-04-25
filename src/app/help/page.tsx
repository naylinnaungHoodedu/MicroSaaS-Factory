import type { Metadata } from "next";

import {
  buildPublicPageMetadata,
  buildPublicStructuredData,
  getPublicRouteSeoContent,
} from "@/app/public-metadata";
import { HelpCenter, type PublicHelpContext } from "@/components/help-center";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicStructuredData } from "@/components/public-structured-data";
import { HELP_FAQ } from "@/lib/help-content";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  return buildPublicPageMetadata(getPublicRouteSeoContent("help", funnel));
}

function buildPublicHelpContext(
  funnel: Awaited<ReturnType<typeof getPublicFunnelState>>,
): PublicHelpContext {
  const readinessItems =
    funnel.launch.blockers.length > 0
      ? funnel.launch.blockers.map((item) => ({
          detail: item.detail,
          label: item.label,
          status: item.status,
        }))
      : [
          {
            detail:
              "The public path has no launch blockers in the current funnel state.",
            label: "Launch readiness",
            status: "ready",
          },
        ];

  return {
    accessLabel: funnel.auth.firebaseEnabled ? "Firebase + fallback" : "Invite-led",
    activationLabel: funnel.activationReady
      ? "Ready"
      : funnel.availabilityMode === "self_serve"
        ? "Staged"
        : "Guided",
    checkoutLabel: funnel.checkoutVisible ? "Visible" : "Controlled",
    planLabel: funnel.plans[0]?.name ?? "Growth",
    pricingLabel: funnel.pricingVisible ? "Visible" : "Hidden",
    primaryAction: {
      href: funnel.primaryAction.href,
      label: funnel.primaryAction.label,
    },
    readinessItems,
    secondaryAction: {
      href: funnel.secondaryAction.href,
      label: funnel.secondaryAction.label,
    },
  };
}

export default async function HelpPage() {
  const funnel = await getPublicFunnelState();
  const seo = getPublicRouteSeoContent("help", funnel);

  return (
    <PublicSiteShell mainClassName="page-shell py-10 md:py-12" footerState={funnel}>
      <PublicStructuredData
        data={buildPublicStructuredData({
          title: seo.title,
          path: "/help",
          description: seo.description,
          faqItems: HELP_FAQ,
          plans: funnel.pricingVisible ? funnel.plans : [],
        })}
      />
      <HelpCenter mode="public" publicContext={buildPublicHelpContext(funnel)} />
    </PublicSiteShell>
  );
}
