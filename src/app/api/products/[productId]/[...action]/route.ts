import { NextResponse } from "next/server";

import { parseProductTemplateId } from "@/lib/templates";
import { getFounderContext } from "@/lib/server/auth";
import {
  addOpportunity,
  addValidationLead,
  archiveProduct,
  cloneProduct,
  connectGcp,
  connectGithub,
  connectResend,
  connectStripe,
  createValidationSession,
  createValidationTask,
  evaluateLaunchGate,
  refreshGcpConnection,
  refreshGithubConnection,
  refreshResendConnection,
  refreshStripeConnection,
  generateLaunchChecklist,
  generateOpportunityReadout,
  generateSpecDocument,
  logValidationTouchpoint,
  resolveAiGenerationMode,
  saveBuildSheet,
  saveSpecDocument,
  sendOnboardingTestEmail,
  restoreProduct,
  updateProductDetails,
  updateValidationTaskState,
  updateEmailSequence,
  updateProductLaunchState,
} from "@/lib/server/services";

type RouteParams = Promise<{ productId: string; action: string[] }>;

function parseBoolean(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function parseNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function POST(
  request: Request,
  context: { params: RouteParams },
) {
  const founderContext = await getFounderContext();

  if (!founderContext) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { productId, action } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const path = action.join("/");
  const aiMode = await resolveAiGenerationMode(parseBoolean(body.useProModel));

  try {
    if (path === "details") {
      const product = await updateProductDetails(founderContext.workspace.id, productId, {
        name: String(body.name ?? ""),
        summary: String(body.summary ?? ""),
        vertical: String(body.vertical ?? ""),
        pricingHypothesis: String(body.pricingHypothesis ?? ""),
        targetUser: String(body.targetUser ?? ""),
        coreProblem: String(body.coreProblem ?? ""),
        chosenMoat: String(body.chosenMoat ?? "domain-expertise") as
          | "domain-expertise"
          | "data-gravity"
          | "workflow-specificity"
          | "platform-integration",
        templateId: parseProductTemplateId(body.templateId),
      });

      return NextResponse.json({ product });
    }

    if (path === "clone") {
      const product = await cloneProduct(founderContext.workspace.id, productId);
      return NextResponse.json({ product });
    }

    if (path === "archive") {
      const product = await archiveProduct(founderContext.workspace.id, productId, {
        reason: body.archivedReason ? String(body.archivedReason) : undefined,
      });
      return NextResponse.json({ product });
    }

    if (path === "restore") {
      const product = await restoreProduct(founderContext.workspace.id, productId);
      return NextResponse.json({ product });
    }

    if (path === "opportunities") {
      const opportunity = await addOpportunity(founderContext.workspace.id, productId, {
        title: String(body.title ?? ""),
        audience: String(body.audience ?? ""),
        painStatement: String(body.painStatement ?? ""),
        complaintFrequency: parseNumber(body.complaintFrequency),
        painSeverity: parseNumber(body.painSeverity),
        willingnessToPay: parseNumber(body.willingnessToPay),
        competitionCount: parseNumber(body.competitionCount),
        pricingPowerEstimate: String(body.pricingPowerEstimate ?? ""),
        moatType: String(body.moatType ?? "domain-expertise") as
          | "domain-expertise"
          | "data-gravity"
          | "workflow-specificity"
          | "platform-integration",
        notes: String(body.notes ?? ""),
      });

      return NextResponse.json({ opportunity });
    }

    if (action.length === 3 && action[0] === "opportunities" && action[2] === "ai-score") {
      const opportunity = await generateOpportunityReadout(
        founderContext.workspace.id,
        productId,
        action[1],
        aiMode,
      );

      return NextResponse.json({ opportunity });
    }

    if (path === "validation/leads") {
      const lead = await addValidationLead(founderContext.workspace.id, productId, {
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        company: String(body.company ?? ""),
        role: String(body.role ?? ""),
        channel: String(body.channel ?? ""),
        status: String(body.status ?? "contacted") as
          | "queued"
          | "contacted"
          | "interested"
          | "enthusiastic"
          | "declined",
        willingToPay: parseBoolean(body.willingToPay),
        demoBooked: parseBoolean(body.demoBooked),
        reservationPlaced: parseBoolean(body.reservationPlaced),
        notes: String(body.notes ?? ""),
      });

      return NextResponse.json({ lead });
    }

    if (action.length === 4 && action[0] === "validation" && action[1] === "leads" && action[3] === "touchpoints") {
      const result = await logValidationTouchpoint(
        founderContext.workspace.id,
        productId,
        action[2],
        {
          type: String(body.type ?? "dm") as
            | "dm"
            | "email"
            | "call"
            | "follow-up"
            | "demo"
            | "reservation",
          outcome: String(body.outcome ?? "sent") as
            | "sent"
            | "replied"
            | "positive"
            | "booked"
            | "declined"
            | "no-response",
          summary: String(body.summary ?? ""),
          status: String(body.status ?? "contacted") as
            | "queued"
            | "contacted"
            | "interested"
            | "enthusiastic"
            | "declined",
          nextFollowUpOn: body.nextFollowUpOn ? String(body.nextFollowUpOn) : undefined,
          willingToPay: parseBoolean(body.willingToPay),
          demoBooked: parseBoolean(body.demoBooked),
          reservationPlaced: parseBoolean(body.reservationPlaced),
        },
      );

      return NextResponse.json(result);
    }

    if (path === "validation/sessions") {
      const sourceMode = String(body.sourceMode ?? "paste") as "paste" | "upload";
      const transcriptText = String(body.transcriptText ?? "");
      const uploadName = String(body.uploadName ?? "");
      const session = await createValidationSession(founderContext.workspace.id, productId, {
        leadId: body.leadId ? String(body.leadId) : undefined,
        sourceMode,
        channel: String(body.channel ?? "call") as
          | "call"
          | "demo"
          | "email"
          | "dm"
          | "follow-up"
          | "other",
        context: String(body.context ?? ""),
        transcriptText,
        upload:
          sourceMode === "upload"
            ? {
                fileName: uploadName || "transcript.txt",
                contentType: String(body.uploadContentType ?? "text/plain"),
                sizeBytes: parseNumber(body.uploadSizeBytes),
              }
            : undefined,
        aiMode: aiMode,
      });

      return NextResponse.json({ session });
    }

    if (path === "validation/tasks") {
      const task = await createValidationTask(founderContext.workspace.id, productId, {
        leadId: body.leadId ? String(body.leadId) : undefined,
        sessionId: body.sessionId ? String(body.sessionId) : undefined,
        type: String(body.type ?? "follow-up") as
          | "email"
          | "dm"
          | "call"
          | "follow-up",
        title: String(body.title ?? ""),
        notes: String(body.notes ?? ""),
        dueOn: body.dueOn ? String(body.dueOn) : undefined,
      });

      return NextResponse.json({ task });
    }

    if (action.length === 3 && action[0] === "validation" && action[1] === "tasks") {
      const result = await updateValidationTaskState(
        founderContext.workspace.id,
        action[2],
        {
          action: String(body.action ?? "complete") as
            | "complete"
            | "snooze"
            | "cancel"
            | "reopen",
          snoozeUntil: body.snoozeUntil ? String(body.snoozeUntil) : undefined,
        },
      );

      return NextResponse.json(result);
    }

    if (path === "spec/generate") {
      const spec = await generateSpecDocument(
        founderContext.workspace.id,
        productId,
        aiMode,
      );
      return NextResponse.json({ spec });
    }

    if (path === "spec") {
      const spec = await saveSpecDocument(founderContext.workspace.id, productId, {
        targetUser: String(body.targetUser ?? ""),
        problem: String(body.problem ?? ""),
        v1FeaturesText: String(body.v1FeaturesText ?? ""),
        exclusionsText: String(body.exclusionsText ?? ""),
        pricingHypothesis: String(body.pricingHypothesis ?? ""),
        launchCriteriaText: String(body.launchCriteriaText ?? ""),
        definitionOfDone: String(body.definitionOfDone ?? ""),
      });

      return NextResponse.json({ spec });
    }

    if (path === "build-state") {
      const buildSheet = await saveBuildSheet(founderContext.workspace.id, productId, {
        releaseGoal: String(body.releaseGoal ?? ""),
        shipChecklistText: String(body.shipChecklistText ?? ""),
        blockersText: String(body.blockersText ?? ""),
        notes: String(body.notes ?? ""),
        targetReleaseOn: body.targetReleaseOn ? String(body.targetReleaseOn) : undefined,
      });

      return NextResponse.json({ buildSheet });
    }

    if (path === "integrations/github/install") {
      const connection = await connectGithub(founderContext.workspace.id, productId, {
        owner: String(body.owner ?? ""),
        repo: String(body.repo ?? ""),
        installationId: body.installationId ? String(body.installationId) : undefined,
        personalAccessToken: body.personalAccessToken ? String(body.personalAccessToken) : undefined,
      });

      return NextResponse.json({ connection });
    }

    if (path === "integrations/github/refresh") {
      const connection = await refreshGithubConnection(founderContext.workspace.id, productId);
      return NextResponse.json({ connection });
    }

    if (path === "integrations/gcp") {
      const connection = await connectGcp(founderContext.workspace.id, productId, {
        projectId: String(body.projectId ?? ""),
        region: String(body.region ?? ""),
        serviceName: String(body.serviceName ?? ""),
        buildRegion: body.buildRegion ? String(body.buildRegion) : undefined,
        serviceAccountJson: String(body.serviceAccountJson ?? ""),
      });

      return NextResponse.json({ connection });
    }

    if (path === "integrations/gcp/refresh") {
      const connection = await refreshGcpConnection(founderContext.workspace.id, productId);
      return NextResponse.json({ connection });
    }

    if (path === "integrations/stripe") {
      const connection = await connectStripe(founderContext.workspace.id, productId, {
        secretKey: String(body.secretKey ?? ""),
      });

      return NextResponse.json({ connection });
    }

    if (path === "integrations/stripe/refresh") {
      const connection = await refreshStripeConnection(founderContext.workspace.id, productId);
      return NextResponse.json({ connection });
    }

    if (path === "integrations/resend") {
      const connection = await connectResend(founderContext.workspace.id, productId, {
        apiKey: String(body.apiKey ?? ""),
        senderEmail: String(body.senderEmail ?? ""),
        aiMode,
      });

      return NextResponse.json({ connection });
    }

    if (path === "integrations/resend/refresh") {
      const connection = await refreshResendConnection(founderContext.workspace.id, productId);
      return NextResponse.json({ connection });
    }

    if (path === "email-sequence") {
      const sequence = await updateEmailSequence(founderContext.workspace.id, productId, {
        senderEmail: String(body.senderEmail ?? ""),
        subjects: Array.isArray(body.subjects) ? body.subjects.map(String) : [],
        bodies: Array.isArray(body.bodies) ? body.bodies.map(String) : [],
      });

      return NextResponse.json({ sequence });
    }

    if (path === "email-sequence/test-send") {
      const result = await sendOnboardingTestEmail(founderContext.workspace.id, productId, {
        recipientEmail: String(body.recipientEmail ?? ""),
        itemKey: String(body.itemKey ?? "day-0"),
      });

      return NextResponse.json({ result });
    }

    if (path === "launch-gate/evaluate") {
      const gate = await evaluateLaunchGate(founderContext.workspace.id, productId);
      return NextResponse.json({ gate });
    }

    if (path === "launch-checklist/generate") {
      const product = await generateLaunchChecklist(
        founderContext.workspace.id,
        productId,
        aiMode,
      );
      return NextResponse.json({ product });
    }

    if (path === "launch-state") {
      const product = await updateProductLaunchState(founderContext.workspace.id, productId, {
        monthlyRecurringRevenue: parseNumber(body.monthlyRecurringRevenue),
        monthlyChurnRate: parseNumber(body.monthlyChurnRate),
        supportHoursPerWeek: parseNumber(body.supportHoursPerWeek),
        activeP1Bugs: parseNumber(body.activeP1Bugs),
        criticalBlockersText: String(body.criticalBlockersText ?? ""),
        launchChecklistText: String(body.launchChecklistText ?? ""),
      });

      return NextResponse.json({ product });
    }

    return NextResponse.json({ error: "Route not implemented." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 },
    );
  }
}
