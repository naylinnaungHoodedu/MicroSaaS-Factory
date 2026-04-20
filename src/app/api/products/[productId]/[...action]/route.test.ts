import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addOpportunityMock: vi.fn(),
  addValidationLeadMock: vi.fn(),
  archiveProductMock: vi.fn(),
  cloneProductMock: vi.fn(),
  connectGcpMock: vi.fn(),
  connectGithubMock: vi.fn(),
  connectResendMock: vi.fn(),
  connectStripeMock: vi.fn(),
  refreshGcpConnectionMock: vi.fn(),
  refreshGithubConnectionMock: vi.fn(),
  refreshResendConnectionMock: vi.fn(),
  refreshStripeConnectionMock: vi.fn(),
  createValidationSessionMock: vi.fn(),
  createValidationTaskMock: vi.fn(),
  evaluateLaunchGateMock: vi.fn(),
  generateLaunchChecklistMock: vi.fn(),
  generateOpportunityReadoutMock: vi.fn(),
  generateSpecDocumentMock: vi.fn(),
  getFounderContextMock: vi.fn(),
  logValidationTouchpointMock: vi.fn(),
  resolveAiGenerationModeMock: vi.fn(),
  saveBuildSheetMock: vi.fn(),
  saveSpecDocumentMock: vi.fn(),
  sendOnboardingTestEmailMock: vi.fn(),
  restoreProductMock: vi.fn(),
  updateProductDetailsMock: vi.fn(),
  updateValidationTaskStateMock: vi.fn(),
  updateEmailSequenceMock: vi.fn(),
  updateProductLaunchStateMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  getFounderContext: mocks.getFounderContextMock,
}));

vi.mock("@/lib/server/services", () => ({
  addOpportunity: mocks.addOpportunityMock,
  addValidationLead: mocks.addValidationLeadMock,
  archiveProduct: mocks.archiveProductMock,
  cloneProduct: mocks.cloneProductMock,
  connectGcp: mocks.connectGcpMock,
  connectGithub: mocks.connectGithubMock,
  connectResend: mocks.connectResendMock,
  connectStripe: mocks.connectStripeMock,
  createValidationSession: mocks.createValidationSessionMock,
  createValidationTask: mocks.createValidationTaskMock,
  evaluateLaunchGate: mocks.evaluateLaunchGateMock,
  refreshGcpConnection: mocks.refreshGcpConnectionMock,
  refreshGithubConnection: mocks.refreshGithubConnectionMock,
  refreshResendConnection: mocks.refreshResendConnectionMock,
  refreshStripeConnection: mocks.refreshStripeConnectionMock,
  generateLaunchChecklist: mocks.generateLaunchChecklistMock,
  generateOpportunityReadout: mocks.generateOpportunityReadoutMock,
  generateSpecDocument: mocks.generateSpecDocumentMock,
  logValidationTouchpoint: mocks.logValidationTouchpointMock,
  resolveAiGenerationMode: mocks.resolveAiGenerationModeMock,
  saveBuildSheet: mocks.saveBuildSheetMock,
  saveSpecDocument: mocks.saveSpecDocumentMock,
  sendOnboardingTestEmail: mocks.sendOnboardingTestEmailMock,
  restoreProduct: mocks.restoreProductMock,
  updateProductDetails: mocks.updateProductDetailsMock,
  updateValidationTaskState: mocks.updateValidationTaskStateMock,
  updateEmailSequence: mocks.updateEmailSequenceMock,
  updateProductLaunchState: mocks.updateProductLaunchStateMock,
}));

import { POST } from "./route";

describe("POST /api/products/[productId]/[...action]", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getFounderContextMock.mockResolvedValue({
      workspace: { id: "workspace-1" },
    });
    mocks.resolveAiGenerationModeMock.mockResolvedValue("flash");
  });

  it("returns 401 when the founder is not authenticated", async () => {
    mocks.getFounderContextMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/products/product-1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["opportunities"] }) },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required.",
    });
  });

  it("updates top-level product details", async () => {
    mocks.updateProductDetailsMock.mockResolvedValue({ id: "product-1", name: "Factory Ops Hub" });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Factory Ops Hub",
          summary: "Portfolio control lane",
          vertical: "B2B SaaS",
          pricingHypothesis: "$79/month",
          targetUser: "Solo founder",
          coreProblem: "Product work is fragmented",
          chosenMoat: "workflow-specificity",
          templateId: "oee-dashboard",
        }),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["details"] }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateProductDetailsMock).toHaveBeenCalledWith("workspace-1", "product-1", {
      name: "Factory Ops Hub",
      summary: "Portfolio control lane",
      vertical: "B2B SaaS",
      pricingHypothesis: "$79/month",
      targetUser: "Solo founder",
      coreProblem: "Product work is fragmented",
      chosenMoat: "workflow-specificity",
      templateId: "oee-dashboard",
    });
    expect(await response.json()).toEqual({
      product: {
        id: "product-1",
        name: "Factory Ops Hub",
      },
    });
  });

  it("archives, restores, and clones products", async () => {
    mocks.archiveProductMock.mockResolvedValue({ id: "product-1", archivedAt: "2026-04-17T12:00:00.000Z" });
    mocks.restoreProductMock.mockResolvedValue({ id: "product-1", archivedAt: undefined });
    mocks.cloneProductMock.mockResolvedValue({ id: "product-2", name: "Copy of Factory Ops Hub" });

    const archiveResponse = await POST(
      new Request("http://localhost/api/products/product-1/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archivedReason: "Merged into another lane",
        }),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["archive"] }) },
    );
    const restoreResponse = await POST(
      new Request("http://localhost/api/products/product-1/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["restore"] }) },
    );
    const cloneResponse = await POST(
      new Request("http://localhost/api/products/product-1/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["clone"] }) },
    );

    expect(archiveResponse.status).toBe(200);
    expect(mocks.archiveProductMock).toHaveBeenCalledWith("workspace-1", "product-1", {
      reason: "Merged into another lane",
    });
    expect(await archiveResponse.json()).toEqual({
      product: {
        id: "product-1",
        archivedAt: "2026-04-17T12:00:00.000Z",
      },
    });

    expect(restoreResponse.status).toBe(200);
    expect(mocks.restoreProductMock).toHaveBeenCalledWith("workspace-1", "product-1");
    expect(await restoreResponse.json()).toEqual({
      product: {
        id: "product-1",
      },
    });

    expect(cloneResponse.status).toBe(200);
    expect(mocks.cloneProductMock).toHaveBeenCalledWith("workspace-1", "product-1");
    expect(await cloneResponse.json()).toEqual({
      product: {
        id: "product-2",
        name: "Copy of Factory Ops Hub",
      },
    });
  });

  it("returns archived-state errors across workflow mutation routes", async () => {
    const archivedError = new Error(
      "Archived products are read-only. Restore the product before making workflow changes.",
    );
    mocks.addOpportunityMock.mockRejectedValue(archivedError);
    mocks.addValidationLeadMock.mockRejectedValue(archivedError);
    mocks.saveSpecDocumentMock.mockRejectedValue(archivedError);
    mocks.saveBuildSheetMock.mockRejectedValue(archivedError);
    mocks.connectGithubMock.mockRejectedValue(archivedError);
    mocks.updateProductLaunchStateMock.mockRejectedValue(archivedError);

    const requests = [
      POST(
        new Request("http://localhost/api/products/product-1/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ productId: "product-1", action: ["opportunities"] }) },
      ),
      POST(
        new Request("http://localhost/api/products/product-1/validation/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ productId: "product-1", action: ["validation", "leads"] }) },
      ),
      POST(
        new Request("http://localhost/api/products/product-1/spec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ productId: "product-1", action: ["spec"] }) },
      ),
      POST(
        new Request("http://localhost/api/products/product-1/build-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ productId: "product-1", action: ["build-state"] }) },
      ),
      POST(
        new Request("http://localhost/api/products/product-1/integrations/github/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: "factory", repo: "factory-app" }),
        }),
        {
          params: Promise.resolve({
            productId: "product-1",
            action: ["integrations", "github", "install"],
          }),
        },
      ),
      POST(
        new Request("http://localhost/api/products/product-1/launch-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ productId: "product-1", action: ["launch-state"] }) },
      ),
    ];

    const responses = await Promise.all(requests);

    for (const response of responses) {
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: archivedError.message,
      });
    }
  });

  it("creates an opportunity entry", async () => {
    mocks.addOpportunityMock.mockResolvedValue({ id: "opportunity-1" });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Alarm review workflow",
          audience: "Plant managers",
          painStatement: "Alarm review is slow and noisy.",
          complaintFrequency: 4,
          painSeverity: 5,
          willingnessToPay: 4,
          competitionCount: 6,
          pricingPowerEstimate: "$99/month",
          moatType: "domain-expertise",
          notes: "Promising niche.",
        }),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["opportunities"] }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.addOpportunityMock).toHaveBeenCalledWith("workspace-1", "product-1", {
      title: "Alarm review workflow",
      audience: "Plant managers",
      painStatement: "Alarm review is slow and noisy.",
      complaintFrequency: 4,
      painSeverity: 5,
      willingnessToPay: 4,
      competitionCount: 6,
      pricingPowerEstimate: "$99/month",
      moatType: "domain-expertise",
      notes: "Promising niche.",
    });
    expect(await response.json()).toEqual({
      opportunity: {
        id: "opportunity-1",
      },
    });
  });

  it("logs a validation touchpoint", async () => {
    mocks.logValidationTouchpointMock.mockResolvedValue({
      touchpoint: { id: "touchpoint-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/validation/leads/lead-1/touchpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "demo",
          outcome: "booked",
          summary: "Booked a discovery demo.",
          status: "enthusiastic",
          nextFollowUpOn: "2026-04-20",
          willingToPay: true,
          demoBooked: true,
          reservationPlaced: false,
        }),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["validation", "leads", "lead-1", "touchpoints"],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.logValidationTouchpointMock).toHaveBeenCalledWith(
      "workspace-1",
      "product-1",
      "lead-1",
      {
        type: "demo",
        outcome: "booked",
        summary: "Booked a discovery demo.",
        status: "enthusiastic",
        nextFollowUpOn: "2026-04-20",
        willingToPay: true,
        demoBooked: true,
        reservationPlaced: false,
      },
    );
    expect(await response.json()).toEqual({
      touchpoint: {
        id: "touchpoint-1",
      },
    });
  });

  it("captures a validation session from upload metadata", async () => {
    mocks.createValidationSessionMock.mockResolvedValue({ id: "session-1" });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/validation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: "lead-1",
          sourceMode: "upload",
          channel: "call",
          context: "Discovery call",
          transcriptText: "Transcript body",
          uploadName: "discovery.txt",
          uploadContentType: "text/plain",
          uploadSizeBytes: 128,
          useProModel: true,
        }),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["validation", "sessions"],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.resolveAiGenerationModeMock).toHaveBeenCalledWith(true);
    expect(mocks.createValidationSessionMock).toHaveBeenCalledWith("workspace-1", "product-1", {
      leadId: "lead-1",
      sourceMode: "upload",
      channel: "call",
      context: "Discovery call",
      transcriptText: "Transcript body",
      upload: {
        fileName: "discovery.txt",
        contentType: "text/plain",
        sizeBytes: 128,
      },
      aiMode: "flash",
    });
    expect(await response.json()).toEqual({
      session: {
        id: "session-1",
      },
    });
  });

  it("creates a founder validation task", async () => {
    mocks.createValidationTaskMock.mockResolvedValue({ id: "task-1" });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/validation/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: "lead-1",
          sessionId: "session-1",
          type: "follow-up",
          title: "Send recap",
          notes: "Share next steps.",
          dueOn: "2026-04-20",
        }),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["validation", "tasks"],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.createValidationTaskMock).toHaveBeenCalledWith("workspace-1", "product-1", {
      leadId: "lead-1",
      sessionId: "session-1",
      type: "follow-up",
      title: "Send recap",
      notes: "Share next steps.",
      dueOn: "2026-04-20",
    });
    expect(await response.json()).toEqual({
      task: {
        id: "task-1",
      },
    });
  });

  it("updates a validation task state", async () => {
    mocks.updateValidationTaskStateMock.mockResolvedValue({
      task: { id: "task-1", state: "done" },
      productId: "product-1",
    });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/validation/tasks/task-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
        }),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["validation", "tasks", "task-1"],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateValidationTaskStateMock).toHaveBeenCalledWith(
      "workspace-1",
      "task-1",
      {
        action: "complete",
        snoozeUntil: undefined,
      },
    );
    expect(await response.json()).toEqual({
      task: {
        id: "task-1",
        state: "done",
      },
      productId: "product-1",
    });
  });

  it("saves the one-page spec", async () => {
    mocks.saveSpecDocumentMock.mockResolvedValue({ productId: "product-1" });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUser: "Solo founder",
          problem: "Disconnected workflows",
          v1FeaturesText: "Research\nValidation\nLaunch",
          exclusionsText: "No public signup",
          pricingHypothesis: "$49/month",
          launchCriteriaText: "3 enthusiastic yes\nIntegrations connected",
          definitionOfDone: "Core loop works end to end.",
        }),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["spec"] }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.saveSpecDocumentMock).toHaveBeenCalledWith("workspace-1", "product-1", {
      targetUser: "Solo founder",
      problem: "Disconnected workflows",
      v1FeaturesText: "Research\nValidation\nLaunch",
      exclusionsText: "No public signup",
      pricingHypothesis: "$49/month",
      launchCriteriaText: "3 enthusiastic yes\nIntegrations connected",
      definitionOfDone: "Core loop works end to end.",
    });
    expect(await response.json()).toEqual({
      spec: {
        productId: "product-1",
      },
    });
  });

  it("saves build release-control state", async () => {
    mocks.saveBuildSheetMock.mockResolvedValue({ productId: "product-1" });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/build-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseGoal: "Ship beta",
          shipChecklistText: "Smoke test\nDeploy",
          blockersText: "Need final copy",
          notes: "Founder dry-run pending.",
          targetReleaseOn: "2026-04-20",
        }),
      }),
      { params: Promise.resolve({ productId: "product-1", action: ["build-state"] }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.saveBuildSheetMock).toHaveBeenCalledWith("workspace-1", "product-1", {
      releaseGoal: "Ship beta",
      shipChecklistText: "Smoke test\nDeploy",
      blockersText: "Need final copy",
      notes: "Founder dry-run pending.",
      targetReleaseOn: "2026-04-20",
    });
    expect(await response.json()).toEqual({
      buildSheet: {
        productId: "product-1",
      },
    });
  });

  it("refreshes saved provider connections", async () => {
    mocks.refreshGithubConnectionMock.mockResolvedValue({ id: "github-1" });
    mocks.refreshGcpConnectionMock.mockResolvedValue({ id: "gcp-1" });
    mocks.refreshStripeConnectionMock.mockResolvedValue({ id: "stripe-1" });
    mocks.refreshResendConnectionMock.mockResolvedValue({ id: "resend-1" });

    const githubResponse = await POST(
      new Request("http://localhost/api/products/product-1/integrations/github/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["integrations", "github", "refresh"],
        }),
      },
    );
    const gcpResponse = await POST(
      new Request("http://localhost/api/products/product-1/integrations/gcp/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["integrations", "gcp", "refresh"],
        }),
      },
    );
    const stripeResponse = await POST(
      new Request("http://localhost/api/products/product-1/integrations/stripe/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["integrations", "stripe", "refresh"],
        }),
      },
    );
    const resendResponse = await POST(
      new Request("http://localhost/api/products/product-1/integrations/resend/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["integrations", "resend", "refresh"],
        }),
      },
    );

    expect(githubResponse.status).toBe(200);
    expect(gcpResponse.status).toBe(200);
    expect(stripeResponse.status).toBe(200);
    expect(resendResponse.status).toBe(200);
    expect(mocks.refreshGithubConnectionMock).toHaveBeenCalledWith("workspace-1", "product-1");
    expect(mocks.refreshGcpConnectionMock).toHaveBeenCalledWith("workspace-1", "product-1");
    expect(mocks.refreshStripeConnectionMock).toHaveBeenCalledWith("workspace-1", "product-1");
    expect(mocks.refreshResendConnectionMock).toHaveBeenCalledWith("workspace-1", "product-1");
  });

  it("evaluates the launch gate", async () => {
    mocks.evaluateLaunchGateMock.mockResolvedValue({ passed: true });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/launch-gate/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["launch-gate", "evaluate"],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.evaluateLaunchGateMock).toHaveBeenCalledWith("workspace-1", "product-1");
    expect(await response.json()).toEqual({
      gate: {
        passed: true,
      },
    });
  });

  it("downgrades AI generation to flash when Pro is not enabled", async () => {
    mocks.generateOpportunityReadoutMock.mockResolvedValue({ id: "opportunity-1" });

    const response = await POST(
      new Request("http://localhost/api/products/product-1/opportunities/opportunity-1/ai-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useProModel: true }),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["opportunities", "opportunity-1", "ai-score"],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.resolveAiGenerationModeMock).toHaveBeenCalledWith(true);
    expect(mocks.generateOpportunityReadoutMock).toHaveBeenCalledWith(
      "workspace-1",
      "product-1",
      "opportunity-1",
      "flash",
    );
  });

  it("returns 404 for unsupported product action paths", async () => {
    const response = await POST(
      new Request("http://localhost/api/products/product-1/not-implemented", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({
          productId: "product-1",
          action: ["not-implemented"],
        }),
      },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Route not implemented.",
    });
  });
});
