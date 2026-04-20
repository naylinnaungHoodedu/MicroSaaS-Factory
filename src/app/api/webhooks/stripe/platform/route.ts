import { NextResponse } from "next/server";
import { verifyStripeWebhookSignature } from "@/lib/server/integrations";
import { handleStripePlatformWebhook } from "@/lib/server/services";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? undefined;

  if (!verifyStripeWebhookSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const result = await handleStripePlatformWebhook(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 400 },
    );
  }
}
