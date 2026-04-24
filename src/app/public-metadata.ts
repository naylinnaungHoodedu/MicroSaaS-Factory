import type { Metadata } from "next";

import type { PublicFaqItem } from "@/lib/public-content";
import type { PublicFunnelState } from "@/lib/server/funnel";
import type { PlatformPlan } from "@/lib/types";

import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE_PATH,
  toAbsoluteSiteUrl,
} from "@/lib/site";

type PublicStructuredData = {
  "@context": "https://schema.org";
  "@graph": Array<Record<string, unknown>>;
};

export type PublicRouteSeoKey = "home" | "pricing" | "signup" | "login" | "waitlist";

export function buildPublicPageMetadata(input: {
  description?: string;
  keywords?: string[];
  path: string;
  title: string;
  useAbsoluteTitle?: boolean;
}): Metadata {
  const description = input.description ?? SITE_DESCRIPTION;
  const openGraphTitle =
    input.title === SITE_NAME ? SITE_NAME : `${input.title} | ${SITE_NAME}`;

  return {
    title: input.useAbsoluteTitle ? { absolute: input.title } : input.title,
    description,
    keywords: input.keywords,
    alternates: {
      canonical: input.path,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: openGraphTitle,
      description,
      url: input.path,
      images: [
        {
          url: SITE_OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: openGraphTitle,
      description,
      images: [SITE_OG_IMAGE_PATH],
    },
  };
}

export function getPublicRouteSeoContent(
  route: PublicRouteSeoKey,
  funnel: Pick<
    PublicFunnelState,
    "auth" | "availabilityMode" | "checkoutVisible" | "pricingVisible" | "signupAvailable"
  >,
) {
  if (route === "home") {
    const description =
      funnel.availabilityMode === "self_serve"
        ? funnel.checkoutVisible
          ? "Founder operating system for solo technical founders with self-serve signup, workspace-aware billing, and one workspace from first signal to revenue."
          : "Founder operating system for solo technical founders with self-serve signup, launch control, and one workspace from first signal to revenue."
        : funnel.availabilityMode === "signup_intent"
          ? SITE_DESCRIPTION
          : "Founder operating system for solo technical founders with reviewed entry, launch control, and one workspace from first signal to revenue.";

    return {
      title: "MicroSaaS Factory",
      description,
      path: "/",
      useAbsoluteTitle: true,
      keywords: [
        "micro saas",
        "founder operating system",
        "guided signup",
        "launch readiness",
        "solo technical founder",
      ],
    };
  }

  if (route === "pricing") {
    return {
      title: "Pricing",
      description: funnel.checkoutVisible
        ? "Compare the Growth plan and move eligible founder workspaces into workspace-aware billing."
        : "Compare the Growth plan, see how workspace billing opens, and understand the current checkout posture for MicroSaaS Factory.",
      path: "/pricing",
      keywords: [
        "microsaas pricing",
        "growth plan",
        "workspace billing",
        "guided signup",
      ],
    };
  }

  if (route === "signup") {
    return {
      title: "Signup",
      description:
        funnel.availabilityMode === "self_serve"
          ? "Stage the founder workspace, verify identity, and continue toward billing from one guided signup path."
          : "Stage the founder workspace through guided signup and continue toward activation when the environment is ready.",
      path: "/signup",
      keywords: [
        "microsaas signup",
        "workspace activation",
        "founder signup",
        "guided signup",
      ],
    };
  }

  if (route === "login") {
    return {
      title: "Founder Login",
      description: funnel.auth.firebaseEnabled
        ? "Return to a provisioned MicroSaaS Factory workspace with the fastest available sign-in path plus invite-token fallback recovery."
        : "Return to a provisioned MicroSaaS Factory workspace with invite-token recovery and clear access guidance.",
      path: "/login",
      keywords: [
        "founder login",
        "workspace recovery",
        "firebase login",
        "invite token login",
      ],
    };
  }

  return {
    title: "Request Invite",
    description: funnel.signupAvailable
      ? "Request invite review when higher-context, reviewed intake is a better fit than direct signup."
      : "Request invite review for a higher-context path into MicroSaaS Factory when direct signup is not available.",
    path: "/waitlist",
    keywords: [
      "founder waitlist",
      "invite review",
      "manual onboarding",
      "reviewed signup",
    ],
  };
}

function buildPricingOfferCatalog(plans: PlatformPlan[]) {
  return {
    "@type": "OfferCatalog",
    name: `${SITE_NAME} pricing`,
    url: toAbsoluteSiteUrl("/pricing"),
    itemListElement: plans.flatMap((plan) => [
      {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        category: "Monthly",
        name: `${plan.name} monthly`,
        price: String(plan.monthlyPrice),
        priceCurrency: "USD",
        url: toAbsoluteSiteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        category: "Annual",
        name: `${plan.name} annual`,
        price: String(plan.annualPrice),
        priceCurrency: "USD",
        url: toAbsoluteSiteUrl("/pricing"),
      },
    ]),
  };
}

export function buildPublicStructuredData(input: {
  description?: string;
  faqItems?: PublicFaqItem[];
  path: string;
  plans?: PlatformPlan[];
  title: string;
}): PublicStructuredData {
  const description = input.description ?? SITE_DESCRIPTION;
  const url = toAbsoluteSiteUrl(input.path);
  const plans = input.plans ?? [];
  const firstPlan = plans[0];
  const nodes: Array<Record<string, unknown>> = [
    {
      "@type": "Organization",
      "@id": `${toAbsoluteSiteUrl("/")}#organization`,
      name: SITE_NAME,
      url: toAbsoluteSiteUrl("/"),
      logo: toAbsoluteSiteUrl("/icon-512.png"),
    },
    {
      "@type": "WebSite",
      "@id": `${toAbsoluteSiteUrl("/")}#website`,
      name: SITE_NAME,
      url: toAbsoluteSiteUrl("/"),
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
      publisher: {
        "@id": `${toAbsoluteSiteUrl("/")}#organization`,
      },
    },
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      name: input.title,
      url,
      description,
      isPartOf: {
        "@id": `${toAbsoluteSiteUrl("/")}#website`,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${toAbsoluteSiteUrl("/")}#application`,
      applicationCategory: "BusinessApplication",
      description,
      featureList: [
        "Founder workspace",
        "Validation CRM",
        "Launch readiness tracking",
        "Connected GitHub, Cloud Run, Stripe, and Resend operations",
        "Workspace-aware pricing and signup",
      ],
      name: SITE_NAME,
      operatingSystem: "Web",
      url: toAbsoluteSiteUrl("/"),
      publisher: {
        "@id": `${toAbsoluteSiteUrl("/")}#organization`,
      },
      ...(firstPlan
        ? {
            offers: {
              "@type": "Offer",
              availability: "https://schema.org/InStock",
              name: `${firstPlan.name} monthly`,
              price: String(firstPlan.monthlyPrice),
              priceCurrency: "USD",
              url: toAbsoluteSiteUrl("/pricing"),
            },
          }
        : {}),
    },
  ];

  if (plans.length > 0) {
    nodes.push(buildPricingOfferCatalog(plans));
  }

  if ((input.faqItems ?? []).length > 0) {
    nodes.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: input.faqItems?.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
