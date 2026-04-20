import { describe, expect, it } from "vitest";

import { DEFAULT_FEATURE_FLAGS } from "@/lib/constants";
import {
  appendActivityEvent,
  computeValidationOutreachSummary,
  computeValidationDecision,
  evaluateReadyForNextProduct,
  isSpecComplete,
  listProductActivityEvents,
  listWorkspaceActivityEvents,
  scoreOpportunity,
} from "@/lib/server/services";
import type {
  ActivityEvent,
  DatabaseShape,
  EmailSequence,
  Product,
  ValidationLead,
  ValidationTouchpoint,
} from "@/lib/types";

function makeLead(overrides: Partial<ValidationLead>): ValidationLead {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTouchpoint(overrides: Partial<ValidationTouchpoint>): ValidationTouchpoint {
  return {
    id: crypto.randomUUID(),
    productId: "product-1",
    leadId: "lead-1",
    type: "dm",
    outcome: "sent",
    summary: "Initial outreach sent.",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product>): Product {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSequence(): EmailSequence {
  return {
    id: "seq-1",
    productId: "product-1",
    senderEmail: "noreply@example.com",
    status: "connected",
    updatedAt: new Date().toISOString(),
    items: [
      { key: "day-0", day: 0, title: "Welcome", subject: "Welcome", body: "Body" },
      { key: "day-1", day: 1, title: "Nudge", subject: "Nudge", body: "Body" },
      { key: "day-3", day: 3, title: "Case study", subject: "Case", body: "Body" },
      { key: "day-7", day: 7, title: "Upgrade", subject: "Upgrade", body: "Body" },
      { key: "day-14", day: 14, title: "Survey", subject: "Survey", body: "Body" },
    ],
  };
}

function makeActivityEvent(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: crypto.randomUUID(),
    workspaceId: "workspace-1",
    productId: "product-1",
    category: "product",
    kind: "product_created",
    source: "founder",
    title: "Created product",
    detail: "Created a product lane.",
    createdAt: new Date().toISOString(),
    metadata: {},
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
    workspaces: [],
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
    globalFeatureFlags: DEFAULT_FEATURE_FLAGS,
  };
}

describe("scoreOpportunity", () => {
  it("rewards sweet-spot competition and strong willingness to pay", () => {
    const score = scoreOpportunity({
      competitionCount: 7,
      complaintFrequency: 4,
      painSeverity: 5,
      willingnessToPay: 5,
      moatType: "domain-expertise",
    });

    expect(score.totalScore).toBeGreaterThanOrEqual(45);
    expect(score.thesis).toContain("Validated demand");
  });
});

describe("computeValidationDecision", () => {
  it("requires both 10 total leads and 3 enthusiastic yes signals", () => {
    const leads = [
      ...Array.from({ length: 3 }, (_, index) =>
        makeLead({
          id: `enthusiastic-${index}`,
          status: "enthusiastic",
          willingToPay: true,
          demoBooked: true,
        }),
      ),
      ...Array.from({ length: 7 }, (_, index) =>
        makeLead({
          id: `lead-${index}`,
          status: "contacted",
        }),
      ),
    ];

    const result = computeValidationDecision("product-1", leads);

    expect(result.totalLeads).toBe(10);
    expect(result.enthusiasticYesCount).toBe(3);
    expect(result.hasMetThreshold).toBe(true);
  });
});

describe("computeValidationOutreachSummary", () => {
  it("tracks response rate, due follow-ups, and silent leads", () => {
    const now = new Date().toISOString();
    const leads = [
      makeLead({
        id: "lead-1",
        status: "contacted",
        nextFollowUpAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }),
      makeLead({
        id: "lead-2",
        status: "enthusiastic",
      }),
      makeLead({
        id: "lead-3",
        status: "queued",
      }),
    ];
    const touchpoints = [
      makeTouchpoint({
        id: "touch-1",
        leadId: "lead-1",
        outcome: "sent",
        createdAt: now,
      }),
      makeTouchpoint({
        id: "touch-2",
        leadId: "lead-2",
        outcome: "positive",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      }),
    ];

    const result = computeValidationOutreachSummary(leads, touchpoints);

    expect(result.totalTouchpoints).toBe(2);
    expect(result.contactedLeadCount).toBe(2);
    expect(result.repliedLeadCount).toBe(1);
    expect(result.positiveLeadCount).toBe(1);
    expect(result.followUpsDueCount).toBe(1);
    expect(result.noResponseLeadCount).toBe(1);
    expect(result.responseRate).toBe(50);
    expect(result.contactCoverageRate).toBeCloseTo(66.666, 2);
    expect(result.lastTouchpointAt).toBe(now);
  });
});

describe("isSpecComplete", () => {
  it("fails incomplete specs and passes complete ones", () => {
    expect(
      isSpecComplete({
        productId: "product-1",
        targetUser: "Founder",
        problem: "",
        v1Features: ["One", "Two"],
        exclusions: [],
        pricingHypothesis: "",
        launchCriteria: [],
        definitionOfDone: "",
        updatedAt: new Date().toISOString(),
      }),
    ).toBe(false);

    expect(
      isSpecComplete({
        productId: "product-1",
        targetUser: "Founder",
        problem: "A real pain point",
        v1Features: ["One", "Two", "Three"],
        exclusions: ["No public signup"],
        pricingHypothesis: "$49/month",
        launchCriteria: ["3 enthusiastic yes responses", "Integrations connected"],
        definitionOfDone: "Core loop works end to end.",
        updatedAt: new Date().toISOString(),
      }),
    ).toBe(true);
  });
});

describe("evaluateReadyForNextProduct", () => {
  it("requires stable metrics and an onboarding sequence", () => {
    expect(evaluateReadyForNextProduct(makeProduct({}), makeSequence())).toBe(true);
    expect(
      evaluateReadyForNextProduct(
        makeProduct({
          metrics: {
            monthlyRecurringRevenue: 300,
            monthlyChurnRate: 9,
            supportHoursPerWeek: 4,
            activeP1Bugs: 1,
          },
        }),
        null,
      ),
    ).toBe(false);
  });
});

describe("appendActivityEvent", () => {
  it("adds a persisted activity event with metadata defaults", () => {
    const database = makeDatabase();
    const event = appendActivityEvent(database, {
      workspaceId: "workspace-1",
      productId: "product-1",
      category: "research",
      kind: "opportunity_created",
      source: "founder",
      title: "Added opportunity",
      detail: "Saved a new research entry.",
    });

    expect(database.activityEvents).toHaveLength(1);
    expect(database.activityEvents[0]).toEqual(event);
    expect(event.metadata).toEqual({});
  });
});

describe("activity queries", () => {
  it("returns newest workspace events first and enforces the limit", () => {
    const events = Array.from({ length: 25 }, (_, index) =>
      makeActivityEvent({
        id: `event-${index}`,
        workspaceId: "workspace-1",
        productId: `product-${index}`,
        createdAt: `2026-04-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
      }),
    );

    const result = listWorkspaceActivityEvents(events, "workspace-1", 20);

    expect(result).toHaveLength(20);
    expect(result[0]?.id).toBe("event-24");
    expect(result.at(-1)?.id).toBe("event-5");
  });

  it("filters product events to one product within the workspace", () => {
    const events = [
      makeActivityEvent({
        id: "match-new",
        workspaceId: "workspace-1",
        productId: "product-1",
        createdAt: "2026-04-15T13:00:00.000Z",
      }),
      makeActivityEvent({
        id: "other-product",
        workspaceId: "workspace-1",
        productId: "product-2",
        createdAt: "2026-04-15T12:00:00.000Z",
      }),
      makeActivityEvent({
        id: "other-workspace",
        workspaceId: "workspace-2",
        productId: "product-1",
        createdAt: "2026-04-15T11:00:00.000Z",
      }),
      makeActivityEvent({
        id: "match-old",
        workspaceId: "workspace-1",
        productId: "product-1",
        createdAt: "2026-04-15T10:00:00.000Z",
      }),
    ];

    const result = listProductActivityEvents(events, "workspace-1", "product-1", 15);

    expect(result.map((event) => event.id)).toEqual(["match-new", "match-old"]);
  });
});
