export type ProductStage =
  | "research"
  | "validate"
  | "spec"
  | "build"
  | "launch"
  | "stabilize";

export type IntegrationProvider = "github" | "gcp" | "stripe" | "resend";

export type ConnectionStatus = "not_connected" | "pending" | "connected" | "error";

export type IntegrationSyncSource = "manual" | "webhook" | "scheduled";

export type ValidationLeadStatus =
  | "queued"
  | "contacted"
  | "interested"
  | "enthusiastic"
  | "declined";

export type ValidationTouchpointType =
  | "dm"
  | "email"
  | "call"
  | "follow-up"
  | "demo"
  | "reservation";

export type ValidationTouchpointOutcome =
  | "sent"
  | "replied"
  | "positive"
  | "booked"
  | "declined"
  | "no-response";

export type ValidationSessionSourceMode = "paste" | "upload";

export type ValidationSessionChannel =
  | "call"
  | "demo"
  | "email"
  | "dm"
  | "follow-up"
  | "other";

export type ValidationSessionAnalysisStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type ValidationTaskType = "email" | "dm" | "call" | "follow-up";

export type ValidationTaskState =
  | "queued"
  | "due"
  | "snoozed"
  | "done"
  | "canceled";

export type ValidationTaskSource = "manual" | "ai" | "session-analysis";

export type MoatType =
  | "domain-expertise"
  | "data-gravity"
  | "workflow-specificity"
  | "platform-integration";

export type ProductTemplateId =
  | "oee-dashboard"
  | "construction-document-search"
  | "compliance-qna";

export type ProductTemplateVersion = 1;

export type FeatureFlags = {
  inviteOnlyBeta: boolean;
  publicWaitlist: boolean;
  publicSignupEnabled: boolean;
  selfServeProvisioningEnabled: boolean;
  checkoutEnabled: boolean;
  platformBillingEnabled: boolean;
  proAiEnabled: boolean;
};

export type WaitlistRequest = {
  id: string;
  name: string;
  email: string;
  challenge: string;
  notes: string;
  createdAt: string;
  status: "pending" | "invited";
};

export type SignupIntentStatus =
  | "pending_activation"
  | "invited"
  | "provisioned"
  | "payment_pending";

export type SignupIntent = {
  id: string;
  founderName: string;
  email: string;
  workspaceName: string;
  planId: string;
  createdAt: string;
  status: SignupIntentStatus;
  workspaceId?: string;
  userId?: string;
  activatedAt?: string;
};

export type Invite = {
  id: string;
  token: string;
  email: string;
  workspaceName: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  createdAt: string;
  lastLoginAt?: string;
  lastLoginMethod?: "invite-token" | "firebase-google" | "firebase-email-link";
};

export type Session = {
  id: string;
  userId?: string;
  kind: "founder" | "admin";
  createdAt: string;
  expiresAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: string;
  featureFlags: FeatureFlags;
};

export type ProductMetrics = {
  monthlyRecurringRevenue: number;
  monthlyChurnRate: number;
  supportHoursPerWeek: number;
  activeP1Bugs: number;
};

export type Product = {
  id: string;
  workspaceId: string;
  name: string;
  summary: string;
  vertical: string;
  stage: ProductStage;
  pricingHypothesis: string;
  targetUser: string;
  coreProblem: string;
  chosenMoat: MoatType;
  templateId?: ProductTemplateId;
  templateVersion?: ProductTemplateVersion;
  criticalBlockers: string[];
  launchChecklist: string[];
  metrics: ProductMetrics;
  archivedAt?: string;
  archivedReason?: string;
  clonedFromProductId?: string;
  createdAt: string;
  updatedAt: string;
};

export type BuildSheet = {
  productId: string;
  releaseGoal: string;
  shipChecklist: string[];
  blockers: string[];
  notes: string;
  targetReleaseAt?: string;
  updatedAt: string;
};

export type ProductTemplateDefaults = {
  vertical: string;
  summary: string;
  targetUser: string;
  pricingHypothesis: string;
  coreProblem: string;
  chosenMoat: MoatType;
};

export type ProductTemplateResearchStage = {
  idealCustomerProfile: string;
  opportunityAngles: string[];
  pricingBand: string;
  moatNote: string;
};

export type ProductTemplateValidateStage = {
  targetBuyer: string;
  recommendedChannels: string[];
  qualificationQuestions: string[];
  goSignals: string[];
  noGoSignals: string[];
};

export type ProductTemplateSpecStage = {
  v1Features: string[];
  exclusions: string[];
  launchCriteria: string[];
  definitionOfDone: string;
};

export type ProductTemplateOpsStage = {
  recommendedIntegrations: string[];
  environmentPrerequisites: string[];
  operationalChecks: string[];
};

export type ProductTemplateLaunchStage = {
  checklistStarters: string[];
  successTargets: string[];
};

export type ProductTemplateStages = {
  research: ProductTemplateResearchStage;
  validate: ProductTemplateValidateStage;
  spec: ProductTemplateSpecStage;
  ops: ProductTemplateOpsStage;
  launch: ProductTemplateLaunchStage;
};

export type ProductTemplate = {
  id: ProductTemplateId;
  version: ProductTemplateVersion;
  label: string;
  shortLabel: string;
  description: string;
  defaults: ProductTemplateDefaults;
  stages: ProductTemplateStages;
};

export type OpportunityScore = {
  painScore: number;
  competitionScore: number;
  pricingPowerScore: number;
  founderFitScore: number;
  moatScore: number;
  totalScore: number;
  thesis: string;
  aiRecommendation?: string;
};

export type Opportunity = {
  id: string;
  productId: string;
  title: string;
  audience: string;
  painStatement: string;
  complaintFrequency: number;
  painSeverity: number;
  willingnessToPay: number;
  competitionCount: number;
  pricingPowerEstimate: string;
  moatType: MoatType;
  notes: string;
  createdAt: string;
  updatedAt: string;
  score: OpportunityScore;
};

export type ValidationLead = {
  id: string;
  productId: string;
  name: string;
  email: string;
  company: string;
  role: string;
  channel: string;
  status: ValidationLeadStatus;
  willingToPay: boolean;
  demoBooked: boolean;
  reservationPlaced: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  lastResponseAt?: string;
  nextFollowUpAt?: string;
};

export type ValidationDecision = {
  productId: string;
  totalLeads: number;
  enthusiasticYesCount: number;
  hasMetThreshold: boolean;
  summary: string;
};

export type ValidationTouchpoint = {
  id: string;
  productId: string;
  leadId: string;
  type: ValidationTouchpointType;
  outcome: ValidationTouchpointOutcome;
  summary: string;
  createdAt: string;
  nextFollowUpAt?: string;
};

export type ValidationOutreachSummary = {
  totalTouchpoints: number;
  contactedLeadCount: number;
  repliedLeadCount: number;
  positiveLeadCount: number;
  followUpsDueCount: number;
  noResponseLeadCount: number;
  responseRate: number;
  contactCoverageRate: number;
  lastTouchpointAt?: string;
};

export type ValidationSessionUploadMetadata = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type ValidationSessionAnalysis = {
  summary: string;
  objections: string[];
  painPoints: string[];
  buyingSignals: string[];
  sentiment: "negative" | "mixed" | "positive";
  stageAssessment: ValidationLeadStatus;
  recommendedNextActions: string[];
};

export type ValidationSession = {
  id: string;
  productId: string;
  leadId?: string;
  sourceMode: ValidationSessionSourceMode;
  channel: ValidationSessionChannel;
  context: string;
  transcriptText: string;
  upload?: ValidationSessionUploadMetadata;
  createdAt: string;
  updatedAt: string;
  analysisStatus: ValidationSessionAnalysisStatus;
  analysisAttempts: number;
  nextAnalysisAttemptAt?: string;
  lastAnalyzedAt?: string;
  lastAnalysisError?: string;
  analysis?: ValidationSessionAnalysis;
  generatedTaskIds: string[];
};

export type ValidationTask = {
  id: string;
  productId: string;
  leadId?: string;
  sessionId?: string;
  type: ValidationTaskType;
  title: string;
  notes: string;
  state: ValidationTaskState;
  source: ValidationTaskSource;
  dueAt?: string;
  snoozedUntil?: string;
  completedAt?: string;
  canceledAt?: string;
  lastReminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SpecDocument = {
  productId: string;
  targetUser: string;
  problem: string;
  v1Features: string[];
  exclusions: string[];
  pricingHypothesis: string;
  launchCriteria: string[];
  definitionOfDone: string;
  lastGeneratedAt?: string;
  approvedAt?: string;
  updatedAt: string;
};

export type IntegrationConnection = {
  id: string;
  productId: string;
  provider: IntegrationProvider;
  status: ConnectionStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  metadata: Record<string, unknown>;
  secret?: string;
};

export type DeploymentSnapshot = {
  id: string;
  productId: string;
  provider: "github" | "gcp";
  environment: "beta" | "staging" | "production";
  data: Record<string, unknown>;
  updatedAt: string;
};

export type RevenueSnapshot = {
  id: string;
  productId: string;
  currency: string;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  productCount: number;
  syncedAt: string;
};

export type EmailSequenceItem = {
  key: string;
  day: number;
  title: string;
  subject: string;
  body: string;
};

export type EmailSequence = {
  id: string;
  productId: string;
  senderEmail: string;
  status: ConnectionStatus;
  items: EmailSequenceItem[];
  updatedAt: string;
  lastTestSentAt?: string;
};

export type OpsHealthStatus = ConnectionStatus | "success" | "warning";

export type OpsHealthMetric = {
  label: string;
  value: string;
};

export type IntegrationOpsSummary = {
  provider: IntegrationProvider;
  label: string;
  status: OpsHealthStatus;
  headline: string;
  detail: string;
  metrics: OpsHealthMetric[];
  diagnostics: OpsHealthMetric[];
  rawSnapshot?: Record<string, unknown> | null;
};

export type ProductOpsHealthSummary = {
  overallStatus: OpsHealthStatus;
  connectedCount: number;
  totalCount: number;
  headline: string;
  detail: string;
  providers: IntegrationOpsSummary[];
};

export type LaunchGateCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type LaunchGateResult = {
  id: string;
  productId: string;
  checks: LaunchGateCheck[];
  passed: boolean;
  readyForNextProduct: boolean;
  evaluatedAt: string;
  notes: string[];
};

export type BuildReadinessCheck = {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type BuildReadinessSummary = {
  checks: BuildReadinessCheck[];
  readyForLaunch: boolean;
  headline: string;
  detail: string;
};

export type PlatformPlan = {
  id: string;
  name: string;
  hidden: boolean;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
};

export type PlatformSubscription = {
  id: string;
  workspaceId: string;
  planId: string;
  status: "beta" | "trial" | "active" | "canceled";
  source: "invite" | "self-serve";
  createdAt: string;
  updatedAt: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
};

export type ActivityEventCategory =
  | "product"
  | "research"
  | "validation"
  | "build"
  | "spec"
  | "ops"
  | "launch";

export type ActivityEventKind =
  | "product_created"
  | "product_updated"
  | "product_archived"
  | "product_restored"
  | "product_cloned"
  | "product_template_applied"
  | "opportunity_created"
  | "opportunity_readout_generated"
  | "validation_lead_created"
  | "validation_touchpoint_logged"
  | "validation_session_logged"
  | "validation_session_analyzed"
  | "validation_task_created"
  | "validation_task_updated"
  | "validation_digest_sent"
  | "build_sheet_saved"
  | "spec_saved"
  | "spec_generated"
  | "integration_connected"
  | "integration_refreshed"
  | "email_sequence_updated"
  | "onboarding_test_sent"
  | "launch_checklist_generated"
  | "launch_gate_evaluated"
  | "launch_state_updated";

export type ActivityEventSource = "founder" | "ai" | "integration";

export type ActivityEvent = {
  id: string;
  workspaceId: string;
  productId?: string;
  category: ActivityEventCategory;
  kind: ActivityEventKind;
  source: ActivityEventSource;
  title: string;
  detail: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type AutomationRunKind = "validation-crm" | "live-ops";

export type AutomationRunStatus = "success" | "partial" | "failed";

export type AutomationRun = {
  id: string;
  kind: AutomationRunKind;
  status: AutomationRunStatus;
  startedAt: string;
  finishedAt: string;
  summary: string;
  metrics: Record<string, number>;
  error?: string;
};

export type DatabaseShape = {
  waitlistRequests: WaitlistRequest[];
  signupIntents: SignupIntent[];
  invites: Invite[];
  users: User[];
  sessions: Session[];
  workspaces: Workspace[];
  products: Product[];
  buildSheets: BuildSheet[];
  opportunities: Opportunity[];
  validationLeads: ValidationLead[];
  validationTouchpoints: ValidationTouchpoint[];
  validationSessions: ValidationSession[];
  validationTasks: ValidationTask[];
  specs: SpecDocument[];
  integrations: IntegrationConnection[];
  deploymentSnapshots: DeploymentSnapshot[];
  revenueSnapshots: RevenueSnapshot[];
  emailSequences: EmailSequence[];
  launchGateResults: LaunchGateResult[];
  platformPlans: PlatformPlan[];
  platformSubscriptions: PlatformSubscription[];
  activityEvents: ActivityEvent[];
  automationRuns: AutomationRun[];
  globalFeatureFlags: FeatureFlags;
};
