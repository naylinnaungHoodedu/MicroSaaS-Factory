import { NextResponse } from "next/server";

import { getRuntimeHealthSnapshot } from "@/lib/server/runtime-config";

const HEALTH_CACHE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  try {
    const snapshot = await getRuntimeHealthSnapshot();

    return NextResponse.json(snapshot, {
      status: snapshot.ok ? 200 : 503,
      headers: HEALTH_CACHE_HEADERS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed.",
      },
      {
        status: 503,
        headers: HEALTH_CACHE_HEADERS,
      },
    );
  }
}
