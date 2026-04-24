import { describe, expect, it } from "vitest";

import { buildPublicMarketingContent, HOME_WORKFLOW_ITEMS } from "@/lib/public-content";

describe("buildPublicMarketingContent", () => {
  it("builds pricing comparison rows that stay truthful to the staged rollout", () => {
    const content = buildPublicMarketingContent({
      activationReady: false,
      availabilityMode: "signup_intent",
      checkoutVisible: false,
      firebaseEnabled: false,
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
      pricingVisible: true,
      signupAvailable: true,
      waitlistOpen: true,
    });

    expect(content.pricing.comparisonRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: "Commercial entry",
          current: "Pricing and signup are public.",
        }),
        expect.objectContaining({
          capability: "Activation path",
          current: "Signup is public, while the final activation step still stays staged.",
        }),
        expect.objectContaining({
          capability: "Billing path",
          current:
            "Growth is public for comparison, while checkout stays controlled until the billing path is fully ready.",
        }),
      ]),
    );
  });

  it("includes durable FAQs and closing CTA blocks for each public page", () => {
    const content = buildPublicMarketingContent({
      activationReady: true,
      availabilityMode: "self_serve",
      checkoutVisible: true,
      firebaseEnabled: true,
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
      pricingVisible: true,
      signupAvailable: true,
      waitlistOpen: true,
    });

    expect(content.home.faq).toHaveLength(4);
    expect(content.pricing.faq).toHaveLength(4);
    expect(content.signup.faq).toHaveLength(4);
    expect(content.login.faq).toHaveLength(3);
    expect(content.waitlist.faq).toHaveLength(3);
    expect(content.home.closing.title).toContain("Start with the founder path");
    expect(content.waitlist.closing.detail).toContain("reviewed lane");
  });
});

describe("HOME_WORKFLOW_ITEMS", () => {
  it("keeps the shared public workflow list in the standard content layer", () => {
    expect(HOME_WORKFLOW_ITEMS).toContain(
      "See portfolio health, launch readiness, and billing posture from one founder control tower.",
    );
    expect(HOME_WORKFLOW_ITEMS).toHaveLength(6);
  });
});
