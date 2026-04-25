import type { Metadata } from "next";

import {
  buildPublicPageMetadata,
  buildPublicStructuredData,
  getPublicRouteSeoContent,
} from "@/app/public-metadata";
import { DemoCenter, type PublicDemoContext } from "@/components/demo-center";
import { PublicSiteShell } from "@/components/public-shell";
import { PublicStructuredData } from "@/components/public-structured-data";
import { DEMO_FAQ } from "@/lib/demo-content";
import { getPublicFunnelState } from "@/lib/server/funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const funnel = await getPublicFunnelState({ includeFounderContext: false });
  return buildPublicPageMetadata(getPublicRouteSeoContent("demo", funnel));
}

function buildPublicDemoContext(
  funnel: Awaited<ReturnType<typeof getPublicFunnelState>>,
): PublicDemoContext {
  const readinessItems =
    funnel.launch.blockers.length > 0
      ? funnel.launch.blockers.map((item) => ({
          detail: item.detail,
          label: item.label,
          status: item.status,
        }))
      : [
          {
            detail: "No public launch blockers are reported in the current funnel state.",
            label: "Launch readiness",
            status: "ready",
          },
        ];

  return {
    activationLabel: funnel.activationReady
      ? "Ready"
      : funnel.availabilityMode === "self_serve"
        ? "Staged"
        : "Guided",
    checkoutLabel: funnel.checkoutVisible ? "Visible" : "Controlled",
    planLabel: funnel.plans[0]?.name ?? "Growth",
    pricingLabel: funnel.pricingVisible ? "Pricing visible" : "Pricing hidden",
    primaryAction: {
      href: funnel.primaryAction.href,
      label: funnel.primaryAction.label,
    },
    readinessItems,
    secondaryAction: {
      href: funnel.secondaryAction.href,
      label: funnel.secondaryAction.label,
    },
    signupLabel: funnel.signupAvailable ? "Signup open" : "Reviewed entry",
  };
}

export default async function DemoPage() {
  const funnel = await getPublicFunnelState();
  const seo = getPublicRouteSeoContent("demo", funnel);

  return (
    <PublicSiteShell mainClassName="page-shell py-10 md:py-12" footerState={funnel}>
      <PublicStructuredData
        data={buildPublicStructuredData({
          title: seo.title,
          path: "/demo",
          description: seo.description,
          faqItems: DEMO_FAQ,
          plans: funnel.pricingVisible ? funnel.plans : [],
        })}
      />
      <DemoCenter mode="public" publicContext={buildPublicDemoContext(funnel)} />
    </PublicSiteShell>
  );
}
