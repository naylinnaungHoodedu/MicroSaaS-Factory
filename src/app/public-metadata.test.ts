import { describe, expect, it } from "vitest";

import {
  buildPublicPageMetadata,
  buildPublicStructuredData,
  getPublicRouteSeoContent,
} from "@/app/public-metadata";
import type { PublicFunnelState } from "@/lib/server/funnel";

describe("buildPublicPageMetadata", () => {
  it("builds consistent social metadata for public routes", () => {
    const metadata = buildPublicPageMetadata({
      title: "Pricing",
      path: "/pricing",
      description:
        "Compare the guided-launch pricing posture and workspace-aware billing path.",
      keywords: ["microsaas", "pricing"],
    });

    expect(metadata.alternates?.canonical).toBe("/pricing");
    expect(metadata.openGraph?.siteName).toBe("MicroSaaS Factory");
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe("summary_large_image");
    expect(metadata.keywords).toEqual(["microsaas", "pricing"]);
  });
});

describe("buildPublicStructuredData", () => {
  it("adds offer and faq schema when plans and faqs are present", () => {
    const schema = buildPublicStructuredData({
      title: "Pricing",
      path: "/pricing",
      plans: [
        {
          id: "growth",
          name: "Growth",
          hidden: false,
          monthlyPrice: 99,
          annualPrice: 990,
          features: ["Single-founder workspace"],
        },
      ],
      faqItems: [
        {
          question: "Why show pricing before checkout is live?",
          answer: "So founders can understand the lane before Stripe is asked to carry trust.",
        },
      ],
    });

    expect(schema["@graph"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "SoftwareApplication",
        }),
        expect.objectContaining({
          "@type": "OfferCatalog",
        }),
        expect.objectContaining({
          "@type": "FAQPage",
        }),
      ]),
    );
  });

  it("always includes organization and webpage nodes", () => {
    const schema = buildPublicStructuredData({
      title: "Founder Login",
      path: "/login",
    });

    expect(schema["@graph"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "Organization",
        }),
        expect.objectContaining({
          "@type": "WebPage",
          name: "Founder Login",
        }),
      ]),
    );
  });
});

describe("getPublicRouteSeoContent", () => {
  it("describes the guided public homepage posture from shared funnel state", () => {
    const seo = getPublicRouteSeoContent(
      "home",
      {
        auth: {
          firebaseEnabled: false,
          firebaseTestMode: false,
          inviteTokenEnabled: true,
          firebaseClientConfigured: false,
          firebaseAdminConfigured: false,
          firebaseProjectId: null,
          firebaseError: null,
        },
        availabilityMode: "signup_intent",
        checkoutVisible: false,
        pricingVisible: true,
        signupAvailable: true,
      } satisfies Pick<
        PublicFunnelState,
        "auth" | "availabilityMode" | "checkoutVisible" | "pricingVisible" | "signupAvailable"
      >,
    );

    expect(seo.title).toBe("MicroSaaS Factory");
    expect(seo.description).toContain("public pricing, guided signup");
  });
});
