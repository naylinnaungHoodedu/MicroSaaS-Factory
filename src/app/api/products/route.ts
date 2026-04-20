import { NextResponse } from "next/server";

import { getFounderContext } from "@/lib/server/auth";
import { parseProductTemplateId } from "@/lib/templates";
import { createProduct } from "@/lib/server/services";
import type { Product } from "@/lib/types";

export async function POST(request: Request) {
  const context = await getFounderContext();

  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const chosenMoat =
      typeof body.chosenMoat === "string"
        ? (body.chosenMoat as Product["chosenMoat"])
        : undefined;

    const product = await createProduct(context.workspace.id, {
      name: body.name ?? "",
      summary: body.summary ?? "",
      vertical: body.vertical ?? "",
      pricingHypothesis: body.pricingHypothesis ?? "",
      targetUser: body.targetUser ?? "",
      coreProblem: body.coreProblem ?? "",
      chosenMoat,
      templateId: parseProductTemplateId(body.templateId),
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  }
}
