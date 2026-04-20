import type {
  ProductTemplate,
  ProductTemplateId,
  ProductTemplateVersion,
} from "@/lib/types";

export const PRODUCT_TEMPLATE_VERSION: ProductTemplateVersion = 1;

const PRODUCT_TEMPLATE_CATALOG: Record<ProductTemplateId, ProductTemplate> = {
  "oee-dashboard": {
    id: "oee-dashboard",
    version: PRODUCT_TEMPLATE_VERSION,
    label: "OEE Dashboard",
    shortLabel: "OEE",
    description:
      "Operations dashboard for Availability, Performance, and Quality across plant lines.",
    defaults: {
      vertical: "Manufacturing operations",
      summary:
        "Tracks downtime, throughput, and quality loss for plant teams that need one operating view.",
      targetUser:
        "Plant manager or operations lead at a small or mid-sized manufacturer",
      pricingHypothesis: "$79-$199 per site / month",
      coreProblem:
        "Operations teams cannot see availability, performance, and quality loss in one reliable daily workflow.",
      chosenMoat: "platform-integration",
    },
    stages: {
      research: {
        idealCustomerProfile:
          "Discrete manufacturers running 1-5 lines with manual reporting or spreadsheet-based shift reviews.",
        opportunityAngles: [
          "Shift-level OEE rollups without MES complexity",
          "Downtime reason capture that supervisors will actually use",
          "Digest reporting for plant managers and continuous-improvement leads",
        ],
        pricingBand: "$79-$199 per site / month",
        moatNote:
          "The moat is workflow integration with existing plant signals and the discipline of OEE interpretation, not generic dashboards.",
      },
      validate: {
        targetBuyer: "Plant manager, operations manager, or continuous-improvement lead",
        recommendedChannels: [
          "LinkedIn outreach to plant and operations leaders",
          "Warm intros through integrators, OEM contacts, or maintenance consultants",
          "Manufacturing operations communities and SME plant-management groups",
        ],
        qualificationQuestions: [
          "How do you calculate OEE today and how often is it trusted by the floor?",
          "What is the current process for downtime reason capture and shift reporting?",
          "Who is accountable when throughput or scrap trends go unnoticed for a week?",
        ],
        goSignals: [
          "They already review downtime or scrap manually every shift or every day",
          "They can name a specific reporting delay or visibility gap",
          "They would trial the product on one line before wider rollout",
        ],
        noGoSignals: [
          "They already have an MES or BI layer they trust for OEE",
          "They do not track downtime or quality events consistently at all",
          "They treat OEE as a vanity metric rather than an operational tool",
        ],
      },
      spec: {
        v1Features: [
          "Line-level data ingestion from CSV exports or simple manual uploads",
          "Availability, Performance, and Quality rollups with daily and weekly views",
          "Downtime reason capture and top-loss reporting",
          "Email digest for shift and plant summary review",
        ],
        exclusions: [
          "No full MES replacement in v1",
          "No PLC driver marketplace or live edge-agent deployment in beta",
          "No multi-site benchmarking until one site workflow is stable",
        ],
        launchCriteria: [
          "At least one pilot line can produce a full OEE cycle from ingestion to digest",
          "Pilot users confirm downtime reason capture is usable during real shifts",
          "A plant manager can act on the weekly summary without spreadsheet cleanup",
        ],
        definitionOfDone:
          "A plant team can ingest production data, review OEE loss categories, capture downtime reasons, and receive a digest that supports one real improvement discussion each week.",
      },
      ops: {
        recommendedIntegrations: ["GitHub", "Google Cloud", "Resend", "Stripe"],
        environmentPrerequisites: [
          "A repeatable seed dataset for at least one representative production line",
          "Cloud Run deployment wired to persistent storage and scheduled digest delivery",
          "A founder-owned inbox for pilot digests and onboarding tests",
        ],
        operationalChecks: [
          "Verify daily OEE calculations against a hand-checked baseline",
          "Verify digest emails summarize the same data visible in the dashboard",
          "Verify downtime categories remain stable across imports and edits",
        ],
      },
      launch: {
        checklistStarters: [
          "Prepare a one-line pilot onboarding flow for a single line or cell",
          "Define the daily data-import responsibility before the pilot starts",
          "Create one founder-run weekly review ritual with the pilot stakeholder",
        ],
        successTargets: [
          "One paying or clearly committed pilot site",
          "At least one repeated weekly review using the product data",
          "Clear evidence that reporting time or visibility lag is reduced",
        ],
      },
    },
  },
  "construction-document-search": {
    id: "construction-document-search",
    version: PRODUCT_TEMPLATE_VERSION,
    label: "Construction Document Search",
    shortLabel: "Doc Search",
    description:
      "Project-scoped search and chat across specs, RFIs, drawings, and field documents.",
    defaults: {
      vertical: "Construction and infrastructure",
      summary:
        "Makes project documents searchable with citation-first answers across specs, RFIs, and drawings.",
      targetUser:
        "Project engineer, project manager, or estimator handling document-heavy construction workflows",
      pricingHypothesis: "$49-$149 per project / month",
      coreProblem:
        "Teams waste hours digging through specs, RFIs, and drawings to find the exact clause or document reference they need.",
      chosenMoat: "data-gravity",
    },
    stages: {
      research: {
        idealCustomerProfile:
          "Small and midsize GCs, subcontractors, or infrastructure teams with recurring document-search pain across active projects.",
        opportunityAngles: [
          "Exact clause retrieval across specs and RFIs",
          "Project-scoped document chat with citation links",
          "Faster field-question response without senior staff digging manually",
        ],
        pricingBand: "$49-$149 per project / month",
        moatNote:
          "The moat is project-specific document corpus lock-in and the trust created by citation-backed answers.",
      },
      validate: {
        targetBuyer: "Project manager, project engineer, estimator, or document-control lead",
        recommendedChannels: [
          "Direct outreach to PMs and estimators on LinkedIn",
          "Construction operations communities and subcontractor groups",
          "Pilot offers through existing contractor or consultant relationships",
        ],
        qualificationQuestions: [
          "How often do field or bid questions require searching specs or RFIs manually?",
          "Which documents create the most search friction: specs, drawings, RFIs, or submittals?",
          "What happens when the wrong clause or outdated answer gets used?",
        ],
        goSignals: [
          "They already spend multiple hours each week searching documents",
          "They care about citations and source traceability, not just AI answers",
          "They can identify a live project where faster search matters now",
        ],
        noGoSignals: [
          "Their current document system already solves retrieval well enough",
          "They only need occasional archive search, not active project workflows",
          "They do not trust cloud document upload for the target project data",
        ],
      },
      spec: {
        v1Features: [
          "Project-scoped document upload and indexing for specs, RFIs, and drawings",
          "Semantic search with citation-first answer cards",
          "Search result filtering by document type and project",
          "Saved question history for recurring project lookups",
        ],
        exclusions: [
          "No full BIM or CAD authoring workflows in v1",
          "No complex permissions matrix beyond project-level access",
          "No automated document OCR tuning workflow beyond standard ingestion",
        ],
        launchCriteria: [
          "Users can locate cited answers for at least 10 realistic project questions",
          "Search results consistently link back to the right source pages or files",
          "Pilot users prefer the product over manual folder or PDF search for live work",
        ],
        definitionOfDone:
          "A project team can upload core documents, ask natural-language questions, and get citation-backed answers quickly enough to replace manual file-hunting during active work.",
      },
      ops: {
        recommendedIntegrations: ["GitHub", "Google Cloud", "Resend", "Stripe"],
        environmentPrerequisites: [
          "A pilot document corpus with clearly separated projects",
          "Stable storage and indexing path for uploaded source files",
          "A support inbox and onboarding flow for pilot question collection",
        ],
        operationalChecks: [
          "Verify citations point to the correct document and context",
          "Verify project isolation so documents do not bleed across workspaces",
          "Verify ingestion and re-indexing times stay acceptable for pilot users",
        ],
      },
      launch: {
        checklistStarters: [
          "Prepare a canned pilot project with representative documents",
          "Define the first 10 high-value questions the pilot team cares about",
          "Set expectations around citation trust and source verification",
        ],
        successTargets: [
          "Pilot users repeatedly ask live project questions in the system",
          "Document search time is materially reduced for at least one workflow",
          "The product earns trust because answers stay source-linked",
        ],
      },
    },
  },
  "compliance-qna": {
    id: "compliance-qna",
    version: PRODUCT_TEMPLATE_VERSION,
    label: "Compliance Q&A",
    shortLabel: "Compliance",
    description:
      "Citation-backed question answering over curated compliance and safety source sets.",
    defaults: {
      vertical: "Compliance operations",
      summary:
        "Answers compliance questions with citations across curated regulatory or standards content.",
      targetUser:
        "Safety lead, compliance manager, or operations leader responsible for interpreting standards",
      pricingHypothesis: "$39-$129 per team / month",
      coreProblem:
        "Teams need fast answers to compliance questions but cannot rely on uncited AI output or ad hoc manual interpretation.",
      chosenMoat: "domain-expertise",
    },
    stages: {
      research: {
        idealCustomerProfile:
          "Teams that repeatedly interpret the same safety, standards, or regulatory documents but lack a fast internal answer workflow.",
        opportunityAngles: [
          "Citation-backed answers over curated source sets",
          "Faster first-pass guidance for internal safety or compliance teams",
          "Repeatable knowledge base for standards updates and recurring training questions",
        ],
        pricingBand: "$39-$129 per team / month",
        moatNote:
          "The moat is trusted domain framing and curated source quality, not generic chat output.",
      },
      validate: {
        targetBuyer: "Compliance manager, safety manager, or operations lead",
        recommendedChannels: [
          "Targeted outreach to safety and compliance professionals",
          "Vertical communities focused on OSHA, NEC, NFPA, or internal policy operations",
          "Pilot offers tied to one narrow standards set rather than every regulation at once",
        ],
        qualificationQuestions: [
          "Which standards or policies create the most recurring interpretation work?",
          "How do you answer repeat questions today and how long does it take?",
          "What would make an AI-assisted answer trustworthy enough to use internally?",
        ],
        goSignals: [
          "They repeatedly answer the same documented compliance questions",
          "They need citations or source excerpts, not just summaries",
          "They are willing to start with one curated source set",
        ],
        noGoSignals: [
          "They expect the tool to replace legal counsel or formal certification workflows",
          "They do not have a stable document source set to start from",
          "They need heavy case-management or workflow approval features immediately",
        ],
      },
      spec: {
        v1Features: [
          "Curated source-set upload and indexing",
          "Question answering with citations and source references",
          "Source-set scoping by standards family or policy pack",
          "Basic answer history for recurring operational questions",
        ],
        exclusions: [
          "No legal advice positioning in v1",
          "No automated policy authoring or approval workflow",
          "No promise of jurisdiction-wide completeness beyond the loaded source set",
        ],
        launchCriteria: [
          "Users can answer recurring questions with citations from the approved source set",
          "Pilot users trust the answer workflow for first-pass internal guidance",
          "The system reduces repeated manual document lookup for the target team",
        ],
        definitionOfDone:
          "A team can load a narrow compliance corpus, ask recurring operational questions, and receive cited answers that accelerate internal review without pretending to replace formal expert judgment.",
      },
      ops: {
        recommendedIntegrations: ["GitHub", "Google Cloud", "Resend", "Stripe"],
        environmentPrerequisites: [
          "A clearly bounded initial source corpus with update ownership",
          "A documented disclaimer and positioning model for internal guidance use",
          "Pilot onboarding that explains source scope and citation expectations",
        ],
        operationalChecks: [
          "Verify answers never appear without source citations",
          "Verify outdated or superseded source sets can be refreshed cleanly",
          "Verify the onboarding sequence teaches safe usage boundaries",
        ],
      },
      launch: {
        checklistStarters: [
          "Start with one narrow standards pack rather than a broad compliance promise",
          "Document the product boundary so users know it is guidance, not legal advice",
          "Collect the top recurring questions before broadening the corpus",
        ],
        successTargets: [
          "Pilot users repeatedly return for the same class of questions",
          "Citations are trusted enough to reduce manual lookup time",
          "The first source pack earns a clear renewal or expansion signal",
        ],
      },
    },
  },
};

export function listProductTemplates() {
  return Object.values(PRODUCT_TEMPLATE_CATALOG);
}

export function isProductTemplateId(value: string): value is ProductTemplateId {
  return value in PRODUCT_TEMPLATE_CATALOG;
}

export function parseProductTemplateId(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (!isProductTemplateId(trimmed)) {
    throw new Error("Invalid product template.");
  }

  return trimmed;
}

export function getProductTemplate(templateId?: ProductTemplateId | null) {
  if (!templateId) {
    return null;
  }

  return PRODUCT_TEMPLATE_CATALOG[templateId] ?? null;
}
