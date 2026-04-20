import { NextResponse } from "next/server";

import { getFounderContext } from "@/lib/server/auth";
import { applyProductTemplate } from "@/lib/server/services";
import { parseProductTemplateId } from "@/lib/templates";

type RouteParams = Promise<{ productId: string }>;

export async function POST(
  request: Request,
  context: { params: RouteParams },
) {
  const founderContext = await getFounderContext();

  if (!founderContext) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { productId } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const templateId = parseProductTemplateId(body.templateId);

    if (!templateId) {
      return NextResponse.json({ error: "Template selection is required." }, { status: 400 });
    }

    const result = await applyProductTemplate(
      founderContext.workspace.id,
      productId,
      templateId,
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  }
}
