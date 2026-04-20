import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_FEATURE_FLAGS } from "@/lib/constants";
import { encryptSecret } from "@/lib/server/crypto";
import type {
  DatabaseShape,
  EmailSequence,
  IntegrationConnection,
  Product,
  SpecDocument,
  ValidationLead,
} from "@/lib/types";

const {
  createStripePlatformCheckoutSessionMock,
  generateTextMock,
  readDatabaseMock,
  sendResendTestEmailMock,
  syncGcpConnectionMock,
  updateDatabaseMock,
  syncGithubConnectionMock,
  syncResendConnectionMock,
  syncStripeConnectionMock,
} = vi.hoisted(() => ({
  createStripePlatformCheckoutSessionMock: vi.fn(),
  generateTextMock: vi.fn(),
  readDatabaseMock: vi.fn(),
  sendResendTestEmailMock: vi.fn(),
  syncGcpConnectionMock: vi.fn(),
  updateDatabaseMock: vi.fn(),
  syncGithubConnectionMock: vi.fn(),
  syncResendConnectionMock: vi.fn(),
  syncStripeConnectionMock: vi.fn(),
}));

vi.mock("@/lib/server/ai", () => ({
  generateText: generateTextMock,
}));

vi.mock("@/lib/server/db", () => ({
  getDatabaseBackendInfo: vi.fn(() => ({ backend: "local", dataFile: "memory" })),
  readDatabase: readDatabaseMock,
  updateDatabase: updateDatabaseMock,
}));

vi.mock("@/lib/server/integrations", () => ({
  createStripePlatformCheckoutSession: createStripePlatformCheckoutSessionMock,
  sendResendTestEmail: sendResendTestEmailMock,
  syncGcpConnection: syncGcpConnectionMock,
  syncGithubConnection: syncGithubConnectionMock,
  syncResendConnection: syncResendConnectionMock,
  syncStripeConnection: syncStripeConnectionMock,
}));

import {
  addOpportunity,
  activateSelfServeSignupWithFirebaseIdentity,
  applyProductTemplate,
  archiveProduct,
  cloneProduct,
  completeInviteWithFirebaseIdentity,
  connectGithub,
  createPlatformCheckoutSession,
  createInviteFromSignupIntent,
  createSignupIntent,
  deletePlatformPlan,
  createValidationSession,
  createValidationTask,
  createProduct,
  evaluateLaunchGate,
  generateOpportunityReadout,
  getAdminOverview,
  getPublicPricingData,
  getProductBundle,
  getWorkspaceCrmBundle,
  getWorkspaceDashboard,
  handleStripePlatformWebhook,
  loginWithInvite,
  logValidationTouchpoint,
  refreshGcpConnection,
  refreshGithubConnection,
  refreshResendConnection,
  refreshStripeConnection,
  restoreProduct,
  runLiveOpsAutomation,
  runValidationCrmJob,
  saveBuildSheet,
  savePlatformPlan,
  saveSpecDocument,
  sendOnboardingTestEmail,
  updateProductDetails,
  updateProductLaunchState,
  updateValidationTaskState,
  updateEmailSequence,
} from "@/lib/server/services";

function makeWorkspace() {
  return {
    id: "workspace-1",
    name: "Factory Lab",
    ownerUserId: "user-1",
    createdAt: "2026-04-15T12:00:00.000Z",
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    workspaceId: "workspace-1",
    name: "MicroSaaS Factory",
    summary: "Founder OS",
    vertical: "B2B SaaS",
    stage: "launch",
    pricingHypothesis: "$49/month",
    targetUser: "Solo founder",
    coreProblem: "Disconnected research and launch workflows",
    chosenMoat: "workflow-specificity",
    criticalBlockers: [],
    launchChecklist: [],
    metrics: {
      monthlyRecurringRevenue: 900,
      monthlyChurnRate: 3,
      supportHoursPerWeek: 2,
      activeP1Bugs: 0,
    },
    createdAt: "2026-04-15T12:00:00.000Z",
    updatedAt: "2026-04-15T12:00:00.000Z",
    ...overrides,
  };
}

function makeLead(overrides: Partial<ValidationLead> = {}): ValidationLead {
  return {
    id: crypto.randomUUID(),
    productId: "product-1",
    name: "Lead",
    email: "lead@example.com",
    company: "Factory Co",
    role: "Founder",
    channel: "LinkedIn",
    status: "contacted",
    willingToPay: false,
    demoBooked: false,
    reservationPlaced: false,
    notes: "",
    createdAt: "2026-04-15T12:00:00.000Z",
    updatedAt: "2026-04-15T12:00:00.000Z",
    ...overrides,
  };
}

function makeOpportunity(productId = "product-1") {
  return {
    id: "opportunity-1",
    productId,
    title: "Alarm review workflow",
    audience: "Plant managers",
    painStatement: "Alarm review is slow and noisy.",
    complaintFrequency: 4,
    painSeverity: 5,
    willingnessToPay: 4,
    competitionCount: 6,
    pricingPowerEstimate: "$99/month",
    moatType: "domain-expertise" as const,
    notes: "",
    createdAt: "2026-04-15T12:00:00.000Z",
    updatedAt: "2026-04-15T12:00:00.000Z",
    score: {
      painScore: 9,
      competitionScore: 10,
      pricingPowerScore: 8,
      founderFitScore: 10,
      moatScore: 10,
      totalScore: 47,
      thesis: "Validated demand with room to position on UX and niche specificity.",
    },
  };
}

function makeSpec(productId = "product-1"): SpecDocument {
  return {
    productId,
    targetUser: "Solo founder",
    problem: "Disconnected research and launch workflows",
    v1Features: ["Research", "Validation", "Launch"],
    exclusions: ["No public signup"],
    pricingHypothesis: "$49/month",
    launchCriteria: ["3 enthusiastic yes responses", "Integrations connected"],
    definitionOfDone: "Core workflow runs end to end.",
    approvedAt: "2026-04-15T12:00:00.000Z",
    updatedAt: "2026-04-15T12:00:00.000Z",
  };
}

function makeSequence(productId = "product-1"): EmailSequence {
  return {
    id: "sequence-1",
    productId,
    senderEmail: "noreply@example.com",
    status: "connected",
    updatedAt: "2026-04-15T12:00:00.000Z",
    items: [
      { key: "day-0", day: 0, title: "Welcome", subject: "Welcome", body: "Body" },
      { key: "day-1", day: 1, title: "Nudge", subject: "Nudge", body: "Body" },
      { key: "day-3", day: 3, title: "Case", subject: "Case", body: "Body" },
      { key: "day-7", day: 7, title: "Upgrade", subject: "Upgrade", body: "Body" },
      { key: "day-14", day: 14, title: "Survey", subject: "Survey", body: "Body" },
    ],
  };
}

function makeIntegration(
  provider: IntegrationConnection["provider"],
  productId = "product-1",
): IntegrationConnection {
  return {
    id: `${provider}-1`,
    productId,
    provider,
    status: "connected",
    connectedAt: "2026-04-15T12:00:00.000Z",
    lastSyncAt: "2026-04-15T12:00:00.000Z",
    metadata: {},
  };
}

function makeInvite(overrides: Partial<DatabaseShape["invites"][number]> = {}) {
  return {
    id: "invite-1",
    token: "invite-token",
    email: "founder@example.com",
    workspaceName: "Factory Lab",
    createdAt: "2026-04-15T12:00:00.000Z",
    expiresAt: "2026-05-15T12:00:00.000Z",
    ...overrides,
  };
}

function makeUser(overrides: Partial<DatabaseShape["users"][number]> = {}) {
  return {
    id: "user-1",
    email: "founder@example.com",
    name: "Founder",
    workspaceId: "workspace-1",
    createdAt: "2026-04-15T12:00:00.000Z",
    ...overrides,
  };
}

function makeDatabase(): DatabaseShape {
  return {
    waitlistRequests: [],
    signupIntents: [],
    invites: [],
    users: [],
    sessions: [],
    workspaces: [makeWorkspace()],
    products: [],
    buildSheets: [],
    opportunities: [],
    validationLeads: [],
    validationTouchpoints: [],
    validationSessions: [],
    validationTasks: [],
    specs: [],
    integrations: [],
    deploymentSnapshots: [],
    revenueSnapshots: [],
    emailSequences: [],
    launchGateResults: [],
    platformPlans: [],
    platformSubscriptions: [],
    activityEvents: [],
    automationRuns: [],
    globalFeatureFlags: { ...DEFAULT_FEATURE_FLAGS },
  };
}

describe("activity mutation logging", () => {
  let database: DatabaseShape;

  beforeEach(() => {
    database = makeDatabase();
    createStripePlatformCheckoutSessionMock.mockReset();
    generateTextMock.mockReset();
    readDatabaseMock.mockReset();
    sendResendTestEmailMock.mockReset();
    syncGcpConnectionMock.mockReset();
    updateDatabaseMock.mockReset();
    syncGithubConnectionMock.mockReset();
    syncResendConnectionMock.mockReset();
    syncStripeConnectionMock.mockReset();
    delete process.env.MICROSAAS_FACTORY_APP_URL;
    delete process.env.STRIPE_PLATFORM_SECRET_KEY;
    delete process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
    delete process.env.STRIPE_PLATFORM_PRICE_MAP_JSON;

    readDatabaseMock.mockImplementation(async () => database);
    updateDatabaseMock.mockImplementation(async (mutator: (database: DatabaseShape) => unknown) =>
      mutator(database),
    );
    generateTextMock.mockResolvedValue("AI recommendation");
    sendResendTestEmailMock.mockResolvedValue({ id: "email-1" });
    createStripePlatformCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });
    syncGithubConnectionMock.mockImplementation(
      async ({ owner, repo }: { owner: string; repo: string }) => ({
        metadata: {
          owner,
          repo,
          repoFullName: `${owner}/${repo}`,
          defaultBranch: "main",
          repoUrl: `https://github.com/${owner}/${repo}`,
          authMode: "pat",
        },
        snapshot: {
          defaultBranch: "main",
          repoUrl: `https://github.com/${owner}/${repo}`,
          lastPushAt: "2026-04-15T12:00:00.000Z",
          recentCommits: [],
          recentPullRequests: [],
          releases: [],
        },
        secret: undefined,
      }),
    );
    syncGcpConnectionMock.mockResolvedValue({
      metadata: {
        projectId: "project-1",
        region: "us-central1",
        serviceName: "factory-service",
        buildRegion: "global",
      },
      snapshot: {
        projectId: "project-1",
        region: "us-central1",
        serviceName: "factory-service",
        serviceUrl: "https://factory.run.app",
        latestReadyRevision: "factory-service-0001",
        terminalCondition: {
          state: "CONDITION_SUCCEEDED",
          message: "Ready",
        },
        traffic: [{ percent: 100, revision: "factory-service-0001" }],
        latestBuilds: [{ id: "build-1", status: "SUCCESS" }],
      },
      secret: JSON.stringify({ client_email: "svc@example.com", private_key: "key" }),
    });
    syncStripeConnectionMock.mockResolvedValue({
      metadata: {
        productCount: 2,
        priceCount: 3,
      },
      snapshot: {
        currency: "USD",
        activeSubscriptions: 4,
        monthlyRecurringRevenue: 480,
        annualRecurringRevenue: 5760,
        productCount: 2,
      },
      secret: "stripe-secret",
    });
    syncResendConnectionMock.mockResolvedValue({
      metadata: {
        senderEmail: "noreply@example.com",
        domainCount: 1,
        domains: [{ name: "example.com", status: "verified" }],
      },
      secret: "resend-secret",
    });
  });

  it("logs product creation events", async () => {
    const product = await createProduct("workspace-1", {
      name: "Alarm Rationalization Assistant",
      summary: "Reduces noisy alarm review work.",
      vertical: "Industrial automation",
      pricingHypothesis: "$99/month",
      targetUser: "Plant manager",
      coreProblem: "Manual alarm review is too slow.",
      chosenMoat: "domain-expertise",
    });

    expect(product.name).toBe("Alarm Rationalization Assistant");
    expect(database.activityEvents).toHaveLength(1);
    expect(database.activityEvents[0]).toMatchObject({
      workspaceId: "workspace-1",
      productId: product.id,
      category: "product",
      kind: "product_created",
      source: "founder",
    });
  });

  it("rejects product creation when the name is blank", async () => {
    await expect(
      createProduct("workspace-1", {
        name: "   ",
        summary: "Reduces noisy alarm review work.",
        vertical: "Industrial automation",
        pricingHypothesis: "$99/month",
        targetUser: "Plant manager",
        coreProblem: "Manual alarm review is too slow.",
        chosenMoat: "domain-expertise",
      }),
    ).rejects.toThrow("Name is required.");

    expect(database.products).toHaveLength(0);
    expect(database.activityEvents).toHaveLength(0);
  });

  it("rejects product creation when the moat type is invalid", async () => {
    await expect(
      createProduct("workspace-1", {
        name: "Alarm Rationalization Assistant",
        summary: "Reduces noisy alarm review work.",
        vertical: "Industrial automation",
        pricingHypothesis: "$99/month",
        targetUser: "Plant manager",
        coreProblem: "Manual alarm review is too slow.",
        chosenMoat: "invalid-moat" as Product["chosenMoat"],
      }),
    ).rejects.toThrow("Invalid moat type.");

    expect(database.products).toHaveLength(0);
    expect(database.activityEvents).toHaveLength(0);
  });

  it("creates a templated product and seeds blank spec sections from the template", async () => {
    const product = await createProduct("workspace-1", {
      name: "Line Visibility Hub",
      summary: "",
      vertical: "",
      pricingHypothesis: "",
      targetUser: "",
      coreProblem: "",
      chosenMoat: "data-gravity",
      templateId: "oee-dashboard",
    });

    const spec = database.specs.find((entry) => entry.productId === product.id);

    expect(product.templateId).toBe("oee-dashboard");
    expect(product.templateVersion).toBe(1);
    expect(product.vertical).toBe("Manufacturing operations");
    expect(product.summary).toContain("downtime");
    expect(product.targetUser).toContain("Plant manager");
    expect(product.chosenMoat).toBe("data-gravity");
    expect(spec?.v1Features.length).toBeGreaterThan(0);
    expect(spec?.exclusions.length).toBeGreaterThan(0);
    expect(spec?.launchCriteria.length).toBeGreaterThan(0);
    expect(spec?.definitionOfDone).toContain("plant team");
  });

  it("backfills the template moat when templated creation omits chosenMoat", async () => {
    const product = await createProduct("workspace-1", {
      name: "Template Default Moat",
      summary: "",
      vertical: "",
      pricingHypothesis: "",
      targetUser: "",
      coreProblem: "",
      templateId: "oee-dashboard",
    });

    expect(product.chosenMoat).toBe("platform-integration");
  });

  it("applies a template without overwriting populated product and spec fields", async () => {
    const product = makeProduct({
      id: "product-template-1",
      summary: "Existing founder thesis",
      vertical: "",
      targetUser: "Existing ICP",
      pricingHypothesis: "",
      coreProblem: "",
    });
    database.products = [product];
    database.specs = [
      {
        ...makeSpec(product.id),
        targetUser: "Existing ICP",
        problem: "",
        v1Features: ["Existing feature"],
        exclusions: [],
        pricingHypothesis: "",
        launchCriteria: [],
        definitionOfDone: "Existing definition of done.",
      },
    ];

    const result = await applyProductTemplate(
      "workspace-1",
      product.id,
      "construction-document-search",
    );

    expect(result.product.templateId).toBe("construction-document-search");
    expect(result.product.summary).toBe("Existing founder thesis");
    expect(result.product.vertical).toBe("Construction and infrastructure");
    expect(result.product.targetUser).toBe("Existing ICP");
    expect(result.product.pricingHypothesis).toBe("$49-$149 per project / month");
    expect(result.product.coreProblem).toContain("Teams waste hours");
    expect(result.spec.v1Features).toEqual(["Existing feature"]);
    expect(result.spec.exclusions.length).toBeGreaterThan(0);
    expect(result.spec.launchCriteria.length).toBeGreaterThan(0);
    expect(result.spec.definitionOfDone).toBe("Existing definition of done.");
    expect(database.activityEvents.at(-1)).toMatchObject({
      kind: "product_template_applied",
      metadata: expect.objectContaining({
        templateId: "construction-document-search",
      }),
    });
  });

  it("updates product settings and logs lifecycle activity", async () => {
    const product = makeProduct({
      id: "product-settings-1",
      workspaceId: "workspace-1",
      templateId: "oee-dashboard",
      templateVersion: 1,
    });
    database.products = [product];

    const updated = await updateProductDetails("workspace-1", product.id, {
      name: "Factory Control Hub",
      summary: "Founder operating system for portfolio control",
      vertical: "Industrial SaaS",
      pricingHypothesis: "$79/month",
      targetUser: "Solo founder",
      coreProblem: "The product portfolio is fragmented",
      chosenMoat: "platform-integration",
      templateId: "compliance-qna",
    });

    expect(updated).toMatchObject({
      id: product.id,
      name: "Factory Control Hub",
      summary: "Founder operating system for portfolio control",
      vertical: "Industrial SaaS",
      pricingHypothesis: "$79/month",
      targetUser: "Solo founder",
      coreProblem: "The product portfolio is fragmented",
      chosenMoat: "platform-integration",
      templateId: "compliance-qna",
      templateVersion: 1,
    });
    expect(database.activityEvents.at(-1)).toMatchObject({
      category: "product",
      kind: "product_updated",
      metadata: expect.objectContaining({
        templateId: "compliance-qna",
      }),
    });
  });

  it("rejects settings updates that clear required product fields", async () => {
    const product = makeProduct({
      id: "product-settings-required-1",
      workspaceId: "workspace-1",
    });
    database.products = [product];

    await expect(
      updateProductDetails("workspace-1", product.id, {
        name: "Factory Control Hub",
        summary: "   ",
        vertical: "Industrial SaaS",
        pricingHypothesis: "$79/month",
        targetUser: "Solo founder",
        coreProblem: "The product portfolio is fragmented",
        chosenMoat: "platform-integration",
        templateId: undefined,
      }),
    ).rejects.toThrow("Summary is required.");

    expect(database.products[0]?.summary).toBe("Founder OS");
    expect(database.activityEvents).toHaveLength(0);
  });

  it("rejects settings updates when the moat type is invalid", async () => {
    const product = makeProduct({
      id: "product-settings-invalid-moat-1",
      workspaceId: "workspace-1",
    });
    database.products = [product];

    await expect(
      updateProductDetails("workspace-1", product.id, {
        name: "Factory Control Hub",
        summary: "Founder operating system for portfolio control",
        vertical: "Industrial SaaS",
        pricingHypothesis: "$79/month",
        targetUser: "Solo founder",
        coreProblem: "The product portfolio is fragmented",
        chosenMoat: "invalid-moat" as Product["chosenMoat"],
        templateId: undefined,
      }),
    ).rejects.toThrow("Invalid moat type.");

    expect(database.products[0]?.chosenMoat).toBe("workflow-specificity");
    expect(database.activityEvents).toHaveLength(0);
  });

  it("archives products out of active rollups, blocks workflow mutations, and restores them", async () => {
    const activeProduct = makeProduct({
      id: "product-active-1",
      workspaceId: "workspace-1",
      stage: "validate",
    });
    const archivedProduct = makeProduct({
      id: "product-archived-1",
      workspaceId: "workspace-1",
      stage: "validate",
    });
    database.products = [activeProduct, archivedProduct];
    database.users = [makeUser()];
    database.validationSessions = [
      {
        id: "session-archived-1",
        productId: archivedProduct.id,
        sourceMode: "paste",
        channel: "call",
        context: "Archived discovery call",
        transcriptText: "Security review slows every deal.",
        createdAt: "2026-04-15T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
        analysisStatus: "queued",
        analysisAttempts: 0,
        generatedTaskIds: [],
      },
    ];
    database.validationTasks = [
      {
        id: "task-archived-1",
        productId: archivedProduct.id,
        type: "follow-up",
        title: "Follow up on security review",
        notes: "",
        source: "manual",
        state: "due",
        dueAt: "2026-04-15T12:00:00.000Z",
        createdAt: "2026-04-15T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
      },
    ];
    database.emailSequences = [makeSequence(archivedProduct.id)];

    await archiveProduct("workspace-1", archivedProduct.id, {
      reason: "Merged into another operating lane",
    });

    const dashboard = await getWorkspaceDashboard("workspace-1");
    const crm = await getWorkspaceCrmBundle("workspace-1");

    expect(dashboard.products.map((entry) => entry.product.id)).toEqual([activeProduct.id]);
    expect(dashboard.archivedProducts.map((entry) => entry.product.id)).toEqual([archivedProduct.id]);
    expect(dashboard.crmSummary.pendingAnalysisCount).toBe(0);
    expect(dashboard.crmSummary.overdueCount).toBe(0);
    expect(crm.products.map((product) => product.id)).toEqual([activeProduct.id]);
    expect(crm.pendingSessions).toHaveLength(0);
    expect(crm.tasks).toHaveLength(0);

    await expect(
      addOpportunity("workspace-1", archivedProduct.id, {
        title: "Archived opportunity",
        audience: "Founders",
        painStatement: "Too many active lanes",
        complaintFrequency: 3,
        painSeverity: 4,
        willingnessToPay: 4,
        competitionCount: 2,
        pricingPowerEstimate: "$99/month",
        moatType: "workflow-specificity",
        notes: "",
      }),
    ).rejects.toThrow(
      "Archived products are read-only. Restore the product before making workflow changes.",
    );
    await expect(
      saveSpecDocument("workspace-1", archivedProduct.id, {
        targetUser: "Solo founder",
        problem: "Fragmented portfolio",
        v1FeaturesText: "Dashboards",
        exclusionsText: "None",
        pricingHypothesis: "$79/month",
        launchCriteriaText: "Validated niche",
        definitionOfDone: "Aligned systems",
      }),
    ).rejects.toThrow(
      "Archived products are read-only. Restore the product before making workflow changes.",
    );
    await expect(
      saveBuildSheet("workspace-1", archivedProduct.id, {
        releaseGoal: "Ship archived lane",
        shipChecklistText: "Smoke test",
        blockersText: "",
        notes: "",
      }),
    ).rejects.toThrow(
      "Archived products are read-only. Restore the product before making workflow changes.",
    );
    await expect(
      updateEmailSequence("workspace-1", archivedProduct.id, {
        senderEmail: "support@example.com",
        subjects: ["Welcome", "Nudge", "Case", "Upgrade", "Survey"],
        bodies: ["B0", "B1", "B3", "B7", "B14"],
      }),
    ).rejects.toThrow(
      "Archived products are read-only. Restore the product before making workflow changes.",
    );
    await expect(
      updateProductLaunchState("workspace-1", archivedProduct.id, {
        monthlyRecurringRevenue: 250,
        monthlyChurnRate: 4,
        supportHoursPerWeek: 1,
        activeP1Bugs: 0,
        criticalBlockersText: "",
        launchChecklistText: "",
      }),
    ).rejects.toThrow(
      "Archived products are read-only. Restore the product before making workflow changes.",
    );

    await restoreProduct("workspace-1", archivedProduct.id);
    await addOpportunity("workspace-1", archivedProduct.id, {
      title: "Restored opportunity",
      audience: "Founders",
      painStatement: "Too many active lanes",
      complaintFrequency: 4,
      painSeverity: 4,
      willingnessToPay: 4,
      competitionCount: 2,
      pricingPowerEstimate: "$99/month",
      moatType: "workflow-specificity",
      notes: "",
    });

    const restoredDashboard = await getWorkspaceDashboard("workspace-1");
    expect(restoredDashboard.products.map((entry) => entry.product.id)).toContain(archivedProduct.id);
    expect(database.activityEvents.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["product_archived", "product_restored"]),
    );
  });

  it("clones only the strategic baseline and resets live operating state", async () => {
    const product = makeProduct({
      id: "product-clone-source-1",
      workspaceId: "workspace-1",
      stage: "launch",
      summary: "Source lane",
      templateId: "oee-dashboard",
      templateVersion: 1,
      criticalBlockers: ["Need final launch review"],
      launchChecklist: ["Prepare launch email", "Monitor support inbox"],
      metrics: {
        monthlyRecurringRevenue: 850,
        monthlyChurnRate: 2,
        supportHoursPerWeek: 1.5,
        activeP1Bugs: 1,
      },
    });
    database.products = [product];
    database.opportunities = [makeOpportunity(product.id)];
    database.specs = [
      {
        ...makeSpec(product.id),
        approvedAt: "2026-04-15T12:00:00.000Z",
      },
    ];
    database.buildSheets = [
      {
        productId: product.id,
        releaseGoal: "Ship the beta launch",
        shipChecklist: ["Smoke test", "Deploy"],
        blockers: ["Need final QA sign-off"],
        notes: "Founder release runbook",
        targetReleaseAt: "2026-04-20T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
      },
    ];
    database.validationLeads = [makeLead({ id: "lead-clone-1", productId: product.id })];
    database.validationTouchpoints = [
      {
        id: "touchpoint-clone-1",
        productId: product.id,
        leadId: "lead-clone-1",
        type: "email",
        outcome: "replied",
        summary: "Interested in pilot",
        createdAt: "2026-04-15T12:00:00.000Z",
        nextFollowUpAt: "2026-04-18T12:00:00.000Z",
      },
    ];
    database.validationSessions = [
      {
        id: "session-clone-1",
        productId: product.id,
        leadId: "lead-clone-1",
        sourceMode: "paste",
        channel: "call",
        context: "Discovery call",
        transcriptText: "Manual handoffs are slow.",
        createdAt: "2026-04-15T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
        analysisStatus: "completed",
        analysisAttempts: 1,
        generatedTaskIds: ["task-clone-1"],
        analysis: {
          summary: "Manual handoffs are slow.",
          objections: ["Security review"],
          painPoints: ["Manual handoffs"],
          buyingSignals: ["Would pay for pilot"],
          sentiment: "positive",
          stageAssessment: "enthusiastic",
          recommendedNextActions: ["Send pilot proposal"],
        },
      },
    ];
    database.validationTasks = [
      {
        id: "task-clone-1",
        productId: product.id,
        leadId: "lead-clone-1",
        sessionId: "session-clone-1",
        type: "follow-up",
        title: "Send pilot proposal",
        notes: "",
        source: "session-analysis",
        state: "due",
        dueAt: "2026-04-16T12:00:00.000Z",
        createdAt: "2026-04-15T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
      },
    ];
    database.integrations = [
      makeIntegration("github", product.id),
      makeIntegration("gcp", product.id),
      makeIntegration("stripe", product.id),
      makeIntegration("resend", product.id),
    ];
    database.deploymentSnapshots = [
      {
        id: "deploy-clone-1",
        productId: product.id,
        provider: "gcp",
        environment: "beta",
        updatedAt: "2026-04-15T12:00:00.000Z",
        data: { latestReadyRevision: "service-0001" },
      },
    ];
    database.revenueSnapshots = [
      {
        id: "revenue-clone-1",
        productId: product.id,
        monthlyRecurringRevenue: 850,
        annualRecurringRevenue: 10200,
        activeSubscriptions: 9,
        currency: "USD",
        productCount: 1,
        syncedAt: "2026-04-15T12:00:00.000Z",
      },
    ];
    database.emailSequences = [makeSequence(product.id)];
    database.launchGateResults = [
      {
        id: "gate-clone-1",
        productId: product.id,
        checks: [],
        passed: true,
        readyForNextProduct: true,
        evaluatedAt: "2026-04-15T12:00:00.000Z",
        notes: ["Ready"],
      },
    ];
    database.activityEvents = [
      {
        id: "event-source-1",
        workspaceId: "workspace-1",
        productId: product.id,
        category: "product",
        kind: "product_created",
        source: "founder",
        title: "Created source lane",
        detail: "Seeded source lane.",
        createdAt: "2026-04-15T12:00:00.000Z",
        metadata: {},
      },
    ];

    const clone = await cloneProduct("workspace-1", product.id);
    const clonedBuildSheet = database.buildSheets.find((entry) => entry.productId === clone.id);
    const clonedSpec = database.specs.find((entry) => entry.productId === clone.id);
    const clonedOpportunity = database.opportunities.find((entry) => entry.productId === clone.id);
    const dashboard = await getWorkspaceDashboard("workspace-1");

    expect(clone).toMatchObject({
      name: "Copy of MicroSaaS Factory",
      stage: "validate",
      templateId: "oee-dashboard",
      clonedFromProductId: product.id,
      criticalBlockers: [],
      launchChecklist: ["Prepare launch email", "Monitor support inbox"],
      metrics: {
        monthlyRecurringRevenue: 0,
        monthlyChurnRate: 0,
        supportHoursPerWeek: 0,
        activeP1Bugs: 0,
      },
    });
    expect(clonedOpportunity).toMatchObject({
      productId: clone.id,
      title: "Alarm review workflow",
      score: expect.objectContaining({
        totalScore: 47,
      }),
    });
    expect(clonedSpec).toMatchObject({
      productId: clone.id,
      targetUser: "Solo founder",
    });
    expect(clonedBuildSheet).toMatchObject({
      productId: clone.id,
      releaseGoal: "Ship the beta launch",
      shipChecklist: ["Smoke test", "Deploy"],
      blockers: [],
      notes: "Founder release runbook",
      targetReleaseAt: undefined,
    });
    expect(database.validationLeads.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.validationTouchpoints.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.validationSessions.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.validationTasks.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.integrations.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.deploymentSnapshots.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.revenueSnapshots.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.emailSequences.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(database.launchGateResults.filter((entry) => entry.productId === clone.id)).toHaveLength(0);
    expect(
      database.activityEvents.filter((event) => event.productId === clone.id).map((event) => event.kind),
    ).toEqual(["product_cloned"]);
    expect(dashboard.products.map((entry) => entry.product.id)).toContain(clone.id);
  });

  it("returns resolved template metadata from the dashboard and product bundle", async () => {
    const product = makeProduct({
      id: "product-template-2",
      workspaceId: "workspace-1",
      templateId: "compliance-qna",
      templateVersion: 1,
    });
    database.products = [product];
    database.specs = [makeSpec(product.id)];

    const dashboard = await getWorkspaceDashboard("workspace-1");
    const bundle = await getProductBundle("workspace-1", product.id);

    expect(dashboard.availableTemplates).toHaveLength(3);
    expect(dashboard.products[0]?.template?.id).toBe("compliance-qna");
    expect(bundle.template?.id).toBe("compliance-qna");
    expect(bundle.template?.stages.validate.targetBuyer).toContain("Compliance");
    expect(bundle.availableTemplates).toHaveLength(3);
  });

  it("returns build state and readiness summaries from the product bundle", async () => {
    const product = makeProduct({
      id: "product-build-1",
      workspaceId: "workspace-1",
      stage: "build",
    });
    database.products = [product];
    database.specs = [makeSpec(product.id)];

    const bundle = await getProductBundle("workspace-1", product.id);

    expect(bundle.buildSheet.productId).toBe(product.id);
    expect(bundle.buildSheet.shipChecklist).toEqual([]);
    expect(bundle.buildReadiness.readyForLaunch).toBe(false);
    expect(bundle.buildReadiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "spec",
          passed: true,
        }),
        expect.objectContaining({
          key: "github",
          passed: false,
        }),
      ]),
    );
  });

  it("saves build release controls and logs build activity", async () => {
    const product = makeProduct({
      id: "product-build-2",
      workspaceId: "workspace-1",
      stage: "build",
    });
    database.products = [product];

    const buildSheet = await saveBuildSheet("workspace-1", product.id, {
      releaseGoal: "Ship the first operator-ready beta lane",
      shipChecklistText: "Validate onboarding\nRefresh deployment snapshot",
      blockersText: "Need final digest copy",
      notes: "Hold launch review until the founder dry-run is complete.",
      targetReleaseOn: "2026-04-21",
    });

    expect(buildSheet.shipChecklist).toEqual([
      "Validate onboarding",
      "Refresh deployment snapshot",
    ]);
    expect(buildSheet.blockers).toEqual(["Need final digest copy"]);
    expect(buildSheet.targetReleaseAt).toBe("2026-04-21T12:00:00.000Z");
    expect(database.buildSheets).toHaveLength(1);
    expect(database.activityEvents.at(-1)).toMatchObject({
      category: "build",
      kind: "build_sheet_saved",
    });
  });

  it("logs validation touchpoint events", async () => {
    const product = makeProduct({ stage: "validate" });
    database.products = [product];
    database.validationLeads = [
      makeLead({
        id: "lead-1",
        productId: product.id,
        name: "Jamie Founder",
      }),
    ];

    await logValidationTouchpoint("workspace-1", product.id, "lead-1", {
      type: "demo",
      outcome: "booked",
      summary: "Booked a discovery demo for Friday.",
      status: "enthusiastic",
      nextFollowUpOn: "2026-04-18",
      willingToPay: true,
      demoBooked: true,
      reservationPlaced: false,
    });

    expect(database.activityEvents).toHaveLength(1);
    expect(database.activityEvents[0]).toMatchObject({
      workspaceId: "workspace-1",
      productId: product.id,
      category: "validation",
      kind: "validation_touchpoint_logged",
      source: "founder",
    });
  });

  it("captures an uploaded transcript, analyzes it, and creates AI follow-up tasks", async () => {
    const product = makeProduct({ stage: "validate" });
    database.products = [product];
    database.validationLeads = [
      makeLead({
        id: "lead-1",
        productId: product.id,
        name: "Jamie Founder",
      }),
    ];

    const session = await createValidationSession("workspace-1", product.id, {
      leadId: "lead-1",
      sourceMode: "upload",
      channel: "call",
      context: "Pricing and pilot discovery call",
      transcriptText:
        "Our biggest problem is manual quoting that wastes hours. We are interested and would pay for a pilot. Security review is a concern.",
      upload: {
        fileName: "discovery-call.txt",
        contentType: "text/plain",
        sizeBytes: 1824,
      },
      aiMode: "flash",
    });

    expect(session.analysisStatus).toBe("completed");
    expect(session.upload?.fileName).toBe("discovery-call.txt");
    expect(session.analysis?.painPoints).toContain(
      "Our biggest problem is manual quoting that wastes hours.",
    );
    expect(session.analysis?.buyingSignals).toContain(
      "We are interested and would pay for a pilot.",
    );
    expect(session.analysis?.objections).toContain("Security review is a concern.");
    expect(database.validationTasks.length).toBeGreaterThan(0);
    expect(database.activityEvents.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        "validation_session_logged",
        "validation_session_analyzed",
        "validation_task_created",
      ]),
    );
  });

  it("creates founder tasks and updates their lifecycle state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00.000Z"));

    try {
      const product = makeProduct({ stage: "validate" });
      database.products = [product];
      database.validationLeads = [
        makeLead({
          id: "lead-1",
          productId: product.id,
        }),
      ];

      const task = await createValidationTask("workspace-1", product.id, {
        leadId: "lead-1",
        type: "follow-up",
        title: "Send pricing recap",
        notes: "Confirm pilot range and next steps.",
        dueOn: "2026-04-20",
      });

      expect(task.state).toBe("queued");

      const snoozed = await updateValidationTaskState("workspace-1", task.id, {
        action: "snooze",
      });
      expect(snoozed.task.state).toBe("snoozed");
      expect(snoozed.task.snoozedUntil).toBe("2026-04-17T12:00:00.000Z");

      const reopened = await updateValidationTaskState("workspace-1", task.id, {
        action: "reopen",
      });
      expect(reopened.task.state).toBe("queued");

      const completed = await updateValidationTaskState("workspace-1", task.id, {
        action: "complete",
      });
      expect(completed.task.state).toBe("done");
      expect(completed.task.completedAt).toBe("2026-04-16T12:00:00.000Z");
      expect(database.activityEvents.map((event) => event.kind)).toEqual(
        expect.arrayContaining([
          "validation_task_created",
          "validation_task_updated",
        ]),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("logs integration provider metadata", async () => {
    const product = makeProduct({ stage: "spec" });
    database.products = [product];
    database.specs = [makeSpec(product.id)];

    await connectGithub("workspace-1", product.id, {
      owner: "factory",
      repo: "microsaas-factory",
    });

    expect(database.activityEvents).toHaveLength(1);
    expect(database.activityEvents[0]).toMatchObject({
      workspaceId: "workspace-1",
      productId: product.id,
      category: "ops",
      kind: "integration_connected",
      source: "integration",
      metadata: expect.objectContaining({
        provider: "github",
      }),
    });
  });

  it("refreshes provider state using stored metadata and secrets", async () => {
    const product = makeProduct({
      id: "product-refresh-1",
      workspaceId: "workspace-1",
      stage: "build",
    });
    database.products = [product];
    database.integrations = [
      {
        ...makeIntegration("github", product.id),
        metadata: {
          owner: "factory",
          repo: "microsaas-factory",
          repoFullName: "factory/microsaas-factory",
          authMode: "pat",
        },
        secret: encryptSecret("github-pat"),
      },
      {
        ...makeIntegration("gcp", product.id),
        metadata: {
          projectId: "project-1",
          region: "us-central1",
          serviceName: "factory-service",
          buildRegion: "global",
        },
        secret: encryptSecret(JSON.stringify({ client_email: "svc@example.com", private_key: "key" })),
      },
      {
        ...makeIntegration("stripe", product.id),
        secret: encryptSecret("stripe-secret"),
      },
      {
        ...makeIntegration("resend", product.id),
        metadata: {
          senderEmail: "noreply@example.com",
        },
        secret: encryptSecret("resend-secret"),
      },
    ];
    database.emailSequences = [makeSequence(product.id)];

    await refreshGithubConnection("workspace-1", product.id);
    await refreshGcpConnection("workspace-1", product.id);
    await refreshStripeConnection("workspace-1", product.id);
    await refreshResendConnection("workspace-1", product.id);

    expect(syncGithubConnectionMock).toHaveBeenCalledWith({
      owner: "factory",
      repo: "microsaas-factory",
      installationId: undefined,
      personalAccessToken: "github-pat",
    });
    expect(syncGcpConnectionMock).toHaveBeenCalledWith({
      projectId: "project-1",
      region: "us-central1",
      serviceName: "factory-service",
      buildRegion: "global",
      serviceAccountJson: JSON.stringify({
        client_email: "svc@example.com",
        private_key: "key",
      }),
    });
    expect(syncStripeConnectionMock).toHaveBeenCalledWith({
      secretKey: "stripe-secret",
    });
    expect(syncResendConnectionMock).toHaveBeenCalledWith({
      apiKey: "resend-secret",
      senderEmail: "noreply@example.com",
    });
    expect(
      database.activityEvents.filter((event) => event.kind === "integration_refreshed"),
    ).toHaveLength(4);
  });

  it("returns product and workspace CRM bundles with task buckets and objection clusters", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00.000Z"));

    try {
      const product = makeProduct({ stage: "validate" });
      database.products = [product];
      database.users = [makeUser()];
      database.validationLeads = [
        makeLead({
          id: "lead-1",
          productId: product.id,
          name: "Jamie Founder",
        }),
      ];
      database.validationSessions = [
        {
          id: "session-1",
          productId: product.id,
          leadId: "lead-1",
          sourceMode: "paste",
          channel: "call",
          context: "Discovery call",
          transcriptText:
            "Manual quoting wastes hours. Security review is a concern. We would pay for a pilot.",
          createdAt: "2026-04-15T12:00:00.000Z",
          updatedAt: "2026-04-16T11:00:00.000Z",
          analysisStatus: "completed",
          analysisAttempts: 1,
          lastAnalyzedAt: "2026-04-16T11:00:00.000Z",
          generatedTaskIds: ["task-1"],
          analysis: {
            summary: "Manual quoting wastes hours and security review blocks progress.",
            objections: ["Security review is a concern."],
            painPoints: ["Manual quoting wastes hours."],
            buyingSignals: ["We would pay for a pilot."],
            sentiment: "mixed",
            stageAssessment: "interested",
            recommendedNextActions: ["Send security FAQ."],
          },
        },
        {
          id: "session-2",
          productId: product.id,
          sourceMode: "paste",
          channel: "email",
          context: "Email follow-up",
          transcriptText: "Still waiting on a reply.",
          createdAt: "2026-04-16T10:00:00.000Z",
          updatedAt: "2026-04-16T10:00:00.000Z",
          analysisStatus: "queued",
          analysisAttempts: 0,
          generatedTaskIds: [],
        },
      ];
      database.validationTasks = [
        {
          id: "task-1",
          productId: product.id,
          leadId: "lead-1",
          sessionId: "session-1",
          type: "follow-up",
          title: "Send security FAQ",
          notes: "Address security objection.",
          source: "session-analysis",
          state: "due",
          dueAt: "2026-04-16T12:00:00.000Z",
          createdAt: "2026-04-16T11:00:00.000Z",
          updatedAt: "2026-04-16T11:00:00.000Z",
        },
        {
          id: "task-2",
          productId: product.id,
          leadId: "lead-1",
          type: "call",
          title: "Follow up tomorrow",
          notes: "",
          source: "manual",
          state: "snoozed",
          dueAt: "2026-04-18T12:00:00.000Z",
          snoozedUntil: "2026-04-17T12:00:00.000Z",
          createdAt: "2026-04-16T11:00:00.000Z",
          updatedAt: "2026-04-16T11:00:00.000Z",
        },
      ];

      const productBundle = await getProductBundle("workspace-1", product.id);
      const workspaceBundle = await getWorkspaceCrmBundle("workspace-1");

      expect(productBundle.crmSummary.pendingAnalysisCount).toBe(1);
      expect(productBundle.taskBuckets.dueToday).toHaveLength(1);
      expect(productBundle.taskBuckets.snoozed).toHaveLength(1);
      expect(productBundle.crmSummary.topObjections[0]).toMatchObject({
        label: "Security review is a concern.",
        count: 1,
      });
      expect(workspaceBundle.pendingSessions).toHaveLength(1);
      expect(workspaceBundle.taskBuckets.dueToday).toHaveLength(1);
      expect(workspaceBundle.topPainPoints[0]).toMatchObject({
        label: "Manual quoting wastes hours.",
        count: 1,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries due session analyses and sends at most one digest per product per day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00.000Z"));

    try {
      const product = makeProduct({ stage: "validate" });
      database.products = [product];
      database.users = [makeUser()];
      database.validationLeads = [
        makeLead({
          id: "lead-1",
          productId: product.id,
          name: "Jamie Founder",
        }),
      ];
      database.validationSessions = [
        {
          id: "session-retry-1",
          productId: product.id,
          leadId: "lead-1",
          sourceMode: "paste",
          channel: "call",
          context: "Retry this transcript",
          transcriptText:
            "Manual quoting wastes hours. We would pay for a pilot. Security review is a concern.",
          createdAt: "2026-04-15T12:00:00.000Z",
          updatedAt: "2026-04-15T12:00:00.000Z",
          analysisStatus: "failed",
          analysisAttempts: 1,
          nextAnalysisAttemptAt: "2026-04-16T10:00:00.000Z",
          generatedTaskIds: [],
          lastAnalysisError: "Previous transient model error.",
        },
      ];
      database.validationTasks = [
        {
          id: "task-digest-1",
          productId: product.id,
          leadId: "lead-1",
          type: "follow-up",
          title: "Send recap",
          notes: "Share a short recap email.",
          source: "manual",
          state: "due",
          dueAt: "2026-04-16T09:00:00.000Z",
          createdAt: "2026-04-16T09:00:00.000Z",
          updatedAt: "2026-04-16T09:00:00.000Z",
        },
      ];
      database.integrations = [
        {
          ...makeIntegration("resend", product.id),
          secret: encryptSecret("resend-key"),
        },
      ];
      database.emailSequences = [makeSequence(product.id)];

      const firstRun = await runValidationCrmJob();

      expect(firstRun.analyzedSessionCount).toBe(1);
      expect(firstRun.promotedTaskCount).toBe(0);
      expect(firstRun.sentDigestCount).toBe(1);
      expect(firstRun.failedDigestCount).toBe(0);
      expect(sendResendTestEmailMock).toHaveBeenCalledTimes(1);
      expect(database.validationSessions[0]?.analysisStatus).toBe("completed");
      expect(database.activityEvents.map((event) => event.kind)).toContain(
        "validation_digest_sent",
      );
      expect(
        database.validationTasks.some((task) => task.lastReminderSentAt === "2026-04-16T12:00:00.000Z"),
      ).toBe(true);
      expect(database.automationRuns[0]).toMatchObject({
        kind: "validation-crm",
        status: "success",
        metrics: {
          analyzedSessionCount: 1,
          promotedTaskCount: 0,
          sentDigestCount: 1,
          failedDigestCount: 0,
        },
      });

      const secondRun = await runValidationCrmJob();

      expect(secondRun.analyzedSessionCount).toBe(0);
      expect(secondRun.promotedTaskCount).toBe(0);
      expect(secondRun.sentDigestCount).toBe(0);
      expect(secondRun.failedDigestCount).toBe(0);
      expect(sendResendTestEmailMock).toHaveBeenCalledTimes(1);
      expect(database.automationRuns[0]).toMatchObject({
        kind: "validation-crm",
        summary: "No CRM automation work was due.",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("persists AI opportunity readout activity on the saved database and updates the product timestamp", async () => {
    const product = makeProduct({ stage: "research" });
    database.products = [product];
    database.opportunities = [makeOpportunity(product.id)];

    const updated = await generateOpportunityReadout(
      "workspace-1",
      product.id,
      "opportunity-1",
      "flash",
    );

    expect(updated.score.aiRecommendation).toBe("AI recommendation");
    expect(database.activityEvents).toHaveLength(1);
    expect(database.activityEvents[0]).toMatchObject({
      workspaceId: "workspace-1",
      productId: product.id,
      category: "research",
      kind: "opportunity_readout_generated",
      source: "ai",
    });
    expect(database.products[0]?.updatedAt).not.toBe("2026-04-15T12:00:00.000Z");
  });

  it("updates the product timestamp when the onboarding sequence changes", async () => {
    const product = makeProduct({ stage: "launch" });
    database.products = [product];
    database.emailSequences = [makeSequence(product.id)];

    await updateEmailSequence("workspace-1", product.id, {
      senderEmail: "support@example.com",
      subjects: ["Welcome", "Nudge", "Case", "Upgrade", "Survey"],
      bodies: ["B0", "B1", "B3", "B7", "B14"],
    });

    expect(database.products[0]?.updatedAt).not.toBe("2026-04-15T12:00:00.000Z");
    expect(database.activityEvents[0]).toMatchObject({
      category: "ops",
      kind: "email_sequence_updated",
    });
  });

  it("updates the product timestamp when an onboarding test email is sent", async () => {
    const product = makeProduct({ stage: "launch" });
    database.products = [product];
    database.emailSequences = [makeSequence(product.id)];
    database.integrations = [
      {
        ...makeIntegration("resend", product.id),
        secret: encryptSecret("resend-key"),
      },
    ];

    await sendOnboardingTestEmail("workspace-1", product.id, {
      recipientEmail: "founder@example.com",
      itemKey: "day-0",
    });

    expect(sendResendTestEmailMock).toHaveBeenCalledTimes(1);
    expect(database.products[0]?.updatedAt).not.toBe("2026-04-15T12:00:00.000Z");
    expect(database.emailSequences[0]?.lastTestSentAt).toBeTruthy();
    expect(database.activityEvents[0]).toMatchObject({
      category: "ops",
      kind: "onboarding_test_sent",
    });
  });

  it("logs launch gate evaluation events", async () => {
    const product = makeProduct();
    database.products = [product];
    database.specs = [makeSpec(product.id)];
    database.emailSequences = [makeSequence(product.id)];
    database.integrations = [
      makeIntegration("github", product.id),
      makeIntegration("gcp", product.id),
      makeIntegration("stripe", product.id),
      makeIntegration("resend", product.id),
    ];
    database.validationLeads = [
      ...Array.from({ length: 3 }, (_, index) =>
        makeLead({
          id: `enthusiastic-${index}`,
          productId: product.id,
          status: "enthusiastic",
          willingToPay: true,
          demoBooked: true,
        }),
      ),
      ...Array.from({ length: 7 }, (_, index) =>
        makeLead({
          id: `lead-${index}`,
          productId: product.id,
          status: "contacted",
        }),
      ),
    ];

    const gate = await evaluateLaunchGate("workspace-1", product.id);

    expect(gate.passed).toBe(true);
    expect(database.products[0]?.stage).toBe("stabilize");
    expect(database.activityEvents).toHaveLength(1);
    expect(database.activityEvents[0]).toMatchObject({
      workspaceId: "workspace-1",
      productId: product.id,
      category: "launch",
      kind: "launch_gate_evaluated",
      source: "founder",
      metadata: expect.objectContaining({
        passed: true,
      }),
    });
  });

  it("completes founder provisioning from an exact invite token with Firebase identity", async () => {
    database.invites = [makeInvite()];

    const user = await completeInviteWithFirebaseIdentity({
      token: "invite-token",
      email: "founder@example.com",
      providerId: "google.com",
    });

    expect(user.email).toBe("founder@example.com");
    expect(user.name).toBe("founder");
    expect(user.lastLoginMethod).toBe("firebase-google");
    expect(database.workspaces).toHaveLength(2);
    expect(database.invites[0]?.acceptedAt).toBeTruthy();
  });

  it("rejects Firebase invite completion when the token email does not match", async () => {
    database.invites = [makeInvite()];

    await expect(
      completeInviteWithFirebaseIdentity({
        token: "invite-token",
        email: "wrong@example.com",
        providerId: "password",
      }),
    ).rejects.toThrow("Invite email does not match.");
  });

  it("preserves the manual invite-token login path", async () => {
    database.invites = [makeInvite()];

    const user = await loginWithInvite({
      email: "founder@example.com",
      token: "invite-token",
    });

    expect(user.email).toBe("founder@example.com");
    expect(user.lastLoginMethod).toBe("invite-token");
    expect(database.invites[0]?.acceptedAt).toBeTruthy();
  });

  it("creates signup intents and converts them through the invite flow", async () => {
    database.platformPlans = [
      {
        id: "beta-invite",
        name: "Invite Beta",
        hidden: false,
        monthlyPrice: 49,
        annualPrice: 490,
        features: ["Single founder"],
      },
    ];
    database.globalFeatureFlags.publicSignupEnabled = true;

    const signupIntent = await createSignupIntent({
      founderName: "Founder Signup",
      email: "founder@example.com",
      workspaceName: "Factory Signup",
      planId: "beta-invite",
    });

    expect(signupIntent.status).toBe("pending_activation");

    const { invite } = await createInviteFromSignupIntent(signupIntent.id);

    expect(database.signupIntents[0]?.status).toBe("invited");
    expect(invite.email).toBe("founder@example.com");

    await loginWithInvite({
      email: "founder@example.com",
      token: invite.token,
    });

    expect(database.signupIntents[0]?.status).toBe("provisioned");
  });

  it("preserves invited signup intents when the founder resubmits the public form", async () => {
    database.platformPlans = [
      {
        id: "growth",
        name: "Growth",
        hidden: false,
        monthlyPrice: 99,
        annualPrice: 990,
        features: ["Single founder"],
      },
      {
        id: "scale",
        name: "Scale",
        hidden: false,
        monthlyPrice: 199,
        annualPrice: 1990,
        features: ["Single founder"],
      },
    ];
    database.globalFeatureFlags.publicSignupEnabled = true;

    const signupIntent = await createSignupIntent({
      founderName: "Founder Signup",
      email: "founder@example.com",
      workspaceName: "Factory Signup",
      planId: "growth",
    });
    await createInviteFromSignupIntent(signupIntent.id);

    const resubmitted = await createSignupIntent({
      founderName: "Updated Founder Name",
      email: "founder@example.com",
      workspaceName: "Changed Workspace Name",
      planId: "scale",
    });

    expect(resubmitted.id).toBe(signupIntent.id);
    expect(database.signupIntents[0]).toMatchObject({
      founderName: "Updated Founder Name",
      workspaceName: "Factory Signup",
      planId: "growth",
      status: "invited",
    });
    expect(database.invites).toHaveLength(1);
  });

  it("rejects hidden plan selection when a public self-serve plan is available", async () => {
    database.platformPlans = [
      {
        id: "beta-invite",
        name: "Invite Beta",
        hidden: true,
        monthlyPrice: 49,
        annualPrice: 490,
        features: ["Single founder"],
      },
      {
        id: "growth",
        name: "Growth",
        hidden: false,
        monthlyPrice: 99,
        annualPrice: 990,
        features: ["Single founder"],
      },
    ];
    database.globalFeatureFlags.publicSignupEnabled = true;

    await expect(
      createSignupIntent({
        founderName: "Founder Signup",
        email: "founder@example.com",
        workspaceName: "Factory Signup",
        planId: "beta-invite",
      }),
    ).rejects.toThrow("Selected plan is not available.");

    expect(database.signupIntents).toHaveLength(0);
  });

  it("provisions a self-serve workspace from a signup intent", async () => {
    database.platformPlans = [
      {
        id: "growth",
        name: "Growth",
        hidden: false,
        monthlyPrice: 99,
        annualPrice: 990,
        features: ["Single founder"],
      },
    ];
    database.globalFeatureFlags.publicSignupEnabled = true;
    database.globalFeatureFlags.selfServeProvisioningEnabled = true;
    database.workspaces = [];

    const signupIntent = await createSignupIntent({
      founderName: "Founder Self Serve",
      email: "self-serve@example.com",
      workspaceName: "Factory Self Serve",
      planId: "growth",
    });

    const user = await activateSelfServeSignupWithFirebaseIdentity({
      signupIntentId: signupIntent.id,
      email: "self-serve@example.com",
      name: "Founder Self Serve",
      providerId: "google.com",
    });

    expect(user.email).toBe("self-serve@example.com");
    expect(database.signupIntents[0]).toMatchObject({
      status: "provisioned",
      userId: user.id,
    });
    expect(database.workspaces[0]?.name).toBe("Factory Self Serve");
    expect(database.platformSubscriptions[0]).toMatchObject({
      planId: "growth",
      status: "trial",
      source: "self-serve",
    });
  });

  it("creates and updates platform plans while keeping public pricing sorted", async () => {
    await savePlatformPlan({
      id: "scale",
      name: "Scale",
      hidden: false,
      monthlyPrice: 199,
      annualPrice: 1990,
      featuresText: "Unlimited workspaces\nPriority support",
    });
    await savePlatformPlan({
      id: "growth",
      name: "Growth",
      hidden: false,
      monthlyPrice: 99,
      annualPrice: 990,
      featuresText: "Single founder workspace\nGitHub + GCP",
    });
    await savePlatformPlan({
      existingPlanId: "growth",
      id: "growth",
      name: "Growth Plus",
      hidden: false,
      monthlyPrice: 99,
      annualPrice: 990,
      featuresText: "Single founder workspace\nGitHub + GCP\nStripe checkout",
    });

    const pricing = await getPublicPricingData();

    expect(pricing.plans.map((plan) => plan.id)).toEqual(["growth", "scale"]);
    expect(database.platformPlans.find((plan) => plan.id === "growth")).toMatchObject({
      name: "Growth Plus",
      features: [
        "Single founder workspace",
        "GitHub + GCP",
        "Stripe checkout",
      ],
    });
  });

  it("rejects platform plans that do not match the configured Stripe price-map keys", async () => {
    process.env.STRIPE_PLATFORM_PRICE_MAP_JSON = JSON.stringify({
      growth: {
        monthly: "price_monthly_growth",
        annual: "price_annual_growth",
      },
    });

    await expect(
      savePlatformPlan({
        id: "scale",
        name: "Scale",
        hidden: false,
        monthlyPrice: 199,
        annualPrice: 1990,
        featuresText: "Unlimited workspaces\nPriority support",
      }),
    ).rejects.toThrow("Missing price-map entries for: scale");
  });

  it("rejects hiding the last visible plan when staged public pricing or signup is enabled", async () => {
    database.platformPlans = [
      {
        id: "growth",
        name: "Growth",
        hidden: false,
        monthlyPrice: 99,
        annualPrice: 990,
        features: ["Single founder"],
      },
    ];
    database.globalFeatureFlags.publicSignupEnabled = true;

    await expect(
      savePlatformPlan({
        existingPlanId: "growth",
        id: "growth",
        name: "Growth",
        hidden: true,
        monthlyPrice: 99,
        annualPrice: 990,
        featuresText: "Single founder",
      }),
    ).rejects.toThrow("visible public plan");
  });

  it("rejects deleting plans that are still referenced by workspace subscriptions", async () => {
    database.platformPlans = [
      {
        id: "growth",
        name: "Growth",
        hidden: false,
        monthlyPrice: 99,
        annualPrice: 990,
        features: ["Single founder"],
      },
    ];
    database.platformSubscriptions = [
      {
        id: "subscription-1",
        workspaceId: "workspace-1",
        planId: "growth",
        status: "trial",
        source: "self-serve",
        createdAt: "2026-04-15T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
      },
    ];

    await expect(deletePlatformPlan("growth")).rejects.toThrow(
      "workspace subscriptions",
    );
  });

  it("creates a Stripe Checkout session for trial workspaces", async () => {
    process.env.MICROSAAS_FACTORY_APP_URL = "https://microsaasfactory.io";
    process.env.STRIPE_PLATFORM_SECRET_KEY = "sk_platform_123";
    process.env.STRIPE_PLATFORM_WEBHOOK_SECRET = "whsec_platform_123";
    process.env.STRIPE_PLATFORM_PRICE_MAP_JSON = JSON.stringify({
      growth: {
        monthly: "price_monthly_growth",
        annual: "price_annual_growth",
      },
    });

    database.platformPlans = [
      {
        id: "growth",
        name: "Growth",
        hidden: false,
        monthlyPrice: 99,
        annualPrice: 990,
        features: ["Single founder"],
      },
    ];
    database.globalFeatureFlags.platformBillingEnabled = true;
    database.globalFeatureFlags.checkoutEnabled = true;
    database.workspaces = [makeWorkspace()];
    database.users = [
      {
        id: "user-1",
        email: "founder@example.com",
        name: "Founder",
        workspaceId: "workspace-1",
        createdAt: "2026-04-15T12:00:00.000Z",
        lastLoginAt: "2026-04-15T12:00:00.000Z",
        lastLoginMethod: "firebase-google",
      },
    ];
    database.platformSubscriptions = [
      {
        id: "subscription-1",
        workspaceId: "workspace-1",
        planId: "growth",
        status: "trial",
        source: "self-serve",
        createdAt: "2026-04-15T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
      },
    ];

    const session = await createPlatformCheckoutSession("workspace-1", {
      planId: "growth",
      billingInterval: "monthly",
    });

    expect(createStripePlatformCheckoutSessionMock).toHaveBeenCalledWith({
      priceId: "price_monthly_growth",
      customerEmail: "founder@example.com",
      workspaceId: "workspace-1",
      planId: "growth",
      billingInterval: "monthly",
    });
    expect(session.url).toContain("checkout.stripe.com");
    expect(database.platformSubscriptions[0]).toMatchObject({
      stripeCheckoutSessionId: "cs_test_123",
      status: "trial",
    });
  });

  it("promotes invite or trial subscriptions to active after Stripe checkout completes", async () => {
    database.platformSubscriptions = [
      {
        id: "subscription-1",
        workspaceId: "workspace-1",
        planId: "beta-invite",
        status: "beta",
        source: "invite",
        createdAt: "2026-04-15T12:00:00.000Z",
        updatedAt: "2026-04-15T12:00:00.000Z",
        stripeCheckoutSessionId: "cs_test_123",
      },
    ];

    const result = await handleStripePlatformWebhook(
      JSON.stringify({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            mode: "subscription",
            customer: "cus_123",
            subscription: "sub_123",
            client_reference_id: "workspace-1",
            metadata: {
              workspaceId: "workspace-1",
              planId: "growth",
              billingInterval: "monthly",
            },
          },
        },
      }),
    );

    expect(result).toMatchObject({
      received: true,
      eventType: "checkout.session.completed",
      matchedSubscriptionCount: 1,
      updatedSubscriptionCount: 1,
    });
    expect(database.platformSubscriptions[0]).toMatchObject({
      planId: "growth",
      status: "active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      stripeCheckoutSessionId: "cs_test_123",
    });
  });

  it("refreshes stale integrations during the live ops automation run", async () => {
    database.products = [makeProduct({ stage: "build" })];
    database.integrations = [
      {
        ...makeIntegration("github"),
        metadata: {
          owner: "factory",
          repo: "microsaas-factory",
          repoFullName: "factory/microsaas-factory",
        },
        lastSyncAt: "2000-01-01T00:00:00.000Z",
      },
      {
        ...makeIntegration("stripe"),
        secret: encryptSecret("sk_test_123"),
        lastSyncAt: "2000-01-01T00:00:00.000Z",
      },
    ];

    syncStripeConnectionMock.mockResolvedValue({
      metadata: {
        productCount: 4,
        priceCount: 7,
      },
      snapshot: {
        currency: "USD",
        activeSubscriptions: 2,
        monthlyRecurringRevenue: 300,
        annualRecurringRevenue: 3600,
        productCount: 4,
      },
      secret: "sk_test_123",
    });

    const result = await runLiveOpsAutomation();
    const overview = await getAdminOverview();

    expect(result.refreshesByProvider.github).toBe(1);
    expect(result.refreshesByProvider.stripe).toBe(1);
    expect(result.refreshedIntegrationCount).toBe(2);
    expect(result.promotedTaskCount).toBe(0);
    expect(result.failedDigestCount).toBe(0);
    expect(
      database.integrations.find((entry) => entry.provider === "github")?.metadata.lastSyncSource,
    ).toBe("scheduled");
    expect(
      database.integrations.find((entry) => entry.provider === "stripe")?.metadata.lastSyncSource,
    ).toBe("scheduled");
    expect(database.automationRuns).toHaveLength(1);
    expect(database.automationRuns[0]).toMatchObject({
      kind: "live-ops",
      status: "success",
      metrics: expect.objectContaining({
        targetedIntegrationCount: 2,
        refreshedIntegrationCount: 2,
        githubRefreshCount: 1,
        stripeRefreshCount: 1,
      }),
    });
    expect(overview.automation.latestLiveOpsRun?.kind).toBe("live-ops");
    expect(overview.automation.latestValidationCrmRun).toBeNull();
    expect(overview.automation.recentRuns).toHaveLength(1);
  });
});
