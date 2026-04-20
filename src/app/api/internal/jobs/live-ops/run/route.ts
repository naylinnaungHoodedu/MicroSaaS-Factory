import { NextResponse } from "next/server";

import { runLiveOpsAutomation } from "@/lib/server/services";

function isAuthorized(request: Request) {
  const secret = process.env.INTERNAL_AUTOMATION_KEY?.trim();

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runLiveOpsAutomation();
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  }
}
