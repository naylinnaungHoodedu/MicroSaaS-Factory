import { NextResponse } from "next/server";

import { createSignupIntent } from "@/lib/server/services";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const signupIntent = await createSignupIntent({
      founderName: String(body.founderName ?? ""),
      email: String(body.email ?? ""),
      workspaceName: String(body.workspaceName ?? ""),
      planId: String(body.planId ?? ""),
    });

    return NextResponse.json({ signupIntent });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Signup intent creation failed.";

    return NextResponse.json(
      { error: message },
      { status: message === "Public signup is disabled." ? 403 : 400 },
    );
  }
}
