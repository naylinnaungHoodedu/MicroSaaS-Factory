"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseProductTemplateId } from "@/lib/templates";
import {
  clearSessionCookie,
  createAdminSession,
  createFounderSession,
  requireAdminSession,
  requireFounderContext,
} from "@/lib/server/auth";
import {
  acceptInvite,
  addOpportunity,
  addValidationLead,
  applyProductTemplate,
  archiveProduct,
  cloneProduct,
  connectGcp,
  connectGithub,
  connectResend,
  connectStripe,
  createInviteFromSignupIntent,
  createValidationSession,
  createValidationTask,
  createInvite,
  createProduct,
  createSignupIntent,
  createWaitlistRequest,
  evaluateLaunchGate,
  generateLaunchChecklist,
  generateOpportunityReadout,
  generateSpecDocument,
  logValidationTouchpoint,
  loginWithInvite,
  refreshGcpConnection,
  refreshGithubConnection,
  refreshResendConnection,
  refreshStripeConnection,
  resolveAiGenerationMode,
  runLiveOpsAutomation,
  runValidationCrmJob,
  saveBuildSheet,
  saveSpecDocument,
  sendOnboardingTestEmail,
  restoreProduct,
  updateProductDetails,
  updateValidationTaskState,
  updateEmailSequence,
  updateGlobalFeatureFlags,
  updateProductLaunchState,
} from "@/lib/server/services";
import type { Product } from "@/lib/types";

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function numeric(formData: FormData, name: string) {
  return Number(formData.get(name) ?? 0);
}

async function resolveRequestedAiMode(formData: FormData) {
  return resolveAiGenerationMode(checkbox(formData, "useProModel"));
}

function revalidateProductViews(productId: string, currentPath: string) {
  revalidatePath(currentPath);
  revalidatePath(`/app/products/${productId}`);
  revalidatePath(`/app/products/${productId}/build`);
  revalidatePath(`/app/products/${productId}/ops`);
  revalidatePath(`/app/products/${productId}/validate`);
  revalidatePath("/app/crm");
  revalidatePath("/app");
}

function getProductSectionPath(productId: string, section?: string) {
  return section ? `/app/products/${productId}/${section}` : `/app/products/${productId}`;
}

async function extractTranscriptUpload(formData: FormData) {
  const file = formData.get("transcriptFile");

  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }

  const fileName = file.name || "transcript.txt";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = file.type || "text/plain";

  if (!["txt", "md", "vtt"].includes(extension)) {
    throw new Error("Transcript uploads must be .txt, .md, or .vtt files.");
  }

  const transcriptText = (await file.text()).trim();

  if (!transcriptText) {
    throw new Error("Uploaded transcript file is empty.");
  }

  return {
    transcriptText,
    upload: {
      fileName,
      contentType,
      sizeBytes: file.size,
    },
  };
}

export async function submitWaitlistAction(formData: FormData) {
  await createWaitlistRequest({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    challenge: String(formData.get("challenge") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  redirect("/waitlist?submitted=1");
}

export async function acceptInviteAction(token: string, formData: FormData) {
  let result: Awaited<ReturnType<typeof acceptInvite>>;

  try {
    result = await acceptInvite({
      token,
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
    });
  } catch {
    redirect(`/invite/${token}?error=invalid_invite`);
  }

  await createFounderSession(result.user.id);
  redirect("/app");
}

export async function loginAction(formData: FormData) {
  let user: Awaited<ReturnType<typeof loginWithInvite>>;

  try {
    user = await loginWithInvite({
      email: String(formData.get("email") ?? ""),
      token: String(formData.get("token") ?? ""),
    });
  } catch {
    redirect("/login?error=invalid_invite");
  }

  await createFounderSession(user.id);
  redirect("/app");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function adminLoginAction(formData: FormData) {
  const providedSecret = String(formData.get("secret") ?? "");
  const secret = process.env.ADMIN_ACCESS_KEY;

  if (!secret) {
    if (process.env.NODE_ENV !== "production" && providedSecret === "microsaas-admin") {
      await createAdminSession();
      redirect("/admin");
    }

    redirect("/admin?error=misconfigured");
  }

  if (providedSecret !== secret) {
    redirect("/admin?error=invalid");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function createInviteAction(formData: FormData) {
  await requireAdminSession();
  await createInvite({
    email: String(formData.get("email") ?? ""),
    workspaceName: String(formData.get("workspaceName") ?? ""),
  });

  revalidatePath("/admin");
}

export async function createInviteFromSignupIntentAction(signupIntentId: string) {
  await requireAdminSession();
  await createInviteFromSignupIntent(signupIntentId);
  revalidatePath("/admin");
}

export async function updateFeatureFlagsAction(formData: FormData) {
  await requireAdminSession();
  await updateGlobalFeatureFlags({
    publicSignupEnabled: checkbox(formData, "publicSignupEnabled"),
    selfServeProvisioningEnabled: checkbox(formData, "selfServeProvisioningEnabled"),
    checkoutEnabled: checkbox(formData, "checkoutEnabled"),
    platformBillingEnabled: checkbox(formData, "platformBillingEnabled"),
    proAiEnabled: checkbox(formData, "proAiEnabled"),
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/pricing");
  revalidatePath("/signup");
  revalidatePath("/login");
}

export async function createProductAction(formData: FormData) {
  const { workspace } = await requireFounderContext();
  const chosenMoat = formData.get("chosenMoat");
  await createProduct(workspace.id, {
    name: String(formData.get("name") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    vertical: String(formData.get("vertical") ?? ""),
    pricingHypothesis: String(formData.get("pricingHypothesis") ?? ""),
    targetUser: String(formData.get("targetUser") ?? ""),
    coreProblem: String(formData.get("coreProblem") ?? ""),
    chosenMoat:
      typeof chosenMoat === "string" ? (chosenMoat as Product["chosenMoat"]) : undefined,
    templateId: parseProductTemplateId(formData.get("templateId")),
  });

  revalidatePath("/app");
}

export async function updateProductDetailsAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  const chosenMoat = formData.get("chosenMoat");

  await updateProductDetails(workspace.id, productId, {
    name: String(formData.get("name") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    vertical: String(formData.get("vertical") ?? ""),
    pricingHypothesis: String(formData.get("pricingHypothesis") ?? ""),
    targetUser: String(formData.get("targetUser") ?? ""),
    coreProblem: String(formData.get("coreProblem") ?? ""),
    chosenMoat:
      typeof chosenMoat === "string" ? (chosenMoat as Product["chosenMoat"]) : "domain-expertise",
    templateId: parseProductTemplateId(formData.get("templateId")),
  });

  revalidateProductViews(productId, `/app/products/${productId}`);
}

export async function archiveProductAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  await archiveProduct(workspace.id, productId, {
    reason: String(formData.get("archivedReason") ?? ""),
  });
  revalidateProductViews(productId, `/app/products/${productId}`);
}

export async function restoreProductAction(productId: string) {
  const { workspace } = await requireFounderContext();
  await restoreProduct(workspace.id, productId);
  revalidateProductViews(productId, `/app/products/${productId}`);
}

export async function cloneProductAction(productId: string) {
  const { workspace } = await requireFounderContext();
  const product = await cloneProduct(workspace.id, productId);
  revalidateProductViews(productId, `/app/products/${productId}`);
  revalidateProductViews(product.id, `/app/products/${product.id}`);
  redirect(`/app/products/${product.id}`);
}

export async function createSignupIntentAction(formData: FormData) {
  let signupIntent: Awaited<ReturnType<typeof createSignupIntent>>;

  try {
    signupIntent = await createSignupIntent({
      founderName: String(formData.get("founderName") ?? ""),
      email: String(formData.get("email") ?? ""),
      workspaceName: String(formData.get("workspaceName") ?? ""),
      planId: String(formData.get("planId") ?? ""),
    });
  } catch {
    redirect("/signup?error=submit_failed");
  }

  redirect(`/signup?intent=${signupIntent.id}&submitted=1`);
}

export async function applyProductTemplateAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  const templateId = parseProductTemplateId(formData.get("templateId"));

  if (!templateId) {
    throw new Error("Template selection is required.");
  }

  await applyProductTemplate(workspace.id, productId, templateId);
  revalidateProductViews(productId, `/app/products/${productId}`);
}

export async function addOpportunityAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  await addOpportunity(workspace.id, productId, {
    title: String(formData.get("title") ?? ""),
    audience: String(formData.get("audience") ?? ""),
    painStatement: String(formData.get("painStatement") ?? ""),
    complaintFrequency: numeric(formData, "complaintFrequency"),
    painSeverity: numeric(formData, "painSeverity"),
    willingnessToPay: numeric(formData, "willingnessToPay"),
    competitionCount: numeric(formData, "competitionCount"),
    pricingPowerEstimate: String(formData.get("pricingPowerEstimate") ?? ""),
    moatType: String(formData.get("moatType") ?? "domain-expertise") as
      | "domain-expertise"
      | "data-gravity"
      | "workflow-specificity"
      | "platform-integration",
    notes: String(formData.get("notes") ?? ""),
  });

  revalidateProductViews(productId, `/app/products/${productId}/research`);
}

export async function generateOpportunityReadoutAction(
  productId: string,
  opportunityId: string,
  formData: FormData,
) {
  const { workspace } = await requireFounderContext();
  const mode = await resolveRequestedAiMode(formData);
  await generateOpportunityReadout(workspace.id, productId, opportunityId, mode);
  revalidateProductViews(productId, `/app/products/${productId}/research`);
}

export async function addValidationLeadAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  await addValidationLead(workspace.id, productId, {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    role: String(formData.get("role") ?? ""),
    channel: String(formData.get("channel") ?? ""),
    status: String(formData.get("status") ?? "contacted") as
      | "queued"
      | "contacted"
      | "interested"
      | "enthusiastic"
      | "declined",
    willingToPay: checkbox(formData, "willingToPay"),
    demoBooked: checkbox(formData, "demoBooked"),
    reservationPlaced: checkbox(formData, "reservationPlaced"),
    notes: String(formData.get("notes") ?? ""),
  });

  revalidateProductViews(productId, `/app/products/${productId}/validate`);
}

export async function logValidationTouchpointAction(
  productId: string,
  leadId: string,
  formData: FormData,
) {
  const { workspace } = await requireFounderContext();
  await logValidationTouchpoint(workspace.id, productId, leadId, {
    type: String(formData.get("type") ?? "dm") as
      | "dm"
      | "email"
      | "call"
      | "follow-up"
      | "demo"
      | "reservation",
    outcome: String(formData.get("outcome") ?? "sent") as
      | "sent"
      | "replied"
      | "positive"
      | "booked"
      | "declined"
      | "no-response",
    summary: String(formData.get("summary") ?? ""),
    status: String(formData.get("status") ?? "contacted") as
      | "queued"
      | "contacted"
      | "interested"
      | "enthusiastic"
      | "declined",
    nextFollowUpOn: String(formData.get("nextFollowUpOn") ?? "") || undefined,
    willingToPay: checkbox(formData, "willingToPay"),
    demoBooked: checkbox(formData, "demoBooked"),
    reservationPlaced: checkbox(formData, "reservationPlaced"),
  });

  revalidateProductViews(productId, `/app/products/${productId}/validate`);
}

export async function createValidationSessionAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  const sourceMode = String(formData.get("sourceMode") ?? "paste") as "paste" | "upload";
  const uploaded = await extractTranscriptUpload(formData);
  const transcriptText =
    sourceMode === "upload"
      ? uploaded?.transcriptText ?? ""
      : String(formData.get("transcriptText") ?? "");
  const mode = await resolveRequestedAiMode(formData);

  await createValidationSession(workspace.id, productId, {
    leadId: String(formData.get("leadId") ?? "") || undefined,
    sourceMode,
    channel: String(formData.get("channel") ?? "call") as
      | "call"
      | "demo"
      | "email"
      | "dm"
      | "follow-up"
      | "other",
    context: String(formData.get("context") ?? ""),
    transcriptText,
    upload: uploaded?.upload,
    aiMode: mode,
  });

  revalidateProductViews(productId, `/app/products/${productId}/validate`);
}

export async function createValidationTaskAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  await createValidationTask(workspace.id, productId, {
    leadId: String(formData.get("leadId") ?? "") || undefined,
    sessionId: String(formData.get("sessionId") ?? "") || undefined,
    type: String(formData.get("type") ?? "follow-up") as
      | "email"
      | "dm"
      | "call"
      | "follow-up",
    title: String(formData.get("title") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    dueOn: String(formData.get("dueOn") ?? "") || undefined,
  });

  revalidateProductViews(productId, `/app/products/${productId}/validate`);
}

export async function updateValidationTaskStateAction(taskId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  const result = await updateValidationTaskState(workspace.id, taskId, {
    action: String(formData.get("action") ?? "complete") as
      | "complete"
      | "snooze"
      | "cancel"
      | "reopen",
    snoozeUntil: String(formData.get("snoozeUntil") ?? "") || undefined,
  });

  revalidateProductViews(result.productId, `/app/products/${result.productId}/validate`);
}

export async function runValidationCrmAutomationAction() {
  await requireAdminSession();
  await runValidationCrmJob();
  revalidatePath("/admin");
  revalidatePath("/app", "layout");
}

export async function runLiveOpsAutomationAction() {
  await requireAdminSession();
  await runLiveOpsAutomation();
  revalidatePath("/admin");
  revalidatePath("/app", "layout");
}

export async function saveSpecAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  await saveSpecDocument(workspace.id, productId, {
    targetUser: String(formData.get("targetUser") ?? ""),
    problem: String(formData.get("problem") ?? ""),
    v1FeaturesText: String(formData.get("v1FeaturesText") ?? ""),
    exclusionsText: String(formData.get("exclusionsText") ?? ""),
    pricingHypothesis: String(formData.get("pricingHypothesis") ?? ""),
    launchCriteriaText: String(formData.get("launchCriteriaText") ?? ""),
    definitionOfDone: String(formData.get("definitionOfDone") ?? ""),
  });

  revalidateProductViews(productId, `/app/products/${productId}/spec`);
}

export async function saveBuildSheetAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  await saveBuildSheet(workspace.id, productId, {
    releaseGoal: String(formData.get("releaseGoal") ?? ""),
    shipChecklistText: String(formData.get("shipChecklistText") ?? ""),
    blockersText: String(formData.get("blockersText") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    targetReleaseOn: String(formData.get("targetReleaseOn") ?? "") || undefined,
  });

  revalidateProductViews(productId, `/app/products/${productId}/build`);
}

export async function generateSpecAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  const mode = await resolveRequestedAiMode(formData);
  await generateSpecDocument(workspace.id, productId, mode);
  revalidateProductViews(productId, `/app/products/${productId}/spec`);
}

export async function connectGithubAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  try {
    await connectGithub(workspace.id, productId, {
      owner: String(formData.get("owner") ?? ""),
      repo: String(formData.get("repo") ?? ""),
      installationId: String(formData.get("installationId") ?? "") || undefined,
      personalAccessToken: String(formData.get("personalAccessToken") ?? "") || undefined,
    });
  } catch {
    redirect(`/app/products/${productId}/ops?error=github`);
  }
  revalidateProductViews(productId, `/app/products/${productId}/ops`);
}

export async function refreshGithubAction(productId: string, section = "ops") {
  const { workspace } = await requireFounderContext();

  try {
    await refreshGithubConnection(workspace.id, productId);
  } catch {
    redirect(`${getProductSectionPath(productId, section)}?error=github_refresh`);
  }

  revalidateProductViews(productId, getProductSectionPath(productId, section));
}

export async function connectGcpAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  try {
    await connectGcp(workspace.id, productId, {
      projectId: String(formData.get("projectId") ?? ""),
      region: String(formData.get("region") ?? ""),
      serviceName: String(formData.get("serviceName") ?? ""),
      buildRegion: String(formData.get("buildRegion") ?? "") || undefined,
      serviceAccountJson: String(formData.get("serviceAccountJson") ?? ""),
    });
  } catch {
    redirect(`/app/products/${productId}/ops?error=gcp`);
  }
  revalidateProductViews(productId, `/app/products/${productId}/ops`);
}

export async function refreshGcpAction(productId: string, section = "ops") {
  const { workspace } = await requireFounderContext();

  try {
    await refreshGcpConnection(workspace.id, productId);
  } catch {
    redirect(`${getProductSectionPath(productId, section)}?error=gcp_refresh`);
  }

  revalidateProductViews(productId, getProductSectionPath(productId, section));
}

export async function connectStripeAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  try {
    await connectStripe(workspace.id, productId, {
      secretKey: String(formData.get("secretKey") ?? ""),
    });
  } catch {
    redirect(`/app/products/${productId}/ops?error=stripe`);
  }
  revalidateProductViews(productId, `/app/products/${productId}/ops`);
}

export async function refreshStripeAction(productId: string, section = "ops") {
  const { workspace } = await requireFounderContext();

  try {
    await refreshStripeConnection(workspace.id, productId);
  } catch {
    redirect(`${getProductSectionPath(productId, section)}?error=stripe_refresh`);
  }

  revalidateProductViews(productId, getProductSectionPath(productId, section));
}

export async function connectResendAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  try {
    const mode = await resolveRequestedAiMode(formData);
    await connectResend(workspace.id, productId, {
      apiKey: String(formData.get("apiKey") ?? ""),
      senderEmail: String(formData.get("senderEmail") ?? ""),
      aiMode: mode,
    });
  } catch {
    redirect(`/app/products/${productId}/ops?error=resend`);
  }
  revalidateProductViews(productId, `/app/products/${productId}/ops`);
}

export async function refreshResendAction(productId: string, section = "ops") {
  const { workspace } = await requireFounderContext();

  try {
    await refreshResendConnection(workspace.id, productId);
  } catch {
    redirect(`${getProductSectionPath(productId, section)}?error=resend_refresh`);
  }

  revalidateProductViews(productId, getProductSectionPath(productId, section));
}

export async function updateEmailSequenceAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  const subjects = [0, 1, 3, 7, 14].map((day) => String(formData.get(`subject-${day}`) ?? ""));
  const bodies = [0, 1, 3, 7, 14].map((day) => String(formData.get(`body-${day}`) ?? ""));

  await updateEmailSequence(workspace.id, productId, {
    senderEmail: String(formData.get("senderEmail") ?? ""),
    subjects,
    bodies,
  });
  revalidateProductViews(productId, `/app/products/${productId}/ops`);
}

export async function sendTestEmailAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  try {
    await sendOnboardingTestEmail(workspace.id, productId, {
      recipientEmail: String(formData.get("recipientEmail") ?? ""),
      itemKey: String(formData.get("itemKey") ?? "day-0"),
    });
  } catch {
    redirect(`/app/products/${productId}/ops?error=test_email`);
  }
  revalidateProductViews(productId, `/app/products/${productId}/ops`);
}

export async function updateLaunchStateAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  await updateProductLaunchState(workspace.id, productId, {
    monthlyRecurringRevenue: numeric(formData, "monthlyRecurringRevenue"),
    monthlyChurnRate: numeric(formData, "monthlyChurnRate"),
    supportHoursPerWeek: numeric(formData, "supportHoursPerWeek"),
    activeP1Bugs: numeric(formData, "activeP1Bugs"),
    criticalBlockersText: String(formData.get("criticalBlockersText") ?? ""),
    launchChecklistText: String(formData.get("launchChecklistText") ?? ""),
  });
  revalidateProductViews(productId, `/app/products/${productId}/launch`);
}

export async function evaluateLaunchGateAction(productId: string) {
  const { workspace } = await requireFounderContext();
  await evaluateLaunchGate(workspace.id, productId);
  revalidateProductViews(productId, `/app/products/${productId}/launch`);
}

export async function generateLaunchChecklistAction(productId: string, formData: FormData) {
  const { workspace } = await requireFounderContext();
  const mode = await resolveRequestedAiMode(formData);
  await generateLaunchChecklist(workspace.id, productId, mode);
  revalidateProductViews(productId, `/app/products/${productId}/launch`);
}
