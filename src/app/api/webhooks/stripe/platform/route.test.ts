import { beforeEach, describe, expect, it, vi } from "vitest";

const { handleStripePlatformWebhookMock, verifyStripeWebhookSignatureMock } = vi.hoisted(() => ({
  handleStripePlatformWebhookMock: vi.fn(),
  verifyStripeWebhookSignatureMock: vi.fn(),
}));

vi.mock("@/lib/server/integrations", () => ({
  verifyStripeWebhookSignature: verifyStripeWebhookSignatureMock,
}));

vi.mock("@/lib/server/services", () => ({
  handleStripePlatformWebhook: handleStripePlatformWebhookMock,
}));

import { POST } from "./route";

describe("POST /api/webhooks/stripe/platform", () => {
  beforeEach(() => {
    handleStripePlatformWebhookMock.mockReset();
    verifyStripeWebhookSignatureMock.mockReset();
  });

  it("rejects invalid signatures", async () => {
    verifyStripeWebhookSignatureMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe/platform", {
        method: "POST",
        headers: {
          "stripe-signature": "t=123,v1=invalid",
        },
        body: JSON.stringify({ type: "customer.subscription.updated" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Invalid signature",
    });
  });

  it("handles verified Stripe platform webhooks", async () => {
    verifyStripeWebhookSignatureMock.mockReturnValue(true);
    handleStripePlatformWebhookMock.mockResolvedValue({
      received: true,
      eventType: "customer.subscription.updated",
      matchedSubscriptionCount: 1,
      updatedSubscriptionCount: 1,
    });

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe/platform", {
        method: "POST",
        headers: {
          "stripe-signature": "t=123,v1=valid",
        },
        body: JSON.stringify({ type: "customer.subscription.updated" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(handleStripePlatformWebhookMock).toHaveBeenCalledWith(
      '{"type":"customer.subscription.updated"}',
    );
    expect(await response.json()).toEqual({
      received: true,
      eventType: "customer.subscription.updated",
      matchedSubscriptionCount: 1,
      updatedSubscriptionCount: 1,
    });
  });
});
