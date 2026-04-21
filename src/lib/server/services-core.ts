import "server-only";

import {
  BETA_PLATFORM_PLAN_ID,
  DEFAULT_EMAIL_SEQUENCE,
  INTEGRATION_LABELS,
  PRODUCT_STAGES,
} from "@/lib/constants";
import { generateText } from "@/lib/server/ai";
import { decryptSecret, encryptSecret } from "@/lib/server/crypto";
import { summarizeProductOpsHealth } from "@/lib/server/ops-health";
import {
  assertFeatureFlagReadiness,
  type BillingInterval,
  evaluateRuntimeReadiness,
  getPublicPlatformPlans,
  getStripePriceMap,
  getStripeCheckoutPriceId,
} from "@/lib/server/runtime-config";
import {
  getProductTemplate,
  listProductTemplates,
  PRODUCT_TEMPLATE_VERSION,
} from "@/lib/templates";
import type {
  ActivityEvent,
  ActivityEventSource,
  AutomationRun,
  BuildReadinessSummary,
  BuildSheet,
  ConnectionStatus,
  DatabaseShape,
  FeatureFlags,
  EmailSequence,
  IntegrationConnection,
  IntegrationProvider,
  IntegrationSyncSource,
  LaunchGateResult,
  Opportunity,
  OpportunityScore,
  PlatformPlan,
  PlatformSubscription,
  Product,
  ProductStage,
  ProductTemplate,
  ProductTemplateId,
  RevenueSnapshot,
  SignupIntent,
  SpecDocument,
  ValidationSession,
  ValidationSessionAnalysis,
  ValidationSessionAnalysisStatus,
  ValidationSessionChannel,
  ValidationTask,
  ValidationTaskSource,
  ValidationTaskState,
  ValidationTaskType,
  ValidationDecision,
  ValidationLead,
  ValidationOutreachSummary,
  ValidationTouchpoint,
} from "@/lib/types";
import { splitLines } from "@/lib/utils";
import {
  getDatabaseBackendInfo,
  readDatabase,
  updateDatabase,
} from "@/lib/server/db";
import { getAuthModeInfo } from "@/lib/server/auth-mode";
import {
  sendResendTestEmail,
  createStripePlatformCheckoutSession,
  syncGcpConnection,
  syncGithubConnection,
  syncResendConnection,
  syncStripeConnection,
} from "@/lib/server/integrations";

const INTEGRATION_AUTOMATION_MODES: Record<IntegrationProvider, string> = {
  github: "webhook + scheduled fallback",
  gcp: "scheduled refresh",
  stripe: "scheduled refresh",
  resend: "scheduled refresh",
};

const INTEGRATION_REFRESH_WINDOWS_MS: Record<IntegrationProvider, number> = {
  github: 6 * 60 * 60 * 1000,
  gcp: 12 * 60 * 60 * 1000,
  stripe: 24 * 60 * 60 * 1000,
  resend: 12 * 60 * 60 * 1000,
};

function now() {
  return new Date().toISOString();
}

function plusDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function makeId() {
  return crypto.randomUUID();
}

function isBlankText(value?: string | null) {
  return !value?.trim();
}

function backfillText(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function backfillLines(values: string[] | undefined, fallback: string[]) {
  return values && values.length > 0 ? values : fallback;
}

function isMoatType(value: unknown): value is Product["chosenMoat"] {
  return (
    value === "domain-expertise" ||
    value === "data-gravity" ||
    value === "workflow-specificity" ||
    value === "platform-integration"
  );
}

function assertRequiredProductFields(
  fields: Pick<
    Product,
    "name" | "summary" | "vertical" | "pricingHypothesis" | "targetUser" | "coreProblem"
  >,
) {
  if (isBlankText(fields.name)) {
    throw new Error("Name is required.");
  }

  if (isBlankText(fields.summary)) {
    throw new Error("Summary is required.");
  }

  if (isBlankText(fields.vertical)) {
    throw new Error("Vertical is required.");
  }

  if (isBlankText(fields.pricingHypothesis)) {
    throw new Error("Pricing hypothesis is required.");
  }

  if (isBlankText(fields.targetUser)) {
    throw new Error("Target user is required.");
  }

  if (isBlankText(fields.coreProblem)) {
    throw new Error("Core problem is required.");
  }
}

function assertValidChosenMoat(chosenMoat?: unknown): asserts chosenMoat is Product["chosenMoat"] | undefined {
  if (chosenMoat !== undefined && !isMoatType(chosenMoat)) {
    throw new Error("Invalid moat type.");
  }
}

function resolveProductTemplateOrThrow(templateId?: ProductTemplateId) {
  if (!templateId) {
    return null;
  }

  const template = getProductTemplate(templateId);

  if (!template) {
    throw new Error("Invalid product template.");
  }

  return template;
}

function buildSeededSpec(
  productId: string,
  fields: Pick<Product, "targetUser" | "coreProblem" | "pricingHypothesis">,
  template: ProductTemplate | null,
) {
  const specPack = template?.stages.spec;

  return {
    productId,
    targetUser: fields.targetUser,
    problem: fields.coreProblem,
    v1Features: specPack?.v1Features ?? [],
    exclusions: specPack?.exclusions ?? [],
    pricingHypothesis: fields.pricingHypothesis,
    launchCriteria: specPack?.launchCriteria ?? [],
    definitionOfDone: specPack?.definitionOfDone ?? "",
    updatedAt: now(),
  } satisfies SpecDocument;
}

function applyTemplateBackfillToProduct(product: Product, template: ProductTemplate) {
  product.summary = backfillText(product.summary, template.defaults.summary);
  product.vertical = backfillText(product.vertical, template.defaults.vertical);
  product.pricingHypothesis = backfillText(
    product.pricingHypothesis,
    template.defaults.pricingHypothesis,
  );
  product.targetUser = backfillText(product.targetUser, template.defaults.targetUser);
  product.coreProblem = backfillText(product.coreProblem, template.defaults.coreProblem);

  if (isBlankText(product.chosenMoat)) {
    product.chosenMoat = template.defaults.chosenMoat;
  }

  product.templateId = template.id;
  product.templateVersion = PRODUCT_TEMPLATE_VERSION;
}

function applyTemplateBackfillToSpec(
  spec: SpecDocument | undefined,
  product: Pick<Product, "id" | "targetUser" | "coreProblem" | "pricingHypothesis">,
  template: ProductTemplate,
) {
  if (!spec) {
    return buildSeededSpec(product.id, product, template);
  }

  spec.targetUser = backfillText(spec.targetUser, product.targetUser);
  spec.problem = backfillText(spec.problem, product.coreProblem);
  spec.pricingHypothesis = backfillText(spec.pricingHypothesis, product.pricingHypothesis);
  spec.v1Features = backfillLines(spec.v1Features, template.stages.spec.v1Features);
  spec.exclusions = backfillLines(spec.exclusions, template.stages.spec.exclusions);
  spec.launchCriteria = backfillLines(
    spec.launchCriteria,
    template.stages.spec.launchCriteria,
  );
  spec.definitionOfDone = backfillText(
    spec.definitionOfDone,
    template.stages.spec.definitionOfDone,
  );
  spec.updatedAt = now();
  return spec;
}

function ensureProductOwnership(products: Product[], workspaceId: string, productId: string) {
  const product = products.find(
    (entry) => entry.id === productId && entry.workspaceId === workspaceId,
  );

  if (!product) {
    throw new Error("Product not found in this workspace.");
  }

  return product;
}

function isProductArchived(product: Pick<Product, "archivedAt">) {
  return Boolean(product.archivedAt);
}

function throwArchivedProductMutationError() {
  throw new Error("Archived products are read-only. Restore the product before making workflow changes.");
}

function ensureMutableProductOwnership(products: Product[], workspaceId: string, productId: string) {
  const product = ensureProductOwnership(products, workspaceId, productId);

  if (isProductArchived(product)) {
    throwArchivedProductMutationError();
  }

  return product;
}

type ActivityEventInput = {
  workspaceId: string;
  productId?: string;
  category: ActivityEvent["category"];
  kind: ActivityEvent["kind"];
  source: ActivityEventSource;
  title: string;
  detail: string;
  metadata?: Record<string, unknown>;
};

type ActivityFeedEntry = ActivityEvent & {
  product: {
    id: string;
    name: string;
  } | null;
};

function sortActivityEventsNewestFirst(events: ActivityEvent[]) {
  return [...events].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function appendActivityEvent(database: DatabaseShape, input: ActivityEventInput) {
  const event = {
    id: makeId(),
    workspaceId: input.workspaceId,
    productId: input.productId,
    category: input.category,
    kind: input.kind,
    source: input.source,
    title: input.title,
    detail: input.detail,
    createdAt: now(),
    metadata: input.metadata ?? {},
  } satisfies ActivityEvent;

  database.activityEvents.push(event);
  return event;
}

function appendProductActivityEvent(
  database: DatabaseShape,
  product: Product,
  input: Omit<ActivityEventInput, "workspaceId" | "productId">,
) {
  return appendActivityEvent(database, {
    workspaceId: product.workspaceId,
    productId: product.id,
    ...input,
  });
}

type AutomationRunInput = {
  kind: AutomationRun["kind"];
  status: AutomationRun["status"];
  startedAt: string;
  summary: string;
  metrics: Record<string, number>;
  error?: string;
};

function appendAutomationRun(database: DatabaseShape, input: AutomationRunInput) {
  const run = {
    id: makeId(),
    kind: input.kind,
    status: input.status,
    startedAt: input.startedAt,
    finishedAt: now(),
    summary: input.summary,
    metrics: input.metrics,
    error: input.error,
  } satisfies AutomationRun;

  database.automationRuns.unshift(run);
  database.automationRuns = database.automationRuns.slice(0, 24);

  if (run.status === "partial") {
    console.warn(
      JSON.stringify({
        event: "microsaas_factory_automation_warning",
        kind: run.kind,
        status: run.status,
        summary: run.summary,
        metrics: run.metrics,
        error: run.error ?? null,
      }),
    );
  }

  if (run.status === "failed") {
    console.error(
      JSON.stringify({
        event: "microsaas_factory_automation_failure",
        kind: run.kind,
        status: run.status,
        summary: run.summary,
        metrics: run.metrics,
        error: run.error ?? null,
      }),
    );
  }

  return run;
}

export function listWorkspaceActivityEvents(
  events: ActivityEvent[],
  workspaceId: string,
  limit = 20,
) {
  return sortActivityEventsNewestFirst(
    events.filter((event) => event.workspaceId === workspaceId),
  ).slice(0, limit);
}

export function listProductActivityEvents(
  events: ActivityEvent[],
  workspaceId: string,
  productId: string,
  limit = 15,
) {
  return sortActivityEventsNewestFirst(
    events.filter(
      (event) => event.workspaceId === workspaceId && event.productId === productId,
    ),
  ).slice(0, limit);
}

function enrichActivityFeed(
  events: ActivityEvent[],
  products: Array<Pick<Product, "id" | "name">>,
): ActivityFeedEntry[] {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return events.map((event) => ({
    ...event,
    product: event.productId ? productsById.get(event.productId) ?? null : null,
  }));
}

export function scoreOpportunity(input: {
  competitionCount: number;
  complaintFrequency: number;
  painSeverity: number;
  willingnessToPay: number;
  moatType: Opportunity["moatType"];
}) {
  const painScore = Math.min(10, input.complaintFrequency + input.painSeverity);
  const competitionScore =
    input.competitionCount >= 4 && input.competitionCount <= 12
      ? 10
      : input.competitionCount < 4
        ? 6
        : 5;
  const pricingPowerScore = Math.min(10, input.willingnessToPay * 2);
  const founderFitScore =
    input.moatType === "domain-expertise" || input.moatType === "workflow-specificity" ? 10 : 8;
  const moatScore =
    input.moatType === "domain-expertise"
      ? 10
      : input.moatType === "platform-integration"
        ? 9
        : input.moatType === "data-gravity"
          ? 8
          : 9;
  const totalScore = painScore + competitionScore + pricingPowerScore + founderFitScore + moatScore;
  const thesis =
    competitionScore >= 9
      ? "Validated demand with room to position on UX and niche specificity."
      : input.competitionCount < 4
        ? "Novel opportunity, but demand needs more proof before build."
        : "Crowded market. Differentiate through workflow depth and sharper ICP.";

  return {
    painScore,
    competitionScore,
    pricingPowerScore,
    founderFitScore,
    moatScore,
    totalScore,
    thesis,
  } satisfies OpportunityScore;
}

export function computeValidationDecision(productId: string, leads: ValidationLead[]) {
  const enthusiasticYesCount = leads.filter(
    (lead) =>
      lead.willingToPay &&
      (lead.status === "enthusiastic" || lead.demoBooked || lead.reservationPlaced),
  ).length;
  const hasMetThreshold = leads.length >= 10 && enthusiasticYesCount >= 3;
  const summary = hasMetThreshold
    ? "Validation threshold met. The market has earned a build cycle."
    : `Need ${Math.max(0, 10 - leads.length)} more leads and ${Math.max(0, 3 - enthusiasticYesCount)} more enthusiastic yes signals.`;

  return {
    productId,
    totalLeads: leads.length,
    enthusiasticYesCount,
    hasMetThreshold,
    summary,
  } satisfies ValidationDecision;
}

function touchpointCountsAsResponse(outcome: ValidationTouchpoint["outcome"]) {
  return (
    outcome === "replied" ||
    outcome === "positive" ||
    outcome === "booked" ||
    outcome === "declined"
  );
}

function touchpointCountsAsPositive(outcome: ValidationTouchpoint["outcome"]) {
  return outcome === "positive" || outcome === "booked";
}

function normalizeDateInput(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return new Date(`${trimmed}T12:00:00.000Z`).toISOString();
}

function plusHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function toDayKey(value?: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function sentenceCase(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function cleanInsightText(value: string) {
  return sentenceCase(
    value
      .replace(/^[\s*-]+\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function uniqueInsights(values: string[], limit = 4) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = cleanInsightText(value);

    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function extractSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanInsightText(sentence))
    .filter(Boolean);
}

function summarizeTranscript(text: string) {
  return extractSentences(text).slice(0, 2).join(" ");
}

function pickSentencesByKeywords(text: string, keywords: string[], limit = 3) {
  const matches = extractSentences(text).filter((sentence) => {
    const lowered = sentence.toLowerCase();
    return keywords.some((keyword) => lowered.includes(keyword));
  });

  return uniqueInsights(matches, limit);
}

function normalizeClusterKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildInsightClusters(values: string[]) {
  const clusters = new Map<string, { label: string; count: number }>();

  for (const value of values) {
    const label = cleanInsightText(value);

    if (!label) {
      continue;
    }

    const key = normalizeClusterKey(label);
    const existing = clusters.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    clusters.set(key, { label, count: 1 });
  }

  return [...clusters.values()].sort((left, right) => right.count - left.count).slice(0, 6);
}

function isTaskOverdue(task: ValidationTask) {
  if (task.state !== "due" || !task.dueAt) {
    return false;
  }

  return toDayKey(task.dueAt) < toDayKey(now());
}

function isTaskDueToday(task: ValidationTask) {
  if (task.state !== "due") {
    return false;
  }

  if (!task.dueAt) {
    return true;
  }

  return toDayKey(task.dueAt) === toDayKey(now());
}

function isTaskQueued(task: ValidationTask) {
  return task.state === "queued";
}

function computeValidationTaskBuckets(tasks: ValidationTask[]) {
  return {
    queued: tasks.filter(isTaskQueued),
    dueToday: tasks.filter(isTaskDueToday),
    overdue: tasks.filter(isTaskOverdue),
    snoozed: tasks.filter((task) => task.state === "snoozed"),
    completed: tasks.filter((task) => task.state === "done"),
    canceled: tasks.filter((task) => task.state === "canceled"),
  };
}

function deriveStageAssessment(
  sentiment: ValidationSessionAnalysis["sentiment"],
  buyingSignals: string[],
  objections: string[],
): ValidationLead["status"] {
  if (buyingSignals.length >= 2 && sentiment === "positive") {
    return "enthusiastic";
  }

  if (buyingSignals.length > 0) {
    return "interested";
  }

  if (objections.length >= 2 && sentiment === "negative") {
    return "declined";
  }

  return "contacted";
}

function buildValidationSessionAnalysisFallback(
  transcriptText: string,
): ValidationSessionAnalysis {
  const objections = pickSentencesByKeywords(transcriptText, [
    "concern",
    "worry",
    "hesitat",
    "budget",
    "timing",
    "security",
    "integration",
    "not ready",
    "hard",
    "manual",
    "slow",
    "cannot",
    "can't",
  ]);
  const painPoints = pickSentencesByKeywords(transcriptText, [
    "problem",
    "pain",
    "manual",
    "slow",
    "waste",
    "friction",
    "hours",
    "delay",
    "difficult",
    "hard",
    "can't find",
    "cannot find",
  ]);
  const buyingSignals = pickSentencesByKeywords(transcriptText, [
    "interested",
    "would pay",
    "pilot",
    "trial",
    "budget",
    "urgent",
    "need this",
    "use this",
    "valuable",
    "book a demo",
    "next step",
  ]);
  const sentiment: ValidationSessionAnalysis["sentiment"] =
    buyingSignals.length > objections.length
      ? "positive"
      : objections.length > buyingSignals.length
        ? "negative"
        : "mixed";
  const summary =
    summarizeTranscript(transcriptText) ||
    "Captured a validation session transcript for structured follow-up.";
  const recommendedNextActions = uniqueInsights(
    [
      buyingSignals[0]
        ? `Follow up on buyer signal: ${buyingSignals[0]}`
        : "Send a concise follow-up that confirms the next validation step.",
      objections[0]
        ? `Address objection: ${objections[0]}`
        : "Clarify the most likely blocker before the next conversation.",
      painPoints[0]
        ? `Capture proof around pain point: ${painPoints[0]}`
        : "Document the strongest pain statement from this session.",
    ],
    3,
  );

  return {
    summary,
    objections,
    painPoints,
    buyingSignals,
    sentiment,
    stageAssessment: deriveStageAssessment(sentiment, buyingSignals, objections),
    recommendedNextActions,
  };
}

function parseValidationSessionAnalysis(
  text: string,
  fallback: ValidationSessionAnalysis,
): ValidationSessionAnalysis {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<ValidationSessionAnalysis>;
    const objections = Array.isArray(parsed.objections)
      ? uniqueInsights(parsed.objections.map(String))
      : fallback.objections;
    const painPoints = Array.isArray(parsed.painPoints)
      ? uniqueInsights(parsed.painPoints.map(String))
      : fallback.painPoints;
    const buyingSignals = Array.isArray(parsed.buyingSignals)
      ? uniqueInsights(parsed.buyingSignals.map(String))
      : fallback.buyingSignals;
    const sentiment =
      parsed.sentiment === "positive" ||
      parsed.sentiment === "mixed" ||
      parsed.sentiment === "negative"
        ? parsed.sentiment
        : fallback.sentiment;
    const stageAssessment =
      parsed.stageAssessment === "queued" ||
      parsed.stageAssessment === "contacted" ||
      parsed.stageAssessment === "interested" ||
      parsed.stageAssessment === "enthusiastic" ||
      parsed.stageAssessment === "declined"
        ? parsed.stageAssessment
        : deriveStageAssessment(sentiment, buyingSignals, objections);

    return {
      summary: cleanInsightText(String(parsed.summary ?? fallback.summary)) || fallback.summary,
      objections,
      painPoints,
      buyingSignals,
      sentiment,
      stageAssessment,
      recommendedNextActions: Array.isArray(parsed.recommendedNextActions)
        ? uniqueInsights(parsed.recommendedNextActions.map(String), 3)
        : fallback.recommendedNextActions,
    };
  } catch {
    return fallback;
  }
}

export function computeValidationOutreachSummary(
  leads: ValidationLead[],
  touchpoints: ValidationTouchpoint[],
) {
  const contactedLeadIds = new Set(touchpoints.map((touchpoint) => touchpoint.leadId));
  const repliedLeadIds = new Set(
    touchpoints
      .filter((touchpoint) => touchpointCountsAsResponse(touchpoint.outcome))
      .map((touchpoint) => touchpoint.leadId),
  );
  const positiveLeadIds = new Set(
    touchpoints
      .filter((touchpoint) => touchpointCountsAsPositive(touchpoint.outcome))
      .map((touchpoint) => touchpoint.leadId),
  );
  const followUpsDueCount = leads.filter((lead) => {
    if (!lead.nextFollowUpAt || lead.status === "declined") {
      return false;
    }

    return new Date(lead.nextFollowUpAt).getTime() <= Date.now();
  }).length;
  const noResponseLeadCount = leads.filter(
    (lead) => contactedLeadIds.has(lead.id) && !repliedLeadIds.has(lead.id) && lead.status !== "declined",
  ).length;
  const responseRate =
    contactedLeadIds.size === 0 ? 0 : (repliedLeadIds.size / contactedLeadIds.size) * 100;
  const contactCoverageRate =
    leads.length === 0 ? 0 : (contactedLeadIds.size / leads.length) * 100;
  const lastTouchpointAt = touchpoints.reduce<string | undefined>(
    (latest, touchpoint) =>
      !latest || touchpoint.createdAt > latest ? touchpoint.createdAt : latest,
    undefined,
  );

  return {
    totalTouchpoints: touchpoints.length,
    contactedLeadCount: contactedLeadIds.size,
    repliedLeadCount: repliedLeadIds.size,
    positiveLeadCount: positiveLeadIds.size,
    followUpsDueCount,
    noResponseLeadCount,
    responseRate,
    contactCoverageRate,
    lastTouchpointAt,
  } satisfies ValidationOutreachSummary;
}

function ensureValidationLeadOwnership(
  leads: ValidationLead[],
  productId: string,
  leadId?: string,
) {
  if (!leadId) {
    return null;
  }

  const lead = leads.find((entry) => entry.id === leadId && entry.productId === productId);

  if (!lead) {
    throw new Error("Validation lead not found.");
  }

  return lead;
}

function ensureValidationSessionOwnership(
  sessions: ValidationSession[],
  productId: string,
  sessionId?: string,
) {
  if (!sessionId) {
    return null;
  }

  const session = sessions.find((entry) => entry.id === sessionId && entry.productId === productId);

  if (!session) {
    throw new Error("Validation session not found.");
  }

  return session;
}

function ensureValidationTaskOwnership(
  database: DatabaseShape,
  workspaceId: string,
  taskId: string,
) {
  const task = database.validationTasks.find((entry) => entry.id === taskId);

  if (!task) {
    throw new Error("Validation task not found.");
  }

  ensureProductOwnership(database.products, workspaceId, task.productId);
  return task;
}

function inferTaskTypeFromAction(action: string): ValidationTaskType {
  const lowered = action.toLowerCase();

  if (lowered.includes("email")) {
    return "email";
  }

  if (lowered.includes("dm") || lowered.includes("linkedin")) {
    return "dm";
  }

  if (lowered.includes("call") || lowered.includes("demo")) {
    return "call";
  }

  return "follow-up";
}

function deriveValidationTaskState(dueAt?: string): ValidationTaskState {
  if (!dueAt) {
    return "due";
  }

  return new Date(dueAt).getTime() <= Date.now() ? "due" : "queued";
}

function promoteValidationTaskState(task: ValidationTask) {
  if (task.state === "queued" && task.dueAt && new Date(task.dueAt).getTime() <= Date.now()) {
    task.state = "due";
    task.updatedAt = now();
  }

  if (
    task.state === "snoozed" &&
    task.snoozedUntil &&
    new Date(task.snoozedUntil).getTime() <= Date.now()
  ) {
    task.state = "due";
    task.updatedAt = now();
    task.snoozedUntil = undefined;
  }

  return task;
}

function createValidationTaskRecord(input: {
  productId: string;
  leadId?: string;
  sessionId?: string;
  type: ValidationTaskType;
  title: string;
  notes: string;
  source: ValidationTaskSource;
  dueAt?: string;
}) {
  return {
    id: makeId(),
    productId: input.productId,
    leadId: input.leadId,
    sessionId: input.sessionId,
    type: input.type,
    title: input.title.trim(),
    notes: input.notes.trim(),
    state: deriveValidationTaskState(input.dueAt),
    source: input.source,
    dueAt: input.dueAt,
    createdAt: now(),
    updatedAt: now(),
  } satisfies ValidationTask;
}

function buildValidationSessionAnalysisPrompt(input: {
  product: Product;
  lead: ValidationLead | null;
  session: ValidationSession;
}) {
  return [
    "You are extracting founder CRM intelligence from a validation interview transcript.",
    "Return strict JSON with keys:",
    'summary, objections, painPoints, buyingSignals, sentiment, stageAssessment, recommendedNextActions',
    "Use short phrases for list items. Sentiment must be one of: negative, mixed, positive.",
    "stageAssessment must be one of: queued, contacted, interested, enthusiastic, declined.",
    `Product: ${input.product.name}`,
    `Vertical: ${input.product.vertical}`,
    `Target user: ${input.product.targetUser}`,
    `Lead: ${input.lead?.name ?? "Unknown"}`,
    `Lead company: ${input.lead?.company ?? "Unknown"}`,
    `Context: ${input.session.context || "Validation conversation"}`,
    `Channel: ${input.session.channel}`,
    "Transcript:",
    input.session.transcriptText,
  ].join("\n");
}

async function analyzeValidationSessionRecord(input: {
  product: Product;
  lead: ValidationLead | null;
  session: ValidationSession;
  mode: "flash" | "pro";
}) {
  const fallback = buildValidationSessionAnalysisFallback(input.session.transcriptText);
  const aiText = await generateText({
    model: input.mode,
    prompt: buildValidationSessionAnalysisPrompt(input),
    fallback: JSON.stringify(fallback),
  });

  return parseValidationSessionAnalysis(aiText, fallback);
}

function buildValidationTaskDigestBody(
  product: Product,
  tasks: ValidationTask[],
  leadMap: Map<string, ValidationLead>,
) {
  const lines = [
    `CRM reminder for ${product.name}.`,
    "",
    "Due founder tasks:",
    ...tasks.map((task) => {
      const lead = task.leadId ? leadMap.get(task.leadId) : null;
      const dueLabel = task.dueAt ? ` due ${task.dueAt.slice(0, 10)}` : "";
      return `- [${task.type}] ${task.title}${lead ? ` / ${lead.name}` : ""}${dueLabel}`;
    }),
    "",
    "Open the workspace CRM inbox or the product validation lane to update task state.",
  ];

  return lines.join("\n");
}

function listCompletedSessionAnalyses(sessions: ValidationSession[]) {
  return sessions
    .filter((session) => session.analysisStatus === "completed" && session.analysis)
    .map((session) => session.analysis!);
}

function buildValidationCrmSummary(
  sessions: ValidationSession[],
  tasks: ValidationTask[],
) {
  const analyses = listCompletedSessionAnalyses(sessions);
  const buckets = computeValidationTaskBuckets(tasks);

  return {
    pendingAnalysisCount: sessions.filter((session) => session.analysisStatus !== "completed").length,
    dueTodayCount: buckets.dueToday.length,
    overdueCount: buckets.overdue.length,
    snoozedCount: buckets.snoozed.length,
    topObjections: buildInsightClusters(analyses.flatMap((analysis) => analysis.objections)),
    topPainPoints: buildInsightClusters(analyses.flatMap((analysis) => analysis.painPoints)),
  };
}

function buildDashboardProductEntry(database: DatabaseShape, product: Product) {
  const latestGate =
    database.launchGateResults
      .filter((result) => result.productId === product.id)
      .sort((left, right) => right.evaluatedAt.localeCompare(left.evaluatedAt))[0] ?? null;
  const latestRevenue =
    database.revenueSnapshots
      .filter((snapshot) => snapshot.productId === product.id)
      .sort((left, right) => right.syncedAt.localeCompare(left.syncedAt))[0] ?? null;
  const latestDeployment =
    database.deploymentSnapshots
      .filter((snapshot) => snapshot.productId === product.id && snapshot.provider === "gcp")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
  const integrations = database.integrations.filter(
    (entry) => entry.productId === product.id && entry.status === "connected",
  );
  const emailSequence =
    database.emailSequences.find((entry) => entry.productId === product.id) ?? null;
  const productSessions = database.validationSessions.filter(
    (entry) => entry.productId === product.id,
  );
  const productTasks = database.validationTasks
    .filter((entry) => entry.productId === product.id)
    .map((task) => promoteValidationTaskState({ ...task }))
    .sort((left, right) =>
      (left.dueAt ?? left.updatedAt).localeCompare(right.dueAt ?? right.updatedAt),
    );

  return {
    product,
    template: getProductTemplate(product.templateId),
    latestGate,
    latestRevenue,
    latestDeployment,
    connectedIntegrationsCount: integrations.length,
    crmSummary: buildValidationCrmSummary(productSessions, productTasks),
    readyForNextProduct:
      latestGate?.readyForNextProduct ?? evaluateReadyForNextProduct(product, emailSequence),
  };
}

function buildEmptyBuildSheet(productId: string, updatedAt = now()): BuildSheet {
  return {
    productId,
    releaseGoal: "",
    shipChecklist: [],
    blockers: [],
    notes: "",
    targetReleaseAt: undefined,
    updatedAt,
  } satisfies BuildSheet;
}

function getBuildSheet(buildSheets: BuildSheet[], productId: string, updatedAt?: string): BuildSheet {
  return (
    buildSheets.find((entry) => entry.productId === productId) ??
    buildEmptyBuildSheet(productId, updatedAt)
  );
}

function upsertBuildSheet(
  buildSheets: BuildSheet[],
  productId: string,
  input: Omit<BuildSheet, "productId">,
) {
  const existing = buildSheets.find((entry) => entry.productId === productId);

  if (existing) {
    Object.assign(existing, input);
    return existing;
  }

  const buildSheet = {
    productId,
    ...input,
  } satisfies BuildSheet;

  buildSheets.push(buildSheet);
  return buildSheet;
}

export function isSpecComplete(spec?: SpecDocument | null) {
  if (!spec) {
    return false;
  }

  return Boolean(
    spec.targetUser.trim() &&
      spec.problem.trim() &&
      spec.v1Features.length >= 3 &&
      spec.exclusions.length >= 1 &&
      spec.pricingHypothesis.trim() &&
      spec.launchCriteria.length >= 2 &&
      spec.definitionOfDone.trim(),
  );
}

function getLatestDeploymentSnapshot(
  deploymentSnapshots: DatabaseShape["deploymentSnapshots"],
  productId: string,
  provider: "github" | "gcp",
) {
  return (
    deploymentSnapshots
      .filter((entry) => entry.productId === productId && entry.provider === provider)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
  );
}

function evaluateBuildReadiness(input: {
  product: Product;
  spec: SpecDocument | null;
  buildSheet: BuildSheet;
  integrations: IntegrationConnection[];
  deploymentSnapshots: DatabaseShape["deploymentSnapshots"];
}): BuildReadinessSummary {
  const github = getIntegration(input.integrations, "github", input.product.id);
  const gcp = getIntegration(input.integrations, "gcp", input.product.id);
  const githubSnapshot = getLatestDeploymentSnapshot(
    input.deploymentSnapshots,
    input.product.id,
    "github",
  );
  const gcpSnapshot = getLatestDeploymentSnapshot(
    input.deploymentSnapshots,
    input.product.id,
    "gcp",
  );

  const checks = [
    {
      key: "spec",
      label: "Spec complete",
      passed: isSpecComplete(input.spec),
      detail: isSpecComplete(input.spec)
        ? "The implementation target is locked."
        : "Finish the one-page spec before using build as a launch handoff lane.",
    },
    {
      key: "github",
      label: "GitHub connected",
      passed: github?.status === "connected",
      detail:
        github?.status === "connected"
          ? "Repository access is configured."
          : "Connect the target repository before build review.",
    },
    {
      key: "github-snapshot",
      label: "GitHub snapshot present",
      passed: Boolean(githubSnapshot),
      detail: githubSnapshot
        ? "Recent repository data is available for release review."
        : "Capture a repository snapshot so delivery status is visible.",
    },
    {
      key: "gcp",
      label: "GCP connected",
      passed: gcp?.status === "connected",
      detail:
        gcp?.status === "connected"
          ? "Cloud Run and Cloud Build access is configured."
          : "Connect Google Cloud before launch handoff.",
    },
    {
      key: "gcp-snapshot",
      label: "GCP snapshot present",
      passed: Boolean(gcpSnapshot),
      detail: gcpSnapshot
        ? "Deployment state is visible for release control."
        : "Refresh Google Cloud so revision and build state are current.",
    },
    {
      key: "blockers",
      label: "No build blockers",
      passed: input.buildSheet.blockers.length === 0,
      detail:
        input.buildSheet.blockers.length === 0
          ? "No founder-marked blockers remain in the build lane."
          : `${input.buildSheet.blockers.length} blocker${input.buildSheet.blockers.length === 1 ? "" : "s"} still need resolution.`,
    },
  ];
  const readyForLaunch = checks.every((check) => check.passed);

  return {
    checks,
    readyForLaunch,
    headline: readyForLaunch
      ? "Build handoff is ready for launch review"
      : "Build lane still needs release-control work",
    detail: readyForLaunch
      ? "Repository, deploy state, and founder release controls are aligned. Move into Launch to run the final gate."
      : checks
          .filter((check) => !check.passed)
          .map((check) => check.label)
          .join(", "),
  };
}

export function buildDefaultLaunchChecklist(product: Product) {
  return [
    `Validate ${product.name} with at least 10 target users and 3 enthusiastic yes responses.`,
    "Connect GitHub, GCP, Stripe, and Resend before launch review.",
    "Confirm onboarding Day 0 / 1 / 3 / 7 / 14 messages are edited and test-sent.",
    "Resolve all critical blockers and verify no active P1 issues remain.",
  ];
}

function cleanGeneratedLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s*-]+\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function buildOpportunityAiFallback(product: Product, opportunity: Opportunity) {
  const validatedDemand =
    opportunity.competitionCount >= 4 && opportunity.competitionCount <= 12
      ? "Demand looks validated."
      : opportunity.competitionCount < 4
        ? "Demand still needs harder validation."
        : "The niche is crowded and requires sharper positioning.";

  return [
    `${validatedDemand} ${product.name} fits ${opportunity.audience} because the problem is concrete and recurring.`,
    `Lead with the moat on ${opportunity.moatType.replaceAll("-", " ")} and price against the operational pain, not the build effort.`,
    `Before building further, confirm this angle in founder interviews and gather specific objections tied to ${opportunity.pricingPowerEstimate}.`,
  ].join(" ");
}

function buildLaunchChecklistFallback(bundle: Awaited<ReturnType<typeof getProductBundle>>) {
  const lines = [
    `Confirm ${bundle.validationDecision.totalLeads}/10 validation leads and ${bundle.validationDecision.enthusiasticYesCount}/3 enthusiastic yes signals.`,
    "Verify the one-page spec is complete, approved, and reflects the current pricing hypothesis.",
    "Connect GitHub, GCP, Stripe, and Resend, then re-run the launch gate.",
    "Test the onboarding sequence from Day 0 through Day 14 with a founder-owned inbox.",
    "Resolve all critical blockers and reduce active P1 bugs to zero before launch.",
  ];

  if (bundle.product.metrics.monthlyRecurringRevenue < 500) {
    lines.push("Push for the first paying signal or commit path before starting the next product lane.");
  }

  if (bundle.template) {
    lines.push(...bundle.template.stages.launch.checklistStarters);
  }

  return lines;
}

function sortPlatformPlansForAdmin(plans: PlatformPlan[]) {
  return [...plans].sort(
    (left, right) =>
      Number(left.hidden) - Number(right.hidden) ||
      left.monthlyPrice - right.monthlyPrice ||
      left.annualPrice - right.annualPrice ||
      left.name.localeCompare(right.name),
  );
}

function normalizePlatformPlanInput(input: {
  id: string;
  name: string;
  hidden: boolean;
  monthlyPrice: number;
  annualPrice: number;
  featuresText: string;
}) {
  const id = input.id.trim().toLowerCase();
  const name = input.name.trim();
  const features = splitLines(input.featuresText);

  if (!id) {
    throw new Error("Plan ID is required.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("Plan ID must use lowercase letters, numbers, and hyphens only.");
  }

  if (!name) {
    throw new Error("Plan name is required.");
  }

  if (!Number.isFinite(input.monthlyPrice) || input.monthlyPrice < 0) {
    throw new Error("Monthly price must be zero or greater.");
  }

  if (!Number.isFinite(input.annualPrice) || input.annualPrice < 0) {
    throw new Error("Annual price must be zero or greater.");
  }

  if (features.length === 0) {
    throw new Error("At least one plan feature is required.");
  }

  return {
    id,
    name,
    hidden: input.hidden,
    monthlyPrice: input.monthlyPrice,
    annualPrice: input.annualPrice,
    features,
  } satisfies PlatformPlan;
}

export async function listPublicMetrics() {
  const database = await readDatabase();
  const auth = getAuthModeInfo();

  return {
    waitlistCount: database.waitlistRequests.length,
    workspaceCount: database.workspaces.length,
    productCount: database.products.length,
    inviteOnly: database.globalFeatureFlags.inviteOnlyBeta,
    featureFlags: database.globalFeatureFlags,
    auth,
  };
}

export async function getPublicPricingData() {
  const database = await readDatabase();

  return {
    flags: database.globalFeatureFlags,
    plans: getPublicPlatformPlans(database.platformPlans),
  };
}

export async function resolveAiGenerationMode(useProModel: boolean) {
  if (!useProModel) {
    return "flash" as const;
  }

  const database = await readDatabase();
  return resolveAiGenerationModeForFlags(database.globalFeatureFlags, useProModel);
}

export function resolveAiGenerationModeForFlags(
  featureFlags: Pick<FeatureFlags, "proAiEnabled">,
  useProModel: boolean,
) {
  return useProModel && featureFlags.proAiEnabled ? ("pro" as const) : ("flash" as const);
}

export async function createWaitlistRequest(input: {
  name: string;
  email: string;
  challenge: string;
  notes: string;
}) {
  return updateDatabase((database) => {
    const email = input.email.trim().toLowerCase();
    const existing = database.waitlistRequests.find((request) => request.email === email);

    if (existing) {
      existing.name = input.name.trim();
      existing.challenge = input.challenge.trim();
      existing.notes = input.notes.trim();
      return existing;
    }

    const request = {
      id: makeId(),
      name: input.name.trim(),
      email,
      challenge: input.challenge.trim(),
      notes: input.notes.trim(),
      createdAt: now(),
      status: "pending" as const,
    };
    database.waitlistRequests.push(request);
    return request;
  });
}

function createInviteRecord(
  database: DatabaseShape,
  input: { email: string; workspaceName: string },
) {
  const email = input.email.trim().toLowerCase();
  const invite = {
    id: makeId(),
    token: crypto.randomUUID().replace(/-/g, ""),
    email,
    workspaceName: input.workspaceName.trim(),
    createdAt: now(),
    expiresAt: plusDays(30),
  };

  database.invites.push(invite);
  database.waitlistRequests = database.waitlistRequests.map((request) =>
    request.email === email ? { ...request, status: "invited" } : request,
  );

  const matchingIntent = database.signupIntents.find(
    (intent) =>
      intent.email === email &&
      intent.workspaceName === input.workspaceName.trim() &&
      intent.status === "pending_activation",
  );

  if (matchingIntent) {
    matchingIntent.status = "invited";
  }

  return invite;
}

export async function createInvite(input: { email: string; workspaceName: string }) {
  return updateDatabase((database) => {
    return createInviteRecord(database, input);
  });
}

export async function getInviteByToken(token: string) {
  const database = await readDatabase();
  return database.invites.find((invite) => invite.token === token) ?? null;
}

export async function createSignupIntent(input: {
  founderName: string;
  email: string;
  workspaceName: string;
  planId: string;
}) {
  return updateDatabase((database) => {
    if (!database.globalFeatureFlags.publicSignupEnabled) {
      throw new Error("Public signup is disabled.");
    }

    const email = input.email.trim().toLowerCase();
    const workspaceName = input.workspaceName.trim();

    const founderName =
      input.founderName?.trim() || email.split("@")[0] || "Founder";

    if (!email || !workspaceName) {
      throw new Error("Email and workspace name are required.");
    }

    const publicPlans = getPublicPlatformPlans(database.platformPlans);

    if (publicPlans.length === 0) {
      throw new Error("Public signup is unavailable because no public plans are visible.");
    }

    const plan = publicPlans.find(
      (entry) => entry.id === input.planId,
    );

    if (!plan) {
      throw new Error("Selected plan is not available.");
    }

    const owner = getWorkspaceOwner(database, email);

    if (owner.user && owner.workspace) {
      throw new Error(
        "A founder workspace already exists for this email. Reopen it from founder login.",
      );
    }

    const existing = database.signupIntents.find(
      (intent) => intent.email === email,
    );

    if (existing) {
      existing.founderName = founderName;

      if (existing.status === "pending_activation") {
        existing.workspaceName = workspaceName;
        existing.planId = plan.id;
        existing.status = "pending_activation";
        existing.workspaceId = undefined;
        existing.userId = undefined;
        existing.activatedAt = undefined;

        return existing;
      }

      if (existing.status === "invited") {
        return existing;
      }

      throw new Error(
        "A founder workspace already exists for this email. Reopen it from founder login.",
      );
    }

    const signupIntent = {
      id: makeId(),
      founderName,
      email,
      workspaceName,
      planId: plan.id,
      createdAt: now(),
      status: "pending_activation" as const,
    } satisfies SignupIntent;

    database.signupIntents.push(signupIntent);
    return signupIntent;
  });
}

export async function getSignupIntentById(signupIntentId?: string | null) {
  if (!signupIntentId) {
    return null;
  }

  const database = await readDatabase();
  return database.signupIntents.find((entry) => entry.id === signupIntentId) ?? null;
}

export async function createInviteFromSignupIntent(signupIntentId: string) {
  return updateDatabase((database) => {
    const signupIntent = database.signupIntents.find((entry) => entry.id === signupIntentId);

    if (!signupIntent) {
      throw new Error("Signup intent not found.");
    }

    if (signupIntent.status !== "pending_activation") {
      throw new Error("Signup intent has already been handled.");
    }

    const invite = createInviteRecord(database, {
      email: signupIntent.email,
      workspaceName: signupIntent.workspaceName,
    });
    signupIntent.status = "invited";

    return {
      invite,
      signupIntent,
    };
  });
}

function inferFirebaseLoginMethod(providerId?: string) {
  return providerId === "google.com" ? "firebase-google" : "firebase-email-link";
}

function resolveFounderName(input: { providedName?: string; email: string; currentName?: string }) {
  const provided = input.providedName?.trim();

  if (provided) {
    return provided;
  }

  if (input.currentName?.trim()) {
    return input.currentName.trim();
  }

  return input.email.split("@")[0];
}

function getWorkspaceOwner(database: DatabaseShape, email: string) {
  const user = database.users.find((entry) => entry.email === email);
  const workspace = user
    ? database.workspaces.find(
        (entry) => entry.id === user.workspaceId && entry.ownerUserId === user.id,
      )
    : undefined;

  return { user, workspace };
}

function getWorkspaceOwnerUser(database: DatabaseShape, workspaceId: string) {
  const workspace = database.workspaces.find((entry) => entry.id === workspaceId);
  const user = workspace
    ? database.users.find((entry) => entry.id === workspace.ownerUserId)
    : undefined;

  return { user, workspace };
}

function getReadinessCheckDetail(
  readiness: ReturnType<typeof evaluateRuntimeReadiness>,
  id: "firebase" | "checkout",
) {
  return readiness.checks.find((check) => check.id === id)?.detail ?? "";
}

function upsertPlatformSubscription(
  database: DatabaseShape,
  input: {
    workspaceId: string;
    planId: string;
    status: "beta" | "trial" | "active" | "canceled";
    source: "invite" | "self-serve";
  },
) {
  const existing = database.platformSubscriptions.find(
    (entry) => entry.workspaceId === input.workspaceId,
  );

  if (existing) {
    existing.planId = existing.planId || input.planId;
    existing.updatedAt = now();

    if (existing.status !== "beta") {
      existing.status = input.status;
      existing.source = input.source;
    }

    return existing;
  }

  const subscription = {
    id: makeId(),
    workspaceId: input.workspaceId,
    planId: input.planId,
    status: input.status,
    source: input.source,
    createdAt: now(),
    updatedAt: now(),
  };

  database.platformSubscriptions.push(subscription);
  return subscription;
}

function ensureProvisionedFounderWorkspace(
  database: DatabaseShape,
  input: {
    email: string;
    founderName: string;
    workspaceName: string;
    planId: string;
    subscriptionStatus: "beta" | "trial" | "active" | "canceled";
    subscriptionSource: "invite" | "self-serve";
    loginMethod: "invite-token" | "firebase-google" | "firebase-email-link";
  },
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const owner = getWorkspaceOwner(database, normalizedEmail);
  let user = owner.user;
  let workspace = owner.workspace;
  const timestamp = now();

  if (!user) {
    user = {
      id: makeId(),
      email: normalizedEmail,
      name: input.founderName,
      workspaceId: "",
      createdAt: timestamp,
      lastLoginAt: timestamp,
      lastLoginMethod: input.loginMethod,
    };
    database.users.push(user);
  } else {
    user.name = input.founderName;
    user.lastLoginAt = timestamp;
    user.lastLoginMethod = input.loginMethod;
  }

  if (!workspace) {
    workspace = {
      id: makeId(),
      name: input.workspaceName.trim(),
      ownerUserId: user.id,
      createdAt: timestamp,
      featureFlags: { ...database.globalFeatureFlags },
    };
    user.workspaceId = workspace.id;
    database.workspaces.push(workspace);
  } else {
    user.workspaceId = workspace.id;
  }

  const subscription = upsertPlatformSubscription(database, {
    workspaceId: workspace.id,
    planId: input.planId,
    status: input.subscriptionStatus,
    source: input.subscriptionSource,
  });

  return { user, workspace, subscription };
}

function completeInviteProvisioning(
  database: DatabaseShape,
  input: {
    token: string;
    email: string;
    name?: string;
    loginMethod: "invite-token" | "firebase-google" | "firebase-email-link";
  },
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const invite = database.invites.find((entry) => entry.token === input.token);

  if (!invite) {
    throw new Error("Invite not found.");
  }

  if (invite.email !== normalizedEmail) {
    throw new Error("Invite email does not match.");
  }

  const owner = getWorkspaceOwner(database, invite.email);

  if (new Date(invite.expiresAt).getTime() < Date.now() && (!owner.user || !owner.workspace)) {
    throw new Error("Invite has expired.");
  }

  const founderName = resolveFounderName({
    providedName: input.name,
    email: invite.email,
    currentName: owner.user?.name,
  });
  const { user, workspace } = ensureProvisionedFounderWorkspace(database, {
    email: invite.email,
    founderName,
    workspaceName: invite.workspaceName,
    planId: BETA_PLATFORM_PLAN_ID,
    subscriptionStatus: "beta",
    subscriptionSource: "invite",
    loginMethod: input.loginMethod,
  });

  invite.acceptedAt = now();
  const matchingSignupIntent = database.signupIntents.find(
    (entry) =>
      entry.email === invite.email &&
      entry.workspaceName === invite.workspaceName &&
      entry.status === "invited",
  );

  if (matchingSignupIntent) {
    matchingSignupIntent.status = "provisioned";
    matchingSignupIntent.userId = user.id;
    matchingSignupIntent.workspaceId = workspace.id;
    matchingSignupIntent.activatedAt = now();
  }

  return { user, workspace, invite };
}

export async function acceptInvite(input: { token: string; email: string; name: string }) {
  return updateDatabase((database) =>
    completeInviteProvisioning(database, {
      token: input.token,
      email: input.email,
      name: input.name,
      loginMethod: "invite-token",
    }),
  );
}

export async function loginWithInvite(input: { email: string; token: string }) {
  return updateDatabase((database) =>
    completeInviteProvisioning(database, {
      token: input.token,
      email: input.email,
      name: input.email.trim().toLowerCase().split("@")[0],
      loginMethod: "invite-token",
    }).user,
  );
}

export async function completeInviteWithFirebaseIdentity(input: {
  token: string;
  email: string;
  name?: string;
  providerId?: string;
}) {
  return updateDatabase((database) =>
    completeInviteProvisioning(database, {
      token: input.token,
      email: input.email,
      name: input.name,
      loginMethod: inferFirebaseLoginMethod(input.providerId),
    }).user,
  );
}

export async function activateSelfServeSignupWithFirebaseIdentity(input: {
  signupIntentId: string;
  email: string;
  name?: string;
  providerId?: string;
}) {
  return updateDatabase((database) => {
    if (!database.globalFeatureFlags.publicSignupEnabled) {
      throw new Error("Public signup is disabled.");
    }

    if (!database.globalFeatureFlags.selfServeProvisioningEnabled) {
      throw new Error("Self-serve workspace activation is disabled.");
    }

    const signupIntent = database.signupIntents.find(
      (entry) => entry.id === input.signupIntentId,
    );

    if (!signupIntent) {
      throw new Error("Signup intent not found.");
    }

    if (signupIntent.status === "invited") {
      throw new Error("This signup is waiting for invite-based activation.");
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    if (signupIntent.email !== normalizedEmail) {
      throw new Error("Signup email does not match.");
    }

    const founderName = resolveFounderName({
      providedName: input.name,
      email: normalizedEmail,
      currentName: signupIntent.founderName,
    });
    const { user, workspace } = ensureProvisionedFounderWorkspace(database, {
      email: normalizedEmail,
      founderName,
      workspaceName: signupIntent.workspaceName,
      planId: signupIntent.planId,
      subscriptionStatus: "trial",
      subscriptionSource: "self-serve",
      loginMethod: inferFirebaseLoginMethod(input.providerId),
    });

    signupIntent.founderName = founderName;
    signupIntent.status = "provisioned";
    signupIntent.userId = user.id;
    signupIntent.workspaceId = workspace.id;
    signupIntent.activatedAt = now();

    return user;
  });
}

export async function loginWithFirebaseIdentity(input: {
  email: string;
  name?: string;
  providerId?: string;
}) {
  const database = await readDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existingUser = database.users.find((entry) => entry.email === normalizedEmail);

  if (existingUser) {
    return updateDatabase((nextDatabase) => {
      const user = nextDatabase.users.find((entry) => entry.id === existingUser.id);

      if (!user) {
        throw new Error("Founder account not found.");
      }

      if (input.name?.trim()) {
        user.name = input.name.trim();
      }
      user.lastLoginAt = now();
      user.lastLoginMethod = inferFirebaseLoginMethod(input.providerId);
      return user;
    });
  }

  const invite = [...database.invites]
    .filter((entry) => entry.email === normalizedEmail)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .find((entry) => new Date(entry.expiresAt).getTime() >= Date.now());

  if (!invite) {
    throw new Error("No provisioned workspace exists for this email.");
  }

  return updateDatabase((nextDatabase) =>
    completeInviteProvisioning(nextDatabase, {
      token: invite.token,
      email: normalizedEmail,
      name: input.name,
      loginMethod: inferFirebaseLoginMethod(input.providerId),
    }).user,
  );
}

export async function createPlatformCheckoutSession(
  workspaceId: string,
  input: {
    planId: string;
    billingInterval: BillingInterval;
  },
) {
  const database = await readDatabase();
  const readiness = evaluateRuntimeReadiness({
    flags: database.globalFeatureFlags,
    plans: database.platformPlans,
  });

  if (
    !database.globalFeatureFlags.platformBillingEnabled ||
    !database.globalFeatureFlags.checkoutEnabled
  ) {
    throw new Error("Platform checkout is not enabled.");
  }

  if (!readiness.checkoutReady) {
    throw new Error(
      getReadinessCheckDetail(readiness, "checkout") || "Stripe Checkout is not ready.",
    );
  }

  const { user, workspace } = getWorkspaceOwnerUser(database, workspaceId);

  if (!workspace || !user) {
    throw new Error("Workspace owner not found.");
  }

  const subscription =
    database.platformSubscriptions.find((entry) => entry.workspaceId === workspaceId) ?? null;

  if (!subscription) {
    throw new Error("Workspace subscription not found.");
  }

  if (subscription.status === "active") {
    throw new Error("Platform subscription is already active.");
  }

  if (subscription.status === "beta") {
    throw new Error("Invite-beta workspaces are not eligible for self-serve checkout.");
  }

  if (subscription.status !== "trial" && subscription.status !== "canceled") {
    throw new Error("Only trial or canceled workspaces can open platform checkout.");
  }

  const plan = getPublicPlatformPlans(database.platformPlans).find(
    (entry) => entry.id === input.planId,
  );

  if (!plan) {
    throw new Error("Selected plan is not publicly available.");
  }

  const priceId = getStripeCheckoutPriceId(plan.id, input.billingInterval);

  if (!priceId) {
    throw new Error("The selected plan is missing a Stripe price mapping for this billing interval.");
  }

  const session = await createStripePlatformCheckoutSession({
    priceId,
    customerEmail: user.email,
    workspaceId: workspace.id,
    planId: plan.id,
    billingInterval: input.billingInterval,
  });

  await updateDatabase((nextDatabase) => {
    const nextSubscription = nextDatabase.platformSubscriptions.find(
      (entry) => entry.workspaceId === workspace.id,
    );

    if (!nextSubscription) {
      throw new Error("Workspace subscription not found.");
    }

    nextSubscription.stripeCheckoutSessionId = session.id;
    nextSubscription.stripeCustomerId =
      session.customerId ?? nextSubscription.stripeCustomerId;
    nextSubscription.stripeSubscriptionId =
      session.subscriptionId ?? nextSubscription.stripeSubscriptionId;
    nextSubscription.updatedAt = now();
    return nextSubscription;
  });

  return session;
}

export async function getWorkspaceDashboard(workspaceId: string) {
  const database = await readDatabase();
  const workspace = database.workspaces.find((entry) => entry.id === workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const workspaceProducts = database.products
    .filter((entry) => entry.workspaceId === workspaceId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const products = workspaceProducts.filter((product) => !isProductArchived(product));
  const archivedProducts = workspaceProducts.filter((product) => isProductArchived(product));
  const productIds = new Set(products.map((product) => product.id));
  const workspaceSessions = database.validationSessions.filter((entry) =>
    productIds.has(entry.productId),
  );
  const workspaceTasks = database.validationTasks
    .filter((entry) => productIds.has(entry.productId))
    .map((task) => promoteValidationTaskState({ ...task }))
    .sort((left, right) =>
      (left.dueAt ?? left.updatedAt).localeCompare(right.dueAt ?? right.updatedAt),
    );
  const recentActivity = enrichActivityFeed(
    listWorkspaceActivityEvents(database.activityEvents, workspaceId, 20),
    workspaceProducts,
  );

  return {
    workspace,
    products: products.map((product) => buildDashboardProductEntry(database, product)),
    archivedProducts: archivedProducts.map((product) => buildDashboardProductEntry(database, product)),
    portfolio: {
      activeProductCount: products.length,
      archivedProductCount: archivedProducts.length,
      totalProductCount: workspaceProducts.length,
    },
    recentActivity,
    featureFlags: database.globalFeatureFlags,
    crmSummary: buildValidationCrmSummary(workspaceSessions, workspaceTasks),
    availableTemplates: listProductTemplates(),
    platformSubscription:
      database.platformSubscriptions.find((entry) => entry.workspaceId === workspaceId) ?? null,
  };
}

export async function createProduct(
  workspaceId: string,
  input: {
    name: string;
    summary: string;
    vertical: string;
    pricingHypothesis: string;
    targetUser: string;
    coreProblem: string;
    chosenMoat?: Product["chosenMoat"];
    templateId?: ProductTemplateId;
  },
) {
  return updateDatabase((database) => {
    const template = resolveProductTemplateOrThrow(input.templateId);
    assertValidChosenMoat(input.chosenMoat);
    const product = {
      id: makeId(),
      workspaceId,
      name: input.name.trim(),
      summary: backfillText(input.summary, template?.defaults.summary ?? ""),
      vertical: backfillText(input.vertical, template?.defaults.vertical ?? ""),
      stage: "research" as ProductStage,
      pricingHypothesis: backfillText(
        input.pricingHypothesis,
        template?.defaults.pricingHypothesis ?? "",
      ),
      targetUser: backfillText(input.targetUser, template?.defaults.targetUser ?? ""),
      coreProblem: backfillText(input.coreProblem, template?.defaults.coreProblem ?? ""),
      chosenMoat: input.chosenMoat ?? template?.defaults.chosenMoat ?? "domain-expertise",
      templateId: template?.id,
      templateVersion: template ? PRODUCT_TEMPLATE_VERSION : undefined,
      criticalBlockers: [],
      launchChecklist: [],
      metrics: {
        monthlyRecurringRevenue: 0,
        monthlyChurnRate: 0,
        supportHoursPerWeek: 0,
        activeP1Bugs: 0,
      },
      createdAt: now(),
      updatedAt: now(),
    };

    assertRequiredProductFields(product);

    database.products.push(product);
    database.specs.push(
      buildSeededSpec(
        product.id,
        {
          targetUser: product.targetUser,
          coreProblem: product.coreProblem,
          pricingHypothesis: product.pricingHypothesis,
        },
        template,
      ),
    );
    appendProductActivityEvent(database, product, {
      category: "product",
      kind: "product_created",
      source: "founder",
      title: `Created ${product.name}`,
      detail: `${product.vertical} / ${product.pricingHypothesis} for ${product.targetUser}.`,
      metadata: {
        stage: product.stage,
        templateId: product.templateId ?? null,
      },
    });
    return product;
  });
}

export async function updateProductDetails(
  workspaceId: string,
  productId: string,
  input: {
    name: string;
    summary: string;
    vertical: string;
    pricingHypothesis: string;
    targetUser: string;
    coreProblem: string;
    chosenMoat: Product["chosenMoat"];
    templateId?: ProductTemplateId;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const template = resolveProductTemplateOrThrow(input.templateId);
    const updatedAt = now();
    assertValidChosenMoat(input.chosenMoat);
    const nextFields = {
      name: input.name.trim(),
      summary: input.summary.trim(),
      vertical: input.vertical.trim(),
      pricingHypothesis: input.pricingHypothesis.trim(),
      targetUser: input.targetUser.trim(),
      coreProblem: input.coreProblem.trim(),
    } satisfies Pick<
      Product,
      "name" | "summary" | "vertical" | "pricingHypothesis" | "targetUser" | "coreProblem"
    >;

    assertRequiredProductFields(nextFields);

    product.name = nextFields.name;
    product.summary = nextFields.summary;
    product.vertical = nextFields.vertical;
    product.pricingHypothesis = nextFields.pricingHypothesis;
    product.targetUser = nextFields.targetUser;
    product.coreProblem = nextFields.coreProblem;
    product.chosenMoat = input.chosenMoat;
    product.templateId = template?.id;
    product.templateVersion = template ? PRODUCT_TEMPLATE_VERSION : undefined;
    product.updatedAt = updatedAt;

    appendProductActivityEvent(database, product, {
      category: "product",
      kind: "product_updated",
      source: "founder",
      title: `Updated ${product.name} settings`,
      detail: `${product.vertical} / ${product.pricingHypothesis} for ${product.targetUser}.`,
      metadata: {
        templateId: product.templateId ?? null,
        stage: product.stage,
      },
    });

    return product;
  });
}

export async function archiveProduct(
  workspaceId: string,
  productId: string,
  input?: {
    reason?: string;
  },
) {
  return updateDatabase((database) => {
    const product = ensureProductOwnership(database.products, workspaceId, productId);

    if (isProductArchived(product)) {
      throw new Error("Product is already archived.");
    }

    const archivedAt = now();
    const archivedReason = input?.reason?.trim() || undefined;
    product.archivedAt = archivedAt;
    product.archivedReason = archivedReason;
    product.updatedAt = archivedAt;

    appendProductActivityEvent(database, product, {
      category: "product",
      kind: "product_archived",
      source: "founder",
      title: `Archived ${product.name}`,
      detail: archivedReason
        ? `Moved this lane to the archived portfolio: ${archivedReason}.`
        : "Moved this lane to the archived portfolio.",
      metadata: {
        archivedReason: archivedReason ?? null,
      },
    });

    return product;
  });
}

export async function restoreProduct(workspaceId: string, productId: string) {
  return updateDatabase((database) => {
    const product = ensureProductOwnership(database.products, workspaceId, productId);

    if (!isProductArchived(product)) {
      throw new Error("Product is already active.");
    }

    product.archivedAt = undefined;
    product.archivedReason = undefined;
    product.updatedAt = now();

    appendProductActivityEvent(database, product, {
      category: "product",
      kind: "product_restored",
      source: "founder",
      title: `Restored ${product.name}`,
      detail: "Returned this lane to the active portfolio.",
      metadata: {
        stage: product.stage,
      },
    });

    return product;
  });
}

export async function cloneProduct(workspaceId: string, productId: string) {
  return updateDatabase((database) => {
    const sourceProduct = ensureProductOwnership(database.products, workspaceId, productId);
    const clonedAt = now();
    const clonedProduct = {
      ...sourceProduct,
      id: makeId(),
      name: `Copy of ${sourceProduct.name}`,
      stage: "validate" as ProductStage,
      criticalBlockers: [],
      launchChecklist: [...sourceProduct.launchChecklist],
      metrics: {
        monthlyRecurringRevenue: 0,
        monthlyChurnRate: 0,
        supportHoursPerWeek: 0,
        activeP1Bugs: 0,
      },
      archivedAt: undefined,
      archivedReason: undefined,
      clonedFromProductId: sourceProduct.id,
      createdAt: clonedAt,
      updatedAt: clonedAt,
    } satisfies Product;

    database.products.push(clonedProduct);

    const sourceOpportunities = database.opportunities.filter(
      (entry) => entry.productId === sourceProduct.id,
    );
    for (const opportunity of sourceOpportunities) {
      database.opportunities.push({
        ...opportunity,
        id: makeId(),
        productId: clonedProduct.id,
        createdAt: clonedAt,
        updatedAt: clonedAt,
        score: { ...opportunity.score },
      });
    }

    const sourceSpec = database.specs.find((entry) => entry.productId === sourceProduct.id);
    if (sourceSpec) {
      database.specs.push({
        ...sourceSpec,
        productId: clonedProduct.id,
        updatedAt: clonedAt,
      });
    }

    const sourceBuildSheet = database.buildSheets.find(
      (entry) => entry.productId === sourceProduct.id,
    );
    if (sourceBuildSheet) {
      database.buildSheets.push({
        ...sourceBuildSheet,
        productId: clonedProduct.id,
        blockers: [],
        targetReleaseAt: undefined,
        updatedAt: clonedAt,
      });
    }

    appendProductActivityEvent(database, clonedProduct, {
      category: "product",
      kind: "product_cloned",
      source: "founder",
      title: `Cloned from ${sourceProduct.name}`,
      detail:
        "Created a strategic baseline copy with opportunities, spec, and launch checklist preserved while live operating state was reset.",
      metadata: {
        sourceProductId: sourceProduct.id,
        opportunityCount: sourceOpportunities.length,
        copiedSpec: Boolean(sourceSpec),
        copiedBuildSheet: Boolean(sourceBuildSheet),
      },
    });

    return clonedProduct;
  });
}

export async function getProductBundle(workspaceId: string, productId: string) {
  const database = await readDatabase();
  const product = ensureProductOwnership(database.products, workspaceId, productId);
  const opportunities = database.opportunities
    .filter((entry) => entry.productId === productId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const leads = database.validationLeads
    .filter((entry) => entry.productId === productId)
    .sort((left, right) =>
      (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt),
    );
  const touchpoints = database.validationTouchpoints
    .filter((entry) => entry.productId === productId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const sessions = database.validationSessions
    .filter((entry) => entry.productId === productId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const tasks = database.validationTasks
    .filter((entry) => entry.productId === productId)
    .map((task) => promoteValidationTaskState({ ...task }))
    .sort((left, right) =>
      (left.dueAt ?? left.updatedAt).localeCompare(right.dueAt ?? right.updatedAt),
    );
  const spec = database.specs.find((entry) => entry.productId === productId) ?? null;
  const buildSheet = getBuildSheet(database.buildSheets, productId, product.updatedAt);
  const integrations = database.integrations.filter((entry) => entry.productId === productId);
  const deploymentSnapshots = database.deploymentSnapshots.filter(
    (entry) => entry.productId === productId,
  );
  const revenueSnapshots = database.revenueSnapshots.filter((entry) => entry.productId === productId);
  const emailSequence = database.emailSequences.find((entry) => entry.productId === productId) ?? null;
  const launchGate =
    database.launchGateResults
      .filter((entry) => entry.productId === productId)
      .sort((left, right) => right.evaluatedAt.localeCompare(left.evaluatedAt))[0] ?? null;
  const opsHealth = summarizeProductOpsHealth({
    integrations,
    deploymentSnapshots,
    revenueSnapshots,
    emailSequence,
  });
  const recentActivity = enrichActivityFeed(
    listProductActivityEvents(database.activityEvents, workspaceId, productId, 15),
    [product],
  );
  const template = getProductTemplate(product.templateId);
  const buildReadiness = evaluateBuildReadiness({
    product,
    spec,
    buildSheet,
    integrations,
    deploymentSnapshots,
  });

  return {
    product,
    isArchived: isProductArchived(product),
    workflowLocked: isProductArchived(product),
    template,
    availableTemplates: listProductTemplates(),
    opportunities,
    leads,
    touchpoints,
    sessions,
    tasks,
    crmSummary: buildValidationCrmSummary(sessions, tasks),
    taskBuckets: computeValidationTaskBuckets(tasks),
    spec,
    buildSheet,
    buildReadiness,
    integrations,
    deploymentSnapshots,
    revenueSnapshots,
    emailSequence,
    launchGate,
    opsHealth,
    recentActivity,
    validationDecision: computeValidationDecision(productId, leads),
    outreachSummary: computeValidationOutreachSummary(leads, touchpoints),
    globalFeatureFlags: database.globalFeatureFlags,
  };
}

export async function getWorkspaceCrmBundle(workspaceId: string) {
  const database = await readDatabase();
  const workspace = database.workspaces.find((entry) => entry.id === workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const user = database.users.find((entry) => entry.workspaceId === workspaceId);
  const products = database.products
    .filter((entry) => entry.workspaceId === workspaceId && !isProductArchived(entry))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const productIds = new Set(products.map((product) => product.id));
  const leads = database.validationLeads.filter((entry) => productIds.has(entry.productId));
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const sessions = database.validationSessions
    .filter((entry) => productIds.has(entry.productId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const tasks = database.validationTasks
    .filter((entry) => productIds.has(entry.productId))
    .map((task) => promoteValidationTaskState({ ...task }))
    .sort((left, right) =>
      (left.dueAt ?? left.updatedAt).localeCompare(right.dueAt ?? right.updatedAt),
    );
  const productMap = new Map(products.map((product) => [product.id, product]));
  const crmSummary = buildValidationCrmSummary(sessions, tasks);

  return {
    workspace,
    founder: user ?? null,
    products,
    leads,
    sessions,
    tasks,
    taskBuckets: computeValidationTaskBuckets(tasks),
    recentSessions: sessions.slice(0, 10),
    pendingSessions: sessions.filter((entry) => entry.analysisStatus !== "completed"),
    crmSummary,
    topObjections: crmSummary.topObjections,
    topPainPoints: crmSummary.topPainPoints,
    leadMap,
    productMap,
  };
}

export async function saveBuildSheet(
  workspaceId: string,
  productId: string,
  input: {
    releaseGoal: string;
    shipChecklistText: string;
    blockersText: string;
    notes: string;
    targetReleaseOn?: string;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const updatedAt = now();
    const buildSheet = upsertBuildSheet(database.buildSheets, productId, {
      releaseGoal: input.releaseGoal.trim(),
      shipChecklist: splitLines(input.shipChecklistText),
      blockers: splitLines(input.blockersText),
      notes: input.notes.trim(),
      targetReleaseAt: normalizeDateInput(input.targetReleaseOn),
      updatedAt,
    });

    product.updatedAt = updatedAt;
    appendProductActivityEvent(database, product, {
      category: "build",
      kind: "build_sheet_saved",
      source: "founder",
      title: "Saved build release controls",
      detail: `Tracked ${buildSheet.shipChecklist.length} ship steps and ${buildSheet.blockers.length} blockers.`,
      metadata: {
        targetReleaseAt: buildSheet.targetReleaseAt ?? null,
      },
    });

    return buildSheet;
  });
}

export async function applyProductTemplate(
  workspaceId: string,
  productId: string,
  templateId: ProductTemplateId,
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const template = resolveProductTemplateOrThrow(templateId);

    if (!template) {
      throw new Error("Invalid product template.");
    }

    applyTemplateBackfillToProduct(product, template);

    const existingSpec = database.specs.find((entry) => entry.productId === productId);
    const nextSpec = applyTemplateBackfillToSpec(existingSpec, product, template);

    if (!existingSpec) {
      database.specs.push(nextSpec);
    }

    product.updatedAt = now();
    appendProductActivityEvent(database, product, {
      category: "product",
      kind: "product_template_applied",
      source: "founder",
      title: `Applied ${template.label} template`,
      detail: "Backfilled empty product and spec fields without overwriting existing work.",
      metadata: {
        templateId: template.id,
        templateVersion: template.version,
      },
    });

    return {
      product,
      template,
      spec: nextSpec,
    };
  });
}

export async function addOpportunity(
  workspaceId: string,
  productId: string,
  input: {
    title: string;
    audience: string;
    painStatement: string;
    complaintFrequency: number;
    painSeverity: number;
    willingnessToPay: number;
    competitionCount: number;
    pricingPowerEstimate: string;
    moatType: Opportunity["moatType"];
    notes: string;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const score = scoreOpportunity(input);

    const opportunity = {
      id: makeId(),
      productId,
      title: input.title.trim(),
      audience: input.audience.trim(),
      painStatement: input.painStatement.trim(),
      complaintFrequency: input.complaintFrequency,
      painSeverity: input.painSeverity,
      willingnessToPay: input.willingnessToPay,
      competitionCount: input.competitionCount,
      pricingPowerEstimate: input.pricingPowerEstimate.trim(),
      moatType: input.moatType,
      notes: input.notes.trim(),
      createdAt: now(),
      updatedAt: now(),
      score,
    };

    database.opportunities.push(opportunity);
    product.updatedAt = now();
    appendProductActivityEvent(database, product, {
      category: "research",
      kind: "opportunity_created",
      source: "founder",
      title: `Added opportunity ${opportunity.title}`,
      detail: `${opportunity.audience} / score ${opportunity.score.totalScore}/50.`,
      metadata: {
        opportunityId: opportunity.id,
      },
    });
    return opportunity;
  });
}

export async function generateOpportunityReadout(
  workspaceId: string,
  productId: string,
  opportunityId: string,
  mode: "flash" | "pro",
) {
  const database = await readDatabase();
  const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
  const opportunity = database.opportunities.find(
    (entry) => entry.id === opportunityId && entry.productId === productId,
  );

  if (!opportunity) {
    throw new Error("Opportunity not found.");
  }

  const fallback = buildOpportunityAiFallback(product, opportunity);
  const aiRecommendation = await generateText({
    model: mode,
    prompt: [
      "You are reviewing a founder's micro-SaaS opportunity.",
      `Product: ${product.name}`,
      `Target vertical: ${product.vertical}`,
      `Audience: ${opportunity.audience}`,
      `Pain statement: ${opportunity.painStatement}`,
      `Competition count: ${opportunity.competitionCount}`,
      `Pricing power estimate: ${opportunity.pricingPowerEstimate}`,
      `Moat type: ${opportunity.moatType}`,
      `Current deterministic thesis: ${opportunity.score.thesis}`,
      "Return 3 short sentences: market read, positioning advice, and the next founder validation step.",
    ].join("\n"),
    fallback,
  });

  return updateDatabase((nextDatabase) => {
    const nextProduct = ensureMutableProductOwnership(nextDatabase.products, workspaceId, productId);
    const nextOpportunity = nextDatabase.opportunities.find(
      (entry) => entry.id === opportunityId && entry.productId === productId,
    );

    if (!nextOpportunity) {
      throw new Error("Opportunity not found.");
    }

    nextOpportunity.score = {
      ...nextOpportunity.score,
      aiRecommendation,
    };
    nextOpportunity.updatedAt = now();
    nextProduct.updatedAt = nextOpportunity.updatedAt;
    appendProductActivityEvent(nextDatabase, nextProduct, {
      category: "research",
      kind: "opportunity_readout_generated",
      source: "ai",
      title: `Generated AI readout for ${nextOpportunity.title}`,
      detail: "Saved AI market read, positioning advice, and the next validation step.",
      metadata: {
        opportunityId: nextOpportunity.id,
        model: mode,
      },
    });
    return nextOpportunity;
  });
}

export async function addValidationLead(
  workspaceId: string,
  productId: string,
  input: {
    name: string;
    email: string;
    company: string;
    role: string;
    channel: string;
    status: ValidationLead["status"];
    willingToPay: boolean;
    demoBooked: boolean;
    reservationPlaced: boolean;
    notes: string;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const lead = {
      id: makeId(),
      productId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      company: input.company.trim(),
      role: input.role.trim(),
      channel: input.channel.trim(),
      status: input.status,
      willingToPay: input.willingToPay,
      demoBooked: input.demoBooked,
      reservationPlaced: input.reservationPlaced,
      notes: input.notes.trim(),
      createdAt: now(),
      updatedAt: now(),
    };

    database.validationLeads.push(lead);
    product.stage = product.stage === "research" ? "validate" : product.stage;
    product.updatedAt = now();
    appendProductActivityEvent(database, product, {
      category: "validation",
      kind: "validation_lead_created",
      source: "founder",
      title: `Logged validation lead ${lead.name}`,
      detail: `${lead.role} at ${lead.company} via ${lead.channel}.`,
      metadata: {
        leadId: lead.id,
      },
    });
    return lead;
  });
}

export async function logValidationTouchpoint(
  workspaceId: string,
  productId: string,
  leadId: string,
  input: {
    type: ValidationTouchpoint["type"];
    outcome: ValidationTouchpoint["outcome"];
    summary: string;
    status: ValidationLead["status"];
    nextFollowUpOn?: string;
    willingToPay: boolean;
    demoBooked: boolean;
    reservationPlaced: boolean;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const lead = database.validationLeads.find(
      (entry) => entry.id === leadId && entry.productId === productId,
    );

    if (!lead) {
      throw new Error("Validation lead not found.");
    }

    const createdAt = now();
    const nextFollowUpAt =
      input.status === "declined" ? undefined : normalizeDateInput(input.nextFollowUpOn);
    const touchpoint = {
      id: makeId(),
      productId,
      leadId,
      type: input.type,
      outcome: input.outcome,
      summary: input.summary.trim(),
      createdAt,
      nextFollowUpAt,
    } satisfies ValidationTouchpoint;

    database.validationTouchpoints.push(touchpoint);

    lead.status = input.status;
    lead.willingToPay = lead.willingToPay || input.willingToPay;
    lead.demoBooked =
      lead.demoBooked || input.demoBooked || (input.type === "demo" && input.outcome === "booked");
    lead.reservationPlaced =
      lead.reservationPlaced ||
      input.reservationPlaced ||
      (input.type === "reservation" &&
        (input.outcome === "positive" || input.outcome === "booked"));
    lead.lastContactedAt = createdAt;
    lead.lastResponseAt = touchpointCountsAsResponse(input.outcome)
      ? createdAt
      : lead.lastResponseAt;
    lead.nextFollowUpAt = nextFollowUpAt;
    lead.updatedAt = createdAt;
    product.stage = product.stage === "research" ? "validate" : product.stage;
    product.updatedAt = createdAt;
    appendProductActivityEvent(database, product, {
      category: "validation",
      kind: "validation_touchpoint_logged",
      source: "founder",
      title: `Logged ${input.type} touchpoint for ${lead.name}`,
      detail: `Outcome: ${input.outcome.replaceAll("-", " ")}.`,
      metadata: {
        leadId,
        touchpointId: touchpoint.id,
      },
    });

    return { lead, touchpoint };
  });
}

export async function createValidationSession(
  workspaceId: string,
  productId: string,
  input: {
    leadId?: string;
    sourceMode: ValidationSession["sourceMode"];
    channel: ValidationSessionChannel;
    context: string;
    transcriptText: string;
    upload?: ValidationSession["upload"];
    aiMode?: "flash" | "pro";
  },
) {
  const transcriptText = input.transcriptText.trim();

  if (!transcriptText) {
    throw new Error("Transcript text is required.");
  }

  if (input.sourceMode === "upload" && !input.upload) {
    throw new Error("Uploaded transcript metadata is required.");
  }

  const created = await updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    ensureValidationLeadOwnership(database.validationLeads, productId, input.leadId);
    const createdAt = now();
    const session = {
      id: makeId(),
      productId,
      leadId: input.leadId,
      sourceMode: input.sourceMode,
      channel: input.channel,
      context: input.context.trim(),
      transcriptText,
      upload: input.upload,
      createdAt,
      updatedAt: createdAt,
      analysisStatus: "queued" as ValidationSessionAnalysisStatus,
      analysisAttempts: 0,
      generatedTaskIds: [],
    } satisfies ValidationSession;

    database.validationSessions.push(session);
    product.updatedAt = createdAt;
    appendProductActivityEvent(database, product, {
      category: "validation",
      kind: "validation_session_logged",
      source: "founder",
      title: `Logged ${input.channel} transcript`,
      detail: input.context.trim() || "Saved a validation transcript for CRM analysis.",
      metadata: {
        sessionId: session.id,
        leadId: input.leadId ?? null,
        sourceMode: input.sourceMode,
      },
    });
    return session;
  });

  await analyzeValidationSession(
    workspaceId,
    productId,
    created.id,
    input.aiMode ?? "flash",
  );

  const database = await readDatabase();
  const session = database.validationSessions.find((entry) => entry.id === created.id);

  if (!session) {
    throw new Error("Validation session not found.");
  }

  return session;
}

export async function analyzeValidationSession(
  workspaceId: string,
  productId: string,
  sessionId: string,
  mode: "flash" | "pro",
) {
  const snapshot = await readDatabase();
  const product = ensureMutableProductOwnership(snapshot.products, workspaceId, productId);
  const session = ensureValidationSessionOwnership(snapshot.validationSessions, productId, sessionId);

  if (!session) {
    throw new Error("Validation session not found.");
  }

  const lead = ensureValidationLeadOwnership(snapshot.validationLeads, productId, session.leadId);

  await updateDatabase((database) => {
    const nextSession = ensureValidationSessionOwnership(database.validationSessions, productId, sessionId);

    if (!nextSession) {
      throw new Error("Validation session not found.");
    }

    nextSession.analysisStatus = "processing";
    nextSession.analysisAttempts += 1;
    nextSession.updatedAt = now();
    nextSession.lastAnalysisError = undefined;
    nextSession.nextAnalysisAttemptAt = undefined;
    return nextSession;
  });

  try {
    const analysis = await analyzeValidationSessionRecord({
      product,
      lead,
      session,
      mode,
    });

    return updateDatabase((database) => {
      const nextProduct = ensureMutableProductOwnership(database.products, workspaceId, productId);
      const nextSession = ensureValidationSessionOwnership(
        database.validationSessions,
        productId,
        sessionId,
      );

      if (!nextSession) {
        throw new Error("Validation session not found.");
      }

      const analyzedAt = now();
      nextSession.analysisStatus = "completed";
      nextSession.analysis = analysis;
      nextSession.lastAnalyzedAt = analyzedAt;
      nextSession.updatedAt = analyzedAt;
      nextSession.nextAnalysisAttemptAt = undefined;
      nextSession.lastAnalysisError = undefined;

      const createdTasks =
        nextSession.generatedTaskIds.length === 0
          ? analysis.recommendedNextActions.slice(0, 3).map((action) => {
              const task = createValidationTaskRecord({
                productId,
                leadId: nextSession.leadId,
                sessionId: nextSession.id,
                type: inferTaskTypeFromAction(action),
                title: action,
                notes:
                  nextSession.context.trim() ||
                  "Suggested from validation session analysis.",
                source: "session-analysis",
                dueAt: now(),
              });

              database.validationTasks.push(task);
              nextSession.generatedTaskIds.push(task.id);
              appendProductActivityEvent(database, nextProduct, {
                category: "validation",
                kind: "validation_task_created",
                source: "ai",
                title: `Created CRM task: ${task.title}`,
                detail: "Suggested follow-up generated from transcript analysis.",
                metadata: {
                  taskId: task.id,
                  sessionId: nextSession.id,
                },
              });
              return task;
            })
          : [];

      nextProduct.updatedAt = analyzedAt;
      appendProductActivityEvent(database, nextProduct, {
        category: "validation",
        kind: "validation_session_analyzed",
        source: "ai",
        title: `Analyzed ${nextSession.channel} transcript`,
        detail: analysis.summary,
        metadata: {
          sessionId: nextSession.id,
          model: mode,
          createdTaskCount: createdTasks.length,
        },
      });

      return { session: nextSession, tasks: createdTasks };
    });
  } catch (error) {
    return updateDatabase((database) => {
      const nextSession = ensureValidationSessionOwnership(database.validationSessions, productId, sessionId);

      if (!nextSession) {
        throw new Error("Validation session not found.");
      }

      nextSession.analysisStatus = "failed";
      nextSession.lastAnalysisError =
        error instanceof Error ? error.message : "Transcript analysis failed.";
      nextSession.nextAnalysisAttemptAt = plusHours(
        Math.min(Math.max(nextSession.analysisAttempts, 1) * 2, 24),
      );
      nextSession.updatedAt = now();
      return nextSession;
    });
  }
}

export async function createValidationTask(
  workspaceId: string,
  productId: string,
  input: {
    leadId?: string;
    sessionId?: string;
    type: ValidationTaskType;
    title: string;
    notes: string;
    dueOn?: string;
    source?: ValidationTaskSource;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    ensureValidationLeadOwnership(database.validationLeads, productId, input.leadId);
    ensureValidationSessionOwnership(database.validationSessions, productId, input.sessionId);
    const task = createValidationTaskRecord({
      productId,
      leadId: input.leadId,
      sessionId: input.sessionId,
      type: input.type,
      title: input.title,
      notes: input.notes,
      source: input.source ?? "manual",
      dueAt: normalizeDateInput(input.dueOn) ?? now(),
    });

    database.validationTasks.push(task);
    product.updatedAt = task.updatedAt;
    appendProductActivityEvent(database, product, {
      category: "validation",
      kind: "validation_task_created",
      source: input.source === "manual" ? "founder" : "ai",
      title: `Created CRM task: ${task.title}`,
      detail: task.notes || `Scheduled a ${task.type} follow-up task.`,
      metadata: {
        taskId: task.id,
        leadId: task.leadId ?? null,
        sessionId: task.sessionId ?? null,
      },
    });
    return task;
  });
}

export async function updateValidationTaskState(
  workspaceId: string,
  taskId: string,
  input: {
    action: "complete" | "snooze" | "cancel" | "reopen";
    snoozeUntil?: string;
  },
) {
  return updateDatabase((database) => {
    const task = ensureValidationTaskOwnership(database, workspaceId, taskId);
    const product = ensureMutableProductOwnership(database.products, workspaceId, task.productId);
    const updatedAt = now();

    if (input.action === "complete") {
      task.state = "done";
      task.completedAt = updatedAt;
      task.canceledAt = undefined;
      task.snoozedUntil = undefined;
    }

    if (input.action === "snooze") {
      task.state = "snoozed";
      task.snoozedUntil = normalizeDateInput(input.snoozeUntil) ?? plusDays(1);
      task.completedAt = undefined;
      task.canceledAt = undefined;
    }

    if (input.action === "cancel") {
      task.state = "canceled";
      task.canceledAt = updatedAt;
      task.completedAt = undefined;
      task.snoozedUntil = undefined;
    }

    if (input.action === "reopen") {
      task.state = deriveValidationTaskState(task.dueAt);
      task.completedAt = undefined;
      task.canceledAt = undefined;
      task.snoozedUntil = undefined;
    }

    task.updatedAt = updatedAt;
    product.updatedAt = updatedAt;
    appendProductActivityEvent(database, product, {
      category: "validation",
      kind: "validation_task_updated",
      source: "founder",
      title: `Updated CRM task: ${task.title}`,
      detail: `Task marked ${task.state.replaceAll("-", " ")}.`,
      metadata: {
        taskId: task.id,
        action: input.action,
      },
    });

    return { task, productId: product.id };
  });
}

export async function runValidationCrmJob() {
  return runValidationCrmJobWithOptions({ recordAutomationRun: true });
}

async function runValidationCrmJobWithOptions(input: { recordAutomationRun: boolean }) {
  const startedAt = now();

  try {
    const snapshot = await readDatabase();
    const activeProductIds = new Set(
      snapshot.products
        .filter((product) => !isProductArchived(product))
        .map((product) => product.id),
    );
    const dueSessions = snapshot.validationSessions.filter((session) => {
      if (!activeProductIds.has(session.productId)) {
        return false;
      }

      if (session.analysisStatus === "completed" || session.analysisStatus === "processing") {
        return false;
      }

      return (
        !session.nextAnalysisAttemptAt ||
        new Date(session.nextAnalysisAttemptAt).getTime() <= Date.now()
      );
    });

    for (const session of dueSessions) {
      const product = snapshot.products.find((entry) => entry.id === session.productId);

      if (!product) {
        continue;
      }

      await analyzeValidationSession(product.workspaceId, product.id, session.id, "flash");
    }

    let promotedTaskCount = 0;
    const digestInputs = await updateDatabase((database) => {
      const workspacesById = new Map(
        database.workspaces.map((workspace) => [workspace.id, workspace]),
      );
      const usersById = new Map(database.users.map((user) => [user.id, user]));
      const leadsById = new Map(database.validationLeads.map((lead) => [lead.id, lead]));
      const todayKey = toDayKey(now());

      for (const task of database.validationTasks) {
        if (!activeProductIds.has(task.productId)) {
          continue;
        }

        const previousState = task.state;
        const previousSnooze = task.snoozedUntil;
        promoteValidationTaskState(task);

        if (task.state !== previousState || task.snoozedUntil !== previousSnooze) {
          promotedTaskCount += 1;
        }
      }

      return database.products.flatMap((product) => {
        if (isProductArchived(product)) {
          return [];
        }

        const dueTasks = database.validationTasks.filter(
          (task) =>
            task.productId === product.id &&
            task.state === "due" &&
            toDayKey(task.lastReminderSentAt) !== todayKey,
        );

        if (dueTasks.length === 0) {
          return [];
        }

        const connection = database.integrations.find(
          (entry) => entry.productId === product.id && entry.provider === "resend",
        );
        const sequence = database.emailSequences.find((entry) => entry.productId === product.id);
        const workspace = workspacesById.get(product.workspaceId);
        const founder = workspace ? usersById.get(workspace.ownerUserId) : undefined;

        if (!connection?.secret || !sequence || !founder?.email) {
          return [];
        }

        return [
          {
            productId: product.id,
            taskIds: dueTasks.map((task) => task.id),
            recipientEmail: founder.email,
            senderEmail: sequence.senderEmail,
            apiKey: decryptSecret(connection.secret),
            subject: `CRM digest for ${product.name}`,
            body: buildValidationTaskDigestBody(product, dueTasks, leadsById),
          },
        ];
      });
    });

    const sentDigests: Array<{ productId: string; taskIds: string[] }> = [];
    let failedDigestCount = 0;

    for (const digest of digestInputs) {
      try {
        await sendResendTestEmail(
          digest.apiKey,
          digest.senderEmail,
          digest.recipientEmail,
          digest.subject,
          digest.body,
        );
        sentDigests.push({ productId: digest.productId, taskIds: digest.taskIds });
      } catch {
        failedDigestCount += 1;
      }
    }

    if (sentDigests.length > 0) {
      await updateDatabase((database) => {
        const sentAt = now();

        for (const digest of sentDigests) {
          const product = database.products.find((entry) => entry.id === digest.productId);

          if (!product) {
            continue;
          }

          for (const taskId of digest.taskIds) {
            const task = database.validationTasks.find((entry) => entry.id === taskId);

            if (task) {
              task.lastReminderSentAt = sentAt;
              task.updatedAt = sentAt;
            }
          }

          product.updatedAt = sentAt;
          appendProductActivityEvent(database, product, {
            category: "validation",
            kind: "validation_digest_sent",
            source: "integration",
            title: `Sent CRM digest for ${product.name}`,
            detail: `Delivered a founder reminder digest for ${digest.taskIds.length} due tasks.`,
            metadata: {
              taskCount: digest.taskIds.length,
            },
          });
        }
      });
    }

    const result = {
      analyzedSessionCount: dueSessions.length,
      promotedTaskCount,
      sentDigestCount: sentDigests.length,
      failedDigestCount,
    };

    if (input.recordAutomationRun) {
      await updateDatabase((database) => {
        appendAutomationRun(database, {
          kind: "validation-crm",
          status: failedDigestCount > 0 ? "partial" : "success",
          startedAt,
          summary:
            result.analyzedSessionCount === 0 &&
            result.promotedTaskCount === 0 &&
            result.sentDigestCount === 0 &&
            result.failedDigestCount === 0
              ? "No CRM automation work was due."
              : `Analyzed ${result.analyzedSessionCount} session${result.analyzedSessionCount === 1 ? "" : "s"}, promoted ${result.promotedTaskCount} task${result.promotedTaskCount === 1 ? "" : "s"}, and sent ${result.sentDigestCount} digest${result.sentDigestCount === 1 ? "" : "s"}.`,
          metrics: result,
        });
      });
    }

    return result;
  } catch (error) {
    if (input.recordAutomationRun) {
      await updateDatabase((database) => {
        appendAutomationRun(database, {
          kind: "validation-crm",
          status: "failed",
          startedAt,
          summary: "Validation CRM automation failed before completion.",
          metrics: {},
          error: error instanceof Error ? error.message : "Automation failed.",
        });
      }).catch(() => undefined);
    }

    throw error;
  }
}

export async function saveSpecDocument(
  workspaceId: string,
  productId: string,
  input: {
    targetUser: string;
    problem: string;
    v1FeaturesText: string;
    exclusionsText: string;
    pricingHypothesis: string;
    launchCriteriaText: string;
    definitionOfDone: string;
  },
  options?: {
    source?: ActivityEventSource;
    kind?: "spec_saved" | "spec_generated";
    title?: string;
    detail?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const v1Features = splitLines(input.v1FeaturesText);
    const exclusions = splitLines(input.exclusionsText);
    const launchCriteria = splitLines(input.launchCriteriaText);
    const existing = database.specs.find((entry) => entry.productId === productId);

    const nextSpec = {
      productId,
      targetUser: input.targetUser.trim(),
      problem: input.problem.trim(),
      v1Features,
      exclusions,
      pricingHypothesis: input.pricingHypothesis.trim(),
      launchCriteria,
      definitionOfDone: input.definitionOfDone.trim(),
      updatedAt: now(),
      approvedAt: now(),
      lastGeneratedAt: existing?.lastGeneratedAt,
    };

    if (existing) {
      Object.assign(existing, nextSpec);
    } else {
      database.specs.push(nextSpec);
    }

    product.targetUser = nextSpec.targetUser;
    product.coreProblem = nextSpec.problem;
    product.pricingHypothesis = nextSpec.pricingHypothesis;
    product.stage =
      product.stage === "research" || product.stage === "validate" ? "spec" : product.stage;
    product.updatedAt = now();
    appendProductActivityEvent(database, product, {
      category: "spec",
      kind: options?.kind ?? "spec_saved",
      source: options?.source ?? "founder",
      title: options?.title ?? "Saved product spec",
      detail:
        options?.detail ??
        `Defined ${nextSpec.v1Features.length} V1 features and ${nextSpec.launchCriteria.length} launch criteria.`,
      metadata: {
        ...options?.metadata,
        v1FeatureCount: nextSpec.v1Features.length,
        launchCriteriaCount: nextSpec.launchCriteria.length,
      },
    });
    return nextSpec;
  });
}

export function getIntegration(
  integrations: IntegrationConnection[],
  provider: IntegrationProvider,
  productId: string,
) {
  return integrations.find((entry) => entry.productId === productId && entry.provider === provider) ?? null;
}

export function evaluateReadyForNextProduct(product: Product, emailSequence: EmailSequence | null) {
  return (
    product.metrics.monthlyRecurringRevenue >= 500 &&
    product.metrics.monthlyChurnRate < 8 &&
    product.metrics.supportHoursPerWeek < 3 &&
    product.metrics.activeP1Bugs === 0 &&
    Boolean(emailSequence)
  );
}

export async function generateSpecDocument(workspaceId: string, productId: string, mode: "flash" | "pro") {
  const bundle = await getProductBundle(workspaceId, productId);
  const highestOpportunity = bundle.opportunities[0];
  const templateSpec = bundle.template?.stages.spec;
  const fallbackDefinition =
    templateSpec?.definitionOfDone ??
    `Definition of done: ${bundle.product.name} lets ${bundle.product.targetUser} complete the primary workflow end to end, onboarding messages are configured, GitHub and GCP connections are live, Stripe data syncs, and the launch gate passes with no unresolved critical blockers.`;
  const definitionOfDone = await generateText({
    model: mode,
    prompt: [
      "Draft a concise micro-SaaS definition of done for this founder tool.",
      `Product: ${bundle.product.name}`,
      `Summary: ${bundle.product.summary}`,
      `Target user: ${bundle.product.targetUser}`,
      `Core problem: ${bundle.product.coreProblem}`,
      `Template: ${bundle.template?.label ?? "None"}`,
      `Best opportunity thesis: ${highestOpportunity?.score.thesis ?? "No opportunity logged yet."}`,
      "Return 3 to 5 sentences, no bullet list.",
    ].join("\n"),
    fallback: fallbackDefinition,
  });

  const v1Features = templateSpec?.v1Features ?? [
    "Opportunity scoring and validation lead tracking tied to a 3-of-10 gate.",
    "A one-page spec builder with explicit exclusions and launch criteria.",
    "Connected ops for GitHub, Cloud Run / Cloud Build, Stripe, and Resend.",
  ];
  const exclusions = templateSpec?.exclusions ?? [
    "No multi-team collaboration in beta.",
    "No public self-serve checkout during invite beta.",
    "No AWS or Azure deployment support.",
  ];
  const launchCriteria = templateSpec?.launchCriteria ?? [
    "At least 10 validation leads logged with 3 enthusiastic yes signals.",
    "All four integrations connected and successfully synced.",
    "Onboarding sequence edited and test-sent from the founder sender.",
  ];

  return saveSpecDocument(workspaceId, productId, {
    targetUser: bundle.product.targetUser,
    problem: bundle.product.coreProblem,
    v1FeaturesText: v1Features.join("\n"),
    exclusionsText: exclusions.join("\n"),
    pricingHypothesis: bundle.product.pricingHypothesis,
    launchCriteriaText: launchCriteria.join("\n"),
    definitionOfDone,
  }, {
    source: "ai",
    kind: "spec_generated",
    title: "Generated AI spec draft",
    detail: `Drafted the one-page spec with ${v1Features.length} V1 features.`,
    metadata: {
      model: mode,
    },
  });
}

export async function generateLaunchChecklist(
  workspaceId: string,
  productId: string,
  mode: "flash" | "pro",
) {
  const bundle = await getProductBundle(workspaceId, productId);
  const fallbackLines = buildLaunchChecklistFallback(bundle);
  const aiText = await generateText({
    model: mode,
    prompt: [
      "Generate a launch checklist for a founder operating a micro-SaaS invite beta.",
      `Product: ${bundle.product.name}`,
      `Summary: ${bundle.product.summary}`,
      `Stage: ${bundle.product.stage}`,
      `Validation status: ${bundle.validationDecision.summary}`,
      `Spec complete: ${isSpecComplete(bundle.spec) ? "yes" : "no"}`,
      `GitHub connected: ${getIntegration(bundle.integrations, "github", productId)?.status === "connected" ? "yes" : "no"}`,
      `GCP connected: ${getIntegration(bundle.integrations, "gcp", productId)?.status === "connected" ? "yes" : "no"}`,
      `Stripe connected: ${getIntegration(bundle.integrations, "stripe", productId)?.status === "connected" ? "yes" : "no"}`,
      `Resend connected: ${getIntegration(bundle.integrations, "resend", productId)?.status === "connected" ? "yes" : "no"}`,
      `Current MRR: ${bundle.product.metrics.monthlyRecurringRevenue}`,
      `Current churn: ${bundle.product.metrics.monthlyChurnRate}`,
      `Support hours per week: ${bundle.product.metrics.supportHoursPerWeek}`,
      `Active P1 bugs: ${bundle.product.metrics.activeP1Bugs}`,
      "Return 5 to 7 concise checklist lines, one per line, no numbering.",
    ].join("\n"),
    fallback: fallbackLines.join("\n"),
  });
  const generatedLines = cleanGeneratedLines(aiText);
  const nextChecklist = generatedLines.length >= 3 ? generatedLines : fallbackLines;

  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    product.launchChecklist = nextChecklist;
    product.updatedAt = now();
    appendProductActivityEvent(database, product, {
      category: "launch",
      kind: "launch_checklist_generated",
      source: "ai",
      title: "Generated AI launch checklist",
      detail: `Saved ${nextChecklist.length} launch checklist items.`,
      metadata: {
        model: mode,
        checklistItemCount: nextChecklist.length,
      },
    });
    return product;
  });
}

function upsertIntegrationRecord(
  integrations: IntegrationConnection[],
  input: {
    productId: string;
    provider: IntegrationProvider;
    status: ConnectionStatus;
    metadata: Record<string, unknown>;
    secret?: string;
    error?: string;
    source?: IntegrationSyncSource;
  },
) {
  const existing = integrations.find(
    (entry) => entry.productId === input.productId && entry.provider === input.provider,
  );
  const syncedAt = now();
  const existingMetadata = (existing?.metadata ?? {}) as Record<string, unknown>;
  const metadata = {
    ...existingMetadata,
    ...input.metadata,
    automationMode: INTEGRATION_AUTOMATION_MODES[input.provider],
    lastSyncSource: input.source ?? "manual",
    lastAutomationRunAt:
      input.source === "scheduled"
        ? syncedAt
        : existingMetadata.lastAutomationRunAt ?? null,
    lastWebhookAt:
      input.source === "webhook"
        ? syncedAt
        : existingMetadata.lastWebhookAt ?? null,
  };

  if (existing) {
    existing.status = input.status;
    existing.metadata = metadata;
    existing.secret = input.secret ? encryptSecret(input.secret) : existing.secret;
    existing.lastError = input.error;
    existing.lastSyncAt = syncedAt;
    existing.connectedAt =
      input.status === "connected" ? existing.connectedAt ?? syncedAt : existing.connectedAt;
    return existing;
  }

  const record = {
    id: makeId(),
    productId: input.productId,
    provider: input.provider,
    status: input.status,
    connectedAt: input.status === "connected" ? syncedAt : undefined,
    lastSyncAt: syncedAt,
    lastError: input.error,
    metadata,
    secret: input.secret ? encryptSecret(input.secret) : undefined,
  } satisfies IntegrationConnection;
  integrations.push(record);
  return record;
}

function upsertSnapshot(
  snapshots: Array<{
    id: string;
    productId: string;
    provider: "github" | "gcp";
    environment: "beta" | "staging" | "production";
    data: Record<string, unknown>;
    updatedAt: string;
  }>,
  input: {
    productId: string;
    provider: "github" | "gcp";
    data: Record<string, unknown>;
  },
) {
  const existing = snapshots.find(
    (entry) => entry.productId === input.productId && entry.provider === input.provider,
  );

  if (existing) {
    existing.data = input.data;
    existing.updatedAt = now();
    return existing;
  }

  const snapshot = {
    id: makeId(),
    productId: input.productId,
    provider: input.provider,
    environment: "beta" as const,
    data: input.data,
    updatedAt: now(),
  };
  snapshots.push(snapshot);
  return snapshot;
}

function appendIntegrationActivity(
  database: DatabaseShape,
  product: Product,
  input: {
    provider: IntegrationProvider;
    kind: "integration_connected" | "integration_refreshed";
    detail: string;
    metadata?: Record<string, unknown>;
  },
) {
  appendProductActivityEvent(database, product, {
    category: "ops",
    kind: input.kind,
    source: "integration",
    title: `${input.kind === "integration_connected" ? "Connected" : "Refreshed"} ${INTEGRATION_LABELS[input.provider]}`,
    detail: input.detail,
    metadata: {
      provider: input.provider,
      ...(input.metadata ?? {}),
    },
  });
}

function applyGithubSync(
  database: DatabaseShape,
  product: Product,
  sync: Awaited<ReturnType<typeof syncGithubConnection>>,
  eventKind: "integration_connected" | "integration_refreshed",
  detail: string,
  source: IntegrationSyncSource = "manual",
) {
  const connection = upsertIntegrationRecord(database.integrations, {
    productId: product.id,
    provider: "github",
    status: "connected",
    metadata: sync.metadata,
    secret: sync.secret,
    source,
  });

  upsertSnapshot(database.deploymentSnapshots, {
    productId: product.id,
    provider: "github",
    data: sync.snapshot,
  });

  product.updatedAt = now();
  appendIntegrationActivity(database, product, {
    provider: "github",
    kind: eventKind,
    detail,
    metadata: {
      repo: sync.metadata.repoFullName ?? null,
    },
  });

  return connection;
}

function applyGcpSync(
  database: DatabaseShape,
  product: Product,
  sync: Awaited<ReturnType<typeof syncGcpConnection>>,
  eventKind: "integration_connected" | "integration_refreshed",
  detail: string,
  source: IntegrationSyncSource = "manual",
) {
  const connection = upsertIntegrationRecord(database.integrations, {
    productId: product.id,
    provider: "gcp",
    status: "connected",
    metadata: sync.metadata,
    secret: sync.secret,
    source,
  });

  upsertSnapshot(database.deploymentSnapshots, {
    productId: product.id,
    provider: "gcp",
    data: sync.snapshot,
  });

  product.updatedAt = now();
  appendIntegrationActivity(database, product, {
    provider: "gcp",
    kind: eventKind,
    detail,
    metadata: {
      serviceName: sync.metadata.serviceName ?? null,
      region: sync.metadata.region ?? null,
    },
  });

  return connection;
}

function applyStripeSync(
  database: DatabaseShape,
  product: Product,
  sync: Awaited<ReturnType<typeof syncStripeConnection>>,
  eventKind: "integration_connected" | "integration_refreshed",
  detail: string,
  source: IntegrationSyncSource = "manual",
) {
  const connection = upsertIntegrationRecord(database.integrations, {
    productId: product.id,
    provider: "stripe",
    status: "connected",
    metadata: sync.metadata,
    secret: sync.secret,
    source,
  });

  const existing = database.revenueSnapshots.find((entry) => entry.productId === product.id);
  const nextSnapshot = {
    id: existing?.id ?? makeId(),
    productId: product.id,
    currency: sync.snapshot.currency,
    activeSubscriptions: sync.snapshot.activeSubscriptions,
    monthlyRecurringRevenue: sync.snapshot.monthlyRecurringRevenue,
    annualRecurringRevenue: sync.snapshot.annualRecurringRevenue,
    productCount: sync.snapshot.productCount,
    syncedAt: now(),
  } satisfies RevenueSnapshot;

  if (existing) {
    Object.assign(existing, nextSnapshot);
  } else {
    database.revenueSnapshots.push(nextSnapshot);
  }

  product.metrics.monthlyRecurringRevenue = sync.snapshot.monthlyRecurringRevenue;
  product.updatedAt = now();
  appendIntegrationActivity(database, product, {
    provider: "stripe",
    kind: eventKind,
    detail,
    metadata: {
      activeSubscriptions: sync.snapshot.activeSubscriptions,
    },
  });

  return connection;
}

export async function connectGithub(
  workspaceId: string,
  productId: string,
  input: { owner: string; repo: string; installationId?: string; personalAccessToken?: string },
  source: IntegrationSyncSource = "manual",
) {
  const sync = await syncGithubConnection(input);

  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const connection = applyGithubSync(
      database,
      product,
      sync,
      "integration_connected",
      `Synced ${String(sync.metadata.repoFullName ?? `${input.owner}/${input.repo}`)}.`,
      source,
    );
    product.stage = product.stage === "spec" ? "build" : product.stage;
    return connection;
  });
}

export async function connectGcp(
  workspaceId: string,
  productId: string,
  input: {
    projectId: string;
    region: string;
    serviceName: string;
    buildRegion?: string;
    serviceAccountJson: string;
  },
  source: IntegrationSyncSource = "manual",
) {
  const sync = await syncGcpConnection(input);

  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const connection = applyGcpSync(
      database,
      product,
      sync,
      "integration_connected",
      `Synced Cloud Run service ${input.serviceName} in ${input.region}.`,
      source,
    );
    product.stage = product.stage === "build" ? "launch" : product.stage;
    return connection;
  });
}

export async function connectStripe(
  workspaceId: string,
  productId: string,
  input: { secretKey: string },
  source: IntegrationSyncSource = "manual",
) {
  const sync = await syncStripeConnection(input);

  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    return applyStripeSync(
      database,
      product,
      sync,
      "integration_connected",
      `Captured ${sync.snapshot.activeSubscriptions} active subscriptions and ${sync.snapshot.monthlyRecurringRevenue.toFixed(0)} MRR.`,
      source,
    );
  });
}

async function generateOnboardingBodies(product: Product, mode: "flash" | "pro") {
  const prompt = [
    "Generate concise onboarding email copy for a micro-SaaS founder product.",
    `Product: ${product.name}`,
    `Summary: ${product.summary}`,
    `Target user: ${product.targetUser}`,
    "Provide short practical copy for Day 0, Day 1, Day 3, Day 7, and Day 14 in one response.",
  ].join("\n");

  const fallback = [
    `Day 0: Welcome to ${product.name}. Start by completing the one workflow that proves the product fits your process.`,
    "Day 1: Return to the core task and close the first loop end to end.",
    "Day 3: Here is what a strong founder workflow looks like once the product is configured.",
    "Day 7: If the workflow is proving value, move up to the Pro lane for unlimited usage and integrations.",
    "Day 14: Reply with the single blocker that is still slowing you down.",
  ].join("\n");

  const text = await generateText({ prompt, model: mode, fallback });
  const lines = text.split(/\r?\n/).filter(Boolean);

  return DEFAULT_EMAIL_SEQUENCE.map((item, index) => ({
    ...item,
    body:
      lines[index]?.replace(/^Day \d+:\s*/i, "").trim() ??
      fallback.split(/\r?\n/)[index].replace(/^Day \d+:\s*/i, ""),
  }));
}

export async function connectResend(
  workspaceId: string,
  productId: string,
  input: { apiKey: string; senderEmail: string; aiMode?: "flash" | "pro" },
  source: IntegrationSyncSource = "manual",
) {
  const sync = await syncResendConnection(input);
  const snapshot = await readDatabase();
  const product = ensureMutableProductOwnership(snapshot.products, workspaceId, productId);
  const items = await generateOnboardingBodies(product, input.aiMode ?? "flash");

  return updateDatabase((database) => {
    const mutableProduct = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const connection = upsertIntegrationRecord(database.integrations, {
      productId,
      provider: "resend",
      status: "connected",
      metadata: sync.metadata,
      secret: sync.secret,
      source,
    });
    const existing = database.emailSequences.find((entry) => entry.productId === productId);
    const nextSequence = {
      id: existing?.id ?? makeId(),
      productId,
      senderEmail: input.senderEmail.trim(),
      status: "connected" as ConnectionStatus,
      items,
      updatedAt: now(),
      lastTestSentAt: existing?.lastTestSentAt,
    };

    if (existing) {
      Object.assign(existing, nextSequence);
    } else {
      database.emailSequences.push(nextSequence);
    }

    mutableProduct.updatedAt = now();
    appendIntegrationActivity(database, mutableProduct, {
      provider: "resend",
      kind: "integration_connected",
      detail: `Validated ${input.senderEmail.trim()} and generated the onboarding sequence.`,
      metadata: {
        senderEmail: input.senderEmail.trim(),
      },
    });
    return connection;
  });
}

export async function refreshGithubConnection(
  workspaceId: string,
  productId: string,
  source: IntegrationSyncSource = "manual",
) {
  const database = await readDatabase();
  ensureMutableProductOwnership(database.products, workspaceId, productId);
  const connection = getIntegration(database.integrations, "github", productId);

  if (!connection) {
    throw new Error("GitHub is not connected.");
  }

  const owner = String(connection.metadata.owner ?? "").trim();
  const repo = String(connection.metadata.repo ?? "").trim();

  if (!owner || !repo) {
    throw new Error("GitHub repository coordinates are missing from the saved connection.");
  }

  const sync = await syncGithubConnection({
    owner,
    repo,
    installationId: String(connection.metadata.installationId ?? "").trim() || undefined,
    personalAccessToken: connection.secret ? decryptSecret(connection.secret) : undefined,
  });

  return updateDatabase((nextDatabase) => {
    const product = ensureMutableProductOwnership(nextDatabase.products, workspaceId, productId);
    return applyGithubSync(
      nextDatabase,
      product,
      sync,
      "integration_refreshed",
      `Refreshed repository snapshot for ${String(sync.metadata.repoFullName ?? `${owner}/${repo}`)}.`,
      source,
    );
  });
}

export async function refreshGcpConnection(
  workspaceId: string,
  productId: string,
  source: IntegrationSyncSource = "manual",
) {
  const database = await readDatabase();
  ensureMutableProductOwnership(database.products, workspaceId, productId);
  const connection = getIntegration(database.integrations, "gcp", productId);

  if (!connection?.secret) {
    throw new Error("Google Cloud is not connected.");
  }

  const projectId = String(connection.metadata.projectId ?? "").trim();
  const region = String(connection.metadata.region ?? "").trim();
  const serviceName = String(connection.metadata.serviceName ?? "").trim();
  const buildRegion = String(connection.metadata.buildRegion ?? "").trim() || undefined;

  if (!projectId || !region || !serviceName) {
    throw new Error("Saved Google Cloud connection metadata is incomplete.");
  }

  const sync = await syncGcpConnection({
    projectId,
    region,
    serviceName,
    buildRegion,
    serviceAccountJson: decryptSecret(connection.secret),
  });

  return updateDatabase((nextDatabase) => {
    const product = ensureMutableProductOwnership(nextDatabase.products, workspaceId, productId);
    return applyGcpSync(
      nextDatabase,
      product,
      sync,
      "integration_refreshed",
      `Refreshed deployment state for ${serviceName} in ${region}.`,
      source,
    );
  });
}

export async function refreshStripeConnection(
  workspaceId: string,
  productId: string,
  source: IntegrationSyncSource = "manual",
) {
  const database = await readDatabase();
  ensureMutableProductOwnership(database.products, workspaceId, productId);
  const connection = getIntegration(database.integrations, "stripe", productId);

  if (!connection?.secret) {
    throw new Error("Stripe is not connected.");
  }

  const sync = await syncStripeConnection({
    secretKey: decryptSecret(connection.secret),
  });

  return updateDatabase((nextDatabase) => {
    const product = ensureMutableProductOwnership(nextDatabase.products, workspaceId, productId);
    return applyStripeSync(
      nextDatabase,
      product,
      sync,
      "integration_refreshed",
      `Refreshed Stripe billing snapshot at ${sync.snapshot.monthlyRecurringRevenue.toFixed(0)} MRR.`,
      source,
    );
  });
}

export async function refreshResendConnection(
  workspaceId: string,
  productId: string,
  source: IntegrationSyncSource = "manual",
) {
  const database = await readDatabase();
  ensureMutableProductOwnership(database.products, workspaceId, productId);
  const connection = getIntegration(database.integrations, "resend", productId);
  const sequence = database.emailSequences.find((entry) => entry.productId === productId);
  const senderEmail =
    sequence?.senderEmail ?? String(connection?.metadata.senderEmail ?? "").trim();

  if (!connection?.secret || !senderEmail) {
    throw new Error("Resend is not connected.");
  }

  const sync = await syncResendConnection({
    apiKey: decryptSecret(connection.secret),
    senderEmail,
  });

  return updateDatabase((nextDatabase) => {
    const product = ensureMutableProductOwnership(nextDatabase.products, workspaceId, productId);
    const nextConnection = upsertIntegrationRecord(nextDatabase.integrations, {
      productId,
      provider: "resend",
      status: "connected",
      metadata: sync.metadata,
      secret: sync.secret,
      source,
    });

    product.updatedAt = now();
    appendIntegrationActivity(nextDatabase, product, {
      provider: "resend",
      kind: "integration_refreshed",
      detail: `Refreshed sender-domain status for ${senderEmail}.`,
      metadata: {
        senderEmail,
      },
    });

    return nextConnection;
  });
}

function isIntegrationRefreshDue(connection: IntegrationConnection) {
  if (connection.status !== "connected" && connection.status !== "error") {
    return false;
  }

  if (!connection.lastSyncAt) {
    return true;
  }

  const lastSyncedAt = Date.parse(connection.lastSyncAt);

  if (Number.isNaN(lastSyncedAt)) {
    return true;
  }

  return Date.now() - lastSyncedAt >= INTEGRATION_REFRESH_WINDOWS_MS[connection.provider];
}

function resolvePlatformSubscriptionStatus(value?: string): PlatformSubscription["status"] | null {
  if (!value) {
    return null;
  }

  if (value === "trialing") {
    return "trial";
  }

  if (value === "active") {
    return "active";
  }

  if (
    value === "canceled" ||
    value === "incomplete_expired" ||
    value === "unpaid" ||
    value === "past_due"
  ) {
    return "canceled";
  }

  return null;
}

export async function runLiveOpsAutomation() {
  const startedAt = now();

  try {
    const snapshot = await readDatabase();
    const refreshTargets = snapshot.integrations.filter((connection) => {
      if (!isIntegrationRefreshDue(connection)) {
        return false;
      }

      const product = snapshot.products.find((entry) => entry.id === connection.productId);
      return Boolean(product && !isProductArchived(product));
    });
    const productsById = new Map(snapshot.products.map((product) => [product.id, product]));
    const refreshesByProvider = {
      github: 0,
      gcp: 0,
      stripe: 0,
      resend: 0,
    };
    let refreshedIntegrationCount = 0;
    let failedIntegrationCount = 0;

    for (const connection of refreshTargets) {
      const product = productsById.get(connection.productId);

      if (!product) {
        continue;
      }

      try {
        if (connection.provider === "github") {
          await refreshGithubConnection(product.workspaceId, product.id, "scheduled");
        }

        if (connection.provider === "gcp") {
          await refreshGcpConnection(product.workspaceId, product.id, "scheduled");
        }

        if (connection.provider === "stripe") {
          await refreshStripeConnection(product.workspaceId, product.id, "scheduled");
        }

        if (connection.provider === "resend") {
          await refreshResendConnection(product.workspaceId, product.id, "scheduled");
        }

        refreshesByProvider[connection.provider] += 1;
        refreshedIntegrationCount += 1;
      } catch {
        failedIntegrationCount += 1;
      }
    }

    const crm = await runValidationCrmJobWithOptions({ recordAutomationRun: false });
    const result = {
      ...crm,
      targetedIntegrationCount: refreshTargets.length,
      refreshedIntegrationCount,
      failedIntegrationCount,
      refreshesByProvider,
    };

    await updateDatabase((database) => {
      appendAutomationRun(database, {
        kind: "live-ops",
        status:
          failedIntegrationCount > 0 || crm.failedDigestCount > 0 ? "partial" : "success",
        startedAt,
        summary:
          result.targetedIntegrationCount === 0 &&
          result.analyzedSessionCount === 0 &&
          result.promotedTaskCount === 0 &&
          result.sentDigestCount === 0
            ? "No live ops automation work was due."
            : `Refreshed ${result.refreshedIntegrationCount}/${result.targetedIntegrationCount} stale integrations and analyzed ${result.analyzedSessionCount} CRM session${result.analyzedSessionCount === 1 ? "" : "s"}.`,
        metrics: {
          targetedIntegrationCount: result.targetedIntegrationCount,
          refreshedIntegrationCount: result.refreshedIntegrationCount,
          failedIntegrationCount: result.failedIntegrationCount,
          githubRefreshCount: result.refreshesByProvider.github,
          gcpRefreshCount: result.refreshesByProvider.gcp,
          stripeRefreshCount: result.refreshesByProvider.stripe,
          resendRefreshCount: result.refreshesByProvider.resend,
          analyzedSessionCount: result.analyzedSessionCount,
          promotedTaskCount: result.promotedTaskCount,
          sentDigestCount: result.sentDigestCount,
          failedDigestCount: result.failedDigestCount,
        },
      });
    });

    return result;
  } catch (error) {
    await updateDatabase((database) => {
      appendAutomationRun(database, {
        kind: "live-ops",
        status: "failed",
        startedAt,
        summary: "Unified live ops automation failed before completion.",
        metrics: {},
        error: error instanceof Error ? error.message : "Automation failed.",
      });
    }).catch(() => undefined);

    throw error;
  }
}

export async function handleGithubWebhook(
  payload: string,
  eventName?: string | null,
) {
  if (!eventName || !["push", "pull_request", "release"].includes(eventName)) {
    return {
      received: true,
      ignored: true,
      eventName: eventName ?? null,
      matchedConnectionCount: 0,
      refreshedCount: 0,
      failedCount: 0,
    };
  }

  const parsed = JSON.parse(payload) as {
    repository?: {
      full_name?: string;
      name?: string;
      owner?: {
        login?: string;
      };
    };
  };
  const repoFullName =
    parsed.repository?.full_name ??
    [parsed.repository?.owner?.login, parsed.repository?.name].filter(Boolean).join("/");

  if (!repoFullName) {
    return {
      received: true,
      ignored: true,
      eventName,
      matchedConnectionCount: 0,
      refreshedCount: 0,
      failedCount: 0,
    };
  }

  const [owner, repo] = repoFullName.split("/");
  const snapshot = await readDatabase();
  const productsById = new Map(snapshot.products.map((product) => [product.id, product]));
  const matches = snapshot.integrations.filter((connection) => {
    if (connection.provider !== "github") {
      return false;
    }

    const savedOwner = String(connection.metadata.owner ?? "").trim().toLowerCase();
    const savedRepo = String(connection.metadata.repo ?? "").trim().toLowerCase();
    const savedFullName = String(connection.metadata.repoFullName ?? "")
      .trim()
      .toLowerCase();
    const normalizedFullName = repoFullName.toLowerCase();

    return (
      savedFullName === normalizedFullName ||
      (savedOwner === owner.toLowerCase() && savedRepo === repo.toLowerCase())
    );
  });

  let refreshedCount = 0;
  let failedCount = 0;

  for (const connection of matches) {
    const product = productsById.get(connection.productId);

    if (!product || isProductArchived(product)) {
      continue;
    }

    try {
      await refreshGithubConnection(product.workspaceId, product.id, "webhook");
      refreshedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return {
    received: true,
    eventName,
    repoFullName,
    matchedConnectionCount: matches.length,
    refreshedCount,
    failedCount,
  };
}

export async function handleStripePlatformWebhook(payload: string) {
  const parsed = JSON.parse(payload) as {
    type?: string;
    data?: {
      object?: Record<string, unknown>;
    };
  };

  return updateDatabase((database) => {
    const object = parsed.data?.object ?? {};
    const metadata =
      typeof object.metadata === "object" && object.metadata
        ? (object.metadata as Record<string, unknown>)
        : {};
    const eventType = parsed.type ?? null;
    const workspaceId =
      String(metadata.workspaceId ?? object.client_reference_id ?? "").trim() || undefined;
    const customerId = String(object.customer ?? "").trim() || undefined;
    const checkoutSessionId = String(object.id ?? "").trim() || undefined;
    const subscriptionId =
      String(object.subscription ?? "").trim() ||
      (String(object.object ?? "") === "subscription"
        ? String(object.id ?? "").trim()
        : "");
    const normalizedSubscriptionId = subscriptionId || undefined;
    const planId = String(metadata.planId ?? "").trim() || undefined;
    const deliberateCheckoutCompletion =
      eventType === "checkout.session.completed" &&
      String(object.mode ?? "").trim() === "subscription";
    const nextStatus = deliberateCheckoutCompletion
      ? ("active" as const)
      : resolvePlatformSubscriptionStatus(
          String(object.status ?? object.subscription_status ?? ""),
        ) ?? null;

    const matches = database.platformSubscriptions.filter((subscription) => {
      if (workspaceId && subscription.workspaceId === workspaceId) {
        return true;
      }

      if (customerId && subscription.stripeCustomerId === customerId) {
        return true;
      }

      if (normalizedSubscriptionId && subscription.stripeSubscriptionId === normalizedSubscriptionId) {
        return true;
      }

      if (checkoutSessionId && subscription.stripeCheckoutSessionId === checkoutSessionId) {
        return true;
      }

      return false;
    });

    for (const subscription of matches) {
      subscription.stripeCustomerId = customerId ?? subscription.stripeCustomerId;
      subscription.stripeSubscriptionId =
        normalizedSubscriptionId ?? subscription.stripeSubscriptionId;
      subscription.stripeCheckoutSessionId =
        checkoutSessionId ?? subscription.stripeCheckoutSessionId;

      if (planId) {
        subscription.planId = planId;
      }

      if (nextStatus) {
        subscription.status =
          subscription.status === "beta" && !deliberateCheckoutCompletion
            ? "beta"
            : nextStatus;
      }

      subscription.updatedAt = now();
    }

    return {
      received: true,
      eventType,
      matchedSubscriptionCount: matches.length,
      updatedSubscriptionCount: matches.length,
    };
  });
}

export async function updateEmailSequence(
  workspaceId: string,
  productId: string,
  input: { senderEmail: string; subjects: string[]; bodies: string[] },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const existing = database.emailSequences.find((entry) => entry.productId === productId);

    if (!existing) {
      throw new Error("Connect Resend before editing the onboarding sequence.");
    }

    existing.senderEmail = input.senderEmail.trim();
    existing.items = existing.items.map((item, index) => ({
      ...item,
      subject: input.subjects[index] ?? item.subject,
      body: input.bodies[index] ?? item.body,
    }));
    existing.updatedAt = now();
    product.updatedAt = existing.updatedAt;
    appendProductActivityEvent(database, product, {
      category: "ops",
      kind: "email_sequence_updated",
      source: "founder",
      title: "Updated onboarding sequence",
      detail: `Saved ${existing.items.length} onboarding messages for ${existing.senderEmail}.`,
      metadata: {
        itemCount: existing.items.length,
      },
    });
    return existing;
  });
}

export async function sendOnboardingTestEmail(
  workspaceId: string,
  productId: string,
  input: { recipientEmail: string; itemKey: string },
) {
  const database = await readDatabase();
  ensureMutableProductOwnership(database.products, workspaceId, productId);
  const connection = database.integrations.find(
    (entry) => entry.productId === productId && entry.provider === "resend",
  );
  const sequence = database.emailSequences.find((entry) => entry.productId === productId);

  if (!connection?.secret || !sequence) {
    throw new Error("Resend is not connected.");
  }

  const item = sequence.items.find((entry) => entry.key === input.itemKey);

  if (!item) {
    throw new Error("Email sequence item not found.");
  }

  await sendResendTestEmail(
    decryptSecret(connection.secret),
    sequence.senderEmail,
    input.recipientEmail.trim(),
    item.subject,
    item.body,
  );

  return updateDatabase((nextDatabase) => {
    const product = ensureMutableProductOwnership(nextDatabase.products, workspaceId, productId);
    const existing = nextDatabase.emailSequences.find((entry) => entry.productId === productId);
    const updatedAt = now();

    if (existing) {
      existing.lastTestSentAt = updatedAt;
    }
    product.updatedAt = updatedAt;

    appendProductActivityEvent(nextDatabase, product, {
      category: "ops",
      kind: "onboarding_test_sent",
      source: "founder",
      title: `Sent onboarding test email for ${item.key}`,
      detail: `Delivered a test message to ${input.recipientEmail.trim()}.`,
      metadata: {
        itemKey: item.key,
      },
    });

    return existing;
  });
}

export async function evaluateLaunchGate(workspaceId: string, productId: string) {
  const bundle = await getProductBundle(workspaceId, productId);

  if (bundle.workflowLocked) {
    throwArchivedProductMutationError();
  }

  const github = getIntegration(bundle.integrations, "github", productId);
  const gcp = getIntegration(bundle.integrations, "gcp", productId);
  const stripe = getIntegration(bundle.integrations, "stripe", productId);
  const resend = getIntegration(bundle.integrations, "resend", productId);
  const checklist =
    bundle.product.launchChecklist.length > 0
      ? bundle.product.launchChecklist
      : buildDefaultLaunchChecklist(bundle.product);
  const checks = [
    {
      key: "validation",
      label: "Validation threshold",
      passed: bundle.validationDecision.hasMetThreshold,
      detail: bundle.validationDecision.summary,
    },
    {
      key: "spec",
      label: "Spec completeness",
      passed: isSpecComplete(bundle.spec),
      detail: isSpecComplete(bundle.spec)
        ? "One-page spec is complete and approved."
        : "Fill all required spec sections before launch.",
    },
    {
      key: "github",
      label: "GitHub connected",
      passed: github?.status === "connected",
      detail:
        github?.status === "connected"
          ? "Repository sync is live."
          : "Connect the target repository and sync recent commits / PRs.",
    },
    {
      key: "gcp",
      label: "GCP deploy connected",
      passed: gcp?.status === "connected",
      detail:
        gcp?.status === "connected"
          ? "Cloud Run and Cloud Build sync is live."
          : "Connect the Cloud Run service and Cloud Build project.",
    },
    {
      key: "stripe",
      label: "Stripe connected",
      passed: stripe?.status === "connected",
      detail:
        stripe?.status === "connected"
          ? "Billing catalog and MRR snapshot synced."
          : "Connect the restricted Stripe key before launch.",
    },
    {
      key: "resend",
      label: "Onboarding configured",
      passed: resend?.status === "connected" && Boolean(bundle.emailSequence),
      detail:
        resend?.status === "connected" && bundle.emailSequence
          ? "Resend is connected and onboarding emails exist."
          : "Connect Resend and generate the onboarding sequence.",
    },
    {
      key: "blockers",
      label: "No critical blockers",
      passed: bundle.product.criticalBlockers.length === 0 && bundle.product.metrics.activeP1Bugs === 0,
      detail:
        bundle.product.criticalBlockers.length === 0 && bundle.product.metrics.activeP1Bugs === 0
          ? "No unresolved blockers remain."
          : "Resolve active blockers and clear all P1 bugs before launch.",
    },
  ];
  const passed = checks.every((check) => check.passed);
  const readyForNextProduct = evaluateReadyForNextProduct(bundle.product, bundle.emailSequence);
  const notes = passed
    ? [
        "Launch gate passed. Beta launch is operationally ready.",
        `Next operating checklist: ${checklist.join(" ")}`,
      ]
    : checks.filter((check) => !check.passed).map((check) => check.detail);

  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    const existing = database.launchGateResults.find((entry) => entry.productId === productId);
    const nextGate = {
      id: existing?.id ?? makeId(),
      productId,
      checks,
      passed,
      readyForNextProduct,
      evaluatedAt: now(),
      notes,
    } satisfies LaunchGateResult;

    if (existing) {
      Object.assign(existing, nextGate);
    } else {
      database.launchGateResults.push(nextGate);
    }

    product.launchChecklist = checklist;
    product.stage = passed ? "stabilize" : product.stage;
    product.updatedAt = now();
    appendProductActivityEvent(database, product, {
      category: "launch",
      kind: "launch_gate_evaluated",
      source: "founder",
      title: "Evaluated launch gate",
      detail: `Passed ${checks.filter((check) => check.passed).length}/${checks.length} launch checks.`,
      metadata: {
        passed,
      },
    });
    return nextGate;
  });
}

export async function updateProductLaunchState(
  workspaceId: string,
  productId: string,
  input: {
    monthlyRecurringRevenue: number;
    monthlyChurnRate: number;
    supportHoursPerWeek: number;
    activeP1Bugs: number;
    criticalBlockersText: string;
    launchChecklistText: string;
  },
) {
  return updateDatabase((database) => {
    const product = ensureMutableProductOwnership(database.products, workspaceId, productId);
    product.metrics = {
      monthlyRecurringRevenue: input.monthlyRecurringRevenue,
      monthlyChurnRate: input.monthlyChurnRate,
      supportHoursPerWeek: input.supportHoursPerWeek,
      activeP1Bugs: input.activeP1Bugs,
    };
    product.criticalBlockers = splitLines(input.criticalBlockersText);
    product.launchChecklist = splitLines(input.launchChecklistText);
    product.updatedAt = now();
    appendProductActivityEvent(database, product, {
      category: "launch",
      kind: "launch_state_updated",
      source: "founder",
      title: "Updated launch metrics",
      detail: `Saved MRR ${input.monthlyRecurringRevenue} and churn ${input.monthlyChurnRate}%.`,
      metadata: {
        activeP1Bugs: input.activeP1Bugs,
      },
    });
    return product;
  });
}

export async function getAdminOverview() {
  const database = await readDatabase();
  const activeProducts = database.products.filter((product) => !isProductArchived(product));
  const activeProductIds = new Set(activeProducts.map((product) => product.id));
  const recentAutomationRuns = [...database.automationRuns].sort((left, right) =>
    right.finishedAt.localeCompare(left.finishedAt),
  );
  const problemRuns = recentAutomationRuns.filter((run) => run.status !== "success");
  const readiness = evaluateRuntimeReadiness({
    flags: database.globalFeatureFlags,
    plans: database.platformPlans,
  });
  const productsNeedingOpsAttention = activeProducts.filter((product) => {
    const summary = summarizeProductOpsHealth({
      integrations: database.integrations.filter((entry) => entry.productId === product.id),
      deploymentSnapshots: database.deploymentSnapshots.filter(
        (entry) => entry.productId === product.id,
      ),
      revenueSnapshots: database.revenueSnapshots.filter(
        (entry) => entry.productId === product.id,
      ),
      emailSequence:
        database.emailSequences.find((entry) => entry.productId === product.id) ?? null,
    });

    return summary.overallStatus !== "success";
  }).length;

  return {
    flags: database.globalFeatureFlags,
    readiness,
    storage: getDatabaseBackendInfo(),
    auth: getAuthModeInfo(),
    totals: {
      workspaceCount: database.workspaces.length,
      founderCount: database.users.length,
      productCount: database.products.length,
      connectedIntegrationCount: database.integrations.filter(
        (entry) => entry.status === "connected",
      ).length,
    },
    automation: {
      internalKeyConfigured: Boolean(process.env.INTERNAL_AUTOMATION_KEY?.trim()),
      crmSummary: buildValidationCrmSummary(
        database.validationSessions.filter((entry) => activeProductIds.has(entry.productId)),
        database.validationTasks.filter((entry) => activeProductIds.has(entry.productId)),
      ),
      productsNeedingOpsAttention,
      attentionRunCount: problemRuns.length,
      latestProblemRun: problemRuns[0] ?? null,
      latestValidationCrmRun:
        recentAutomationRuns.find((run) => run.kind === "validation-crm") ?? null,
      latestLiveOpsRun: recentAutomationRuns.find((run) => run.kind === "live-ops") ?? null,
      recentRuns: recentAutomationRuns.slice(0, 8),
    },
    platformPlans: sortPlatformPlansForAdmin(database.platformPlans),
    invites: database.invites.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    signupIntents: database.signupIntents.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ),
    waitlist: database.waitlistRequests.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ),
  };
}

export async function updateGlobalFeatureFlags(input: {
  publicSignupEnabled: boolean;
  selfServeProvisioningEnabled: boolean;
  checkoutEnabled: boolean;
  platformBillingEnabled: boolean;
  proAiEnabled: boolean;
}) {
  return updateDatabase((database) => {
    const nextFlags = {
      ...database.globalFeatureFlags,
      publicSignupEnabled: input.publicSignupEnabled,
      selfServeProvisioningEnabled: input.selfServeProvisioningEnabled,
      checkoutEnabled: input.checkoutEnabled,
      platformBillingEnabled: input.platformBillingEnabled,
      proAiEnabled: input.proAiEnabled,
    };

    assertFeatureFlagReadiness({
      nextFlags,
      plans: database.platformPlans,
    });

    database.globalFeatureFlags = nextFlags;
    return database.globalFeatureFlags;
  });
}

export async function savePlatformPlan(input: {
  existingPlanId?: string;
  id: string;
  name: string;
  hidden: boolean;
  monthlyPrice: number;
  annualPrice: number;
  featuresText: string;
}) {
  return updateDatabase((database) => {
    const normalized = normalizePlatformPlanInput(input);
    const existingPlanId = input.existingPlanId?.trim();
    const nextPlans = [...database.platformPlans];
    const hasStripePriceMapConfig = Boolean(process.env.STRIPE_PLATFORM_PRICE_MAP_JSON?.trim());
    const stripePriceMap = getStripePriceMap();

    if (existingPlanId) {
      const existingIndex = nextPlans.findIndex((plan) => plan.id === existingPlanId);

      if (existingIndex === -1) {
        throw new Error("Platform plan not found.");
      }

      if (normalized.id !== existingPlanId) {
        throw new Error("Existing plan IDs cannot be changed. Create a new plan instead.");
      }

      nextPlans[existingIndex] = normalized;
    } else {
      if (nextPlans.some((plan) => plan.id === normalized.id)) {
        throw new Error("A platform plan with this ID already exists.");
      }

      nextPlans.push(normalized);
    }

    if (hasStripePriceMapConfig && !stripePriceMap.configured) {
      throw new Error(stripePriceMap.detail);
    }

    if (stripePriceMap.configured) {
      const unmatchedPlanIds = nextPlans
        .filter((plan) => plan.id !== BETA_PLATFORM_PLAN_ID && !stripePriceMap.map[plan.id])
        .map((plan) => plan.id);

      if (unmatchedPlanIds.length > 0) {
        throw new Error(
          `Platform plan IDs must match STRIPE_PLATFORM_PRICE_MAP_JSON keys. Missing price-map entries for: ${unmatchedPlanIds.join(", ")}.`,
        );
      }
    }

    assertFeatureFlagReadiness({
      nextFlags: database.globalFeatureFlags,
      plans: nextPlans,
    });

    database.platformPlans = nextPlans;
    return normalized;
  });
}

export async function deletePlatformPlan(planId: string) {
  return updateDatabase((database) => {
    const normalizedPlanId = planId.trim();

    if (!normalizedPlanId) {
      throw new Error("Plan ID is required.");
    }

    if (normalizedPlanId === BETA_PLATFORM_PLAN_ID) {
      throw new Error("The invite-beta seed plan cannot be deleted.");
    }

    if (database.signupIntents.some((intent) => intent.planId === normalizedPlanId)) {
      throw new Error("This platform plan is still referenced by signup intents.");
    }

    if (database.platformSubscriptions.some((subscription) => subscription.planId === normalizedPlanId)) {
      throw new Error("This platform plan is still referenced by workspace subscriptions.");
    }

    const nextPlans = database.platformPlans.filter((plan) => plan.id !== normalizedPlanId);

    if (nextPlans.length === database.platformPlans.length) {
      throw new Error("Platform plan not found.");
    }

    assertFeatureFlagReadiness({
      nextFlags: database.globalFeatureFlags,
      plans: nextPlans,
    });

    database.platformPlans = nextPlans;
    return normalizedPlanId;
  });
}

export function joinLines(values: string[]) {
  return values.join("\n");
}

export function getStageIndex(stage: ProductStage) {
  return PRODUCT_STAGES.indexOf(stage);
}
