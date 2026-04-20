import { NextResponse } from "next/server";

import { verifyGithubWebhookSignature } from "@/lib/server/integrations";
import { handleGithubWebhook } from "@/lib/server/services";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? undefined;
  const eventName = request.headers.get("x-github-event");

  if (!verifyGithubWebhookSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const result = await handleGithubWebhook(payload, eventName);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 400 },
    );
  }
}
