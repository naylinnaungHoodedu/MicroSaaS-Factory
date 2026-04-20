import { notFound } from "next/navigation";

import { ActivityFeed } from "@/components/activity-feed";
import { OpsHealthBoard } from "@/components/ops-health-board";
import { ArchivedProductBanner, WorkflowLockNotice } from "@/components/product-page-shell";
import {
  ProductTemplateBadge,
  TemplateGuidance,
} from "@/components/template-guidance";
import {
  ValidationSessionList,
  ValidationTaskList,
} from "@/components/validation-crm";
import {
  AppNav,
  EmptyState,
  Section,
  StageRail,
  StatCard,
  StatusPill,
} from "@/components/ui";
import {
  VALIDATION_SESSION_CHANNELS,
  VALIDATION_STATUSES,
  VALIDATION_TASK_TYPES,
  VALIDATION_TOUCHPOINT_OUTCOMES,
  VALIDATION_TOUCHPOINT_TYPES,
} from "@/lib/constants";
import {
  addOpportunityAction,
  addValidationLeadAction,
  applyProductTemplateAction,
  archiveProductAction,
  cloneProductAction,
  connectGcpAction,
  connectGithubAction,
  connectResendAction,
  connectStripeAction,
  refreshGcpAction,
  refreshGithubAction,
  refreshResendAction,
  refreshStripeAction,
  restoreProductAction,
  createValidationSessionAction,
  createValidationTaskAction,
  evaluateLaunchGateAction,
  generateLaunchChecklistAction,
  generateOpportunityReadoutAction,
  generateSpecAction,
  logValidationTouchpointAction,
  saveBuildSheetAction,
  saveSpecAction,
  sendTestEmailAction,
  updateProductDetailsAction,
  updateEmailSequenceAction,
  updateLaunchStateAction,
} from "@/lib/server/actions";
import { requireFounderContext } from "@/lib/server/auth";
import { buildProductPageViewModel } from "@/lib/server/product-page-view-model";
import {
  getIntegration,
  getProductBundle,
  isSpecComplete,
  joinLines,
} from "@/lib/server/services";
import { formatCurrency, formatDate, formatDateTime, toTitleCase } from "@/lib/utils";

type PageProps = {
  params: Promise<{
    productId: string;
    section?: string[];
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  github: "GitHub connection failed. Check the repo coordinates and GitHub credentials.",
  github_refresh:
    "GitHub refresh failed. Check the saved repo metadata and active GitHub credentials.",
  gcp: "GCP connection failed. Check the project, service name, region, and service-account JSON.",
  gcp_refresh:
    "Google Cloud refresh failed. Check the saved project metadata and service-account access.",
  stripe: "Stripe sync failed. Check the restricted key permissions.",
  stripe_refresh: "Stripe refresh failed. Check the saved restricted key permissions.",
  resend: "Resend connection failed. Check the API key and sender domain setup.",
  resend_refresh: "Resend refresh failed. Check the saved API key and sender-domain status.",
  test_email: "Test email failed. Verify the sender domain and recipient address.",
};

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { workspace } = await requireFounderContext();
  const resolved = await params;
  const resolvedSearchParams = await searchParams;
  const productId = resolved.productId;
  const currentSection = resolved.section?.[0] ?? "";
  const bundle = await getProductBundle(workspace.id, productId).catch(() => null);

  if (!bundle) {
    notFound();
  }

  const viewModel = buildProductPageViewModel(bundle);
  const github = getIntegration(bundle.integrations, "github", productId);
  const gcp = getIntegration(bundle.integrations, "gcp", productId);
  const stripe = getIntegration(bundle.integrations, "stripe", productId);
  const resend = getIntegration(bundle.integrations, "resend", productId);
  const { defaultTemplateId, gcpSummary, githubSummary, isArchived, latestRevenue, leadOptions, targetReleaseDateValue, touchpointsByLead } = viewModel;

  return (
    <div className="space-y-8">
      <Section
        eyebrow="Product"
        title={bundle.product.name}
        description={bundle.product.summary}
      >
        {resolvedSearchParams.error && ERROR_MESSAGES[resolvedSearchParams.error] ? (
          <div className="mb-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
            {ERROR_MESSAGES[resolvedSearchParams.error]}
          </div>
        ) : null}
        {isArchived ? (
          <div className="mb-6">
            <ArchivedProductBanner
              archivedAt={bundle.product.archivedAt}
              archivedReason={bundle.product.archivedReason}
            />
          </div>
        ) : null}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-300">
                {bundle.product.vertical} / {bundle.product.pricingHypothesis} / updated{" "}
                {formatDate(bundle.product.updatedAt)}
              </p>
              <p className="text-sm text-slate-400">
                Target user: {bundle.product.targetUser}
              </p>
              <ProductTemplateBadge template={bundle.template} />
              {bundle.product.clonedFromProductId ? (
                <p className="text-sm text-slate-500">
                  Cloned from lane {bundle.product.clonedFromProductId}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {isArchived ? (
                <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                  archived
                </span>
              ) : null}
              <StatusPill status={bundle.launchGate?.passed ? "connected" : "pending"} />
              <StatusPill status={isSpecComplete(bundle.spec) ? "connected" : "pending"} />
            </div>
          </div>
          <StageRail stage={bundle.product.stage} />
          <AppNav productId={productId} currentSection={currentSection} />
        </div>
      </Section>

      {currentSection === "" ? (
        <div className="space-y-8">
          <div id="product-settings">
            <Section
              eyebrow="Lifecycle"
              title="Product settings and lane control"
              description="Edit the strategy layer, archive or restore the lane, and branch it into a fresh validate-stage baseline."
            >
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <form
                  action={updateProductDetailsAction.bind(null, productId)}
                  className="grid gap-5 lg:grid-cols-2"
                >
                  <fieldset disabled={isArchived} className="contents">
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Template</span>
                      <select name="templateId" defaultValue={bundle.product.templateId ?? ""}>
                        <option value="">Blank</option>
                        {bundle.availableTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Product name</span>
                      <input name="name" required defaultValue={bundle.product.name} />
                    </label>
                    <label className="space-y-2 lg:col-span-2">
                      <span className="text-sm text-slate-300">Summary</span>
                      <textarea
                        name="summary"
                        rows={3}
                        required
                        defaultValue={bundle.product.summary}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Vertical</span>
                      <input name="vertical" required defaultValue={bundle.product.vertical} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Target user</span>
                      <input name="targetUser" required defaultValue={bundle.product.targetUser} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Pricing hypothesis</span>
                      <input
                        name="pricingHypothesis"
                        required
                        defaultValue={bundle.product.pricingHypothesis}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Primary moat</span>
                      <select name="chosenMoat" defaultValue={bundle.product.chosenMoat}>
                        <option value="domain-expertise">Domain expertise</option>
                        <option value="workflow-specificity">Workflow specificity</option>
                        <option value="platform-integration">Platform integration</option>
                        <option value="data-gravity">Data gravity</option>
                      </select>
                    </label>
                    <label className="space-y-2 lg:col-span-2">
                      <span className="text-sm text-slate-300">Core problem</span>
                      <textarea
                        name="coreProblem"
                        rows={3}
                        required
                        defaultValue={bundle.product.coreProblem}
                      />
                    </label>
                    <div className="lg:col-span-2">
                      <button type="submit" className="button-primary">
                        Save product settings
                      </button>
                    </div>
                  </fieldset>
                </form>

                <div className="space-y-5 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                  <div>
                    <p className="text-sm text-slate-400">Lifecycle actions</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Control this lane</h3>
                  </div>
                  <p className="text-sm leading-7 text-slate-300">
                    Archived lanes stay readable by URL, disappear from active rollups, and only allow restore or clone until reactivated.
                  </p>
                  {bundle.product.archivedReason ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                      Archived reason: {bundle.product.archivedReason}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <form action={cloneProductAction.bind(null, productId)}>
                      <button type="submit" className="button-secondary">
                        Clone lane
                      </button>
                    </form>
                    {isArchived ? (
                      <form action={restoreProductAction.bind(null, productId)}>
                        <button type="submit" className="button-secondary">
                          Restore lane
                        </button>
                      </form>
                    ) : (
                      <form action={archiveProductAction.bind(null, productId)} className="space-y-4">
                        <label className="space-y-2">
                          <span className="text-sm text-slate-300">Archive reason</span>
                          <textarea
                            name="archivedReason"
                            rows={3}
                            placeholder="Optional note about why this lane is leaving the active portfolio."
                          />
                        </label>
                        <button type="submit" className="button-secondary">
                          Archive lane
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <Section eyebrow="Snapshot" title="Factory status">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Opportunities" value={String(bundle.opportunities.length)} />
              <StatCard
                label="Validation"
                value={`${bundle.validationDecision.enthusiasticYesCount}/${bundle.validationDecision.totalLeads}`}
                detail="Enthusiastic yes signals vs total leads"
              />
              <StatCard
                label="MRR"
                value={formatCurrency(latestRevenue?.monthlyRecurringRevenue ?? bundle.product.metrics.monthlyRecurringRevenue)}
              />
              <StatCard
                label="Launch gate"
                value={bundle.launchGate?.passed ? "Passed" : "Pending"}
                detail={bundle.launchGate?.notes[0] ?? "Evaluate once integrations and validation are in place."}
              />
            </div>
          </Section>

          <Section eyebrow="Readiness" title="Connected systems">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["GitHub", github?.status ?? "not_connected"],
                ["GCP", gcp?.status ?? "not_connected"],
                ["Stripe", stripe?.status ?? "not_connected"],
                ["Resend", resend?.status ?? "not_connected"],
              ].map(([label, status]) => (
                <div key={label} className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                  <p className="text-sm text-slate-400">{label}</p>
                  <div className="mt-4">
                    <StatusPill status={status as "not_connected" | "connected" | "pending" | "error"} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            eyebrow="Template"
            title="Workflow template"
            description="Templates deepen each stage with domain defaults, guidance, and starter acceptance criteria without overwriting existing work."
          >
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <ProductTemplateBadge template={bundle.template} />
                  <p className="text-lg font-semibold text-white">
                    {bundle.template?.label ?? "No template applied"}
                  </p>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {bundle.template?.description ??
                    "This product is running as a blank lane. Apply a template to backfill empty product and spec fields and surface stage guidance."}
                </p>
              </div>

              <form
                action={applyProductTemplateAction.bind(null, productId)}
                className="space-y-4 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5"
              >
                <fieldset disabled={isArchived} className="space-y-4">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Apply or replace template</span>
                    <select name="templateId" defaultValue={defaultTemplateId} required>
                      {bundle.availableTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-sm leading-7 text-slate-400">
                    Existing research, validation, ops, and launch data stay intact. Only empty
                    product and spec fields are backfilled.
                  </p>
                  <button type="submit" className="button-secondary">
                    {bundle.template ? "Replace template" : "Apply template"}
                  </button>
                </fieldset>
              </form>
            </div>
          </Section>

          <Section
            eyebrow="Timeline"
            title="Recent activity"
            description="A product-scoped feed of the most recent founder, AI, and integration actions for this lane."
          >
            <ActivityFeed
              events={bundle.recentActivity}
              emptyTitle="No product activity yet"
              emptyDetail="Research, validation, spec, and ops updates for this product will appear here as they happen."
            />
          </Section>
        </div>
      ) : null}

      {currentSection === "research" ? (
        <div className="space-y-8">
          {bundle.template ? <TemplateGuidance template={bundle.template} stage="research" /> : null}
          {isArchived ? <WorkflowLockNotice /> : null}
          <fieldset disabled={isArchived} className="grid gap-8 border-0 p-0 lg:grid-cols-[0.95fr_1.05fr]">
            <Section eyebrow="Research" title="Opportunity scoring">
              <form action={addOpportunityAction.bind(null, productId)} className="space-y-5">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Opportunity title</span>
                <input name="title" required placeholder="Alarm flood rationalization reports" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Audience</span>
                <input name="audience" required placeholder="SCADA operators at utilities" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Pain statement</span>
                <textarea name="painStatement" rows={4} required />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Complaint frequency (1-5)</span>
                  <input name="complaintFrequency" type="number" min="1" max="5" defaultValue="3" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Pain severity (1-5)</span>
                  <input name="painSeverity" type="number" min="1" max="5" defaultValue="4" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Willingness to pay (1-5)</span>
                  <input name="willingnessToPay" type="number" min="1" max="5" defaultValue="4" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Competition count</span>
                  <input name="competitionCount" type="number" min="0" defaultValue="6" />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Pricing power estimate</span>
                <input name="pricingPowerEstimate" required placeholder="$99-$299 / month" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Moat type</span>
                <select name="moatType" defaultValue={bundle.product.chosenMoat}>
                  <option value="domain-expertise">Domain expertise</option>
                  <option value="workflow-specificity">Workflow specificity</option>
                  <option value="platform-integration">Platform integration</option>
                  <option value="data-gravity">Data gravity</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Notes</span>
                <textarea name="notes" rows={4} />
              </label>
              <button type="submit" className="button-primary">
                Score opportunity
              </button>
              </form>
            </Section>

            <Section eyebrow="Backlog" title="Ranked opportunities">
              <div className="space-y-4">
                {bundle.opportunities.length === 0 ? (
                  <EmptyState
                    title="No opportunities scored yet"
                    detail="Use the form to score your first pain point and calibrate whether the niche is strong enough to keep."
                  />
                ) : (
                  bundle.opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">{opportunity.title}</p>
                          <p className="text-sm text-slate-400">{opportunity.audience}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                            Score {opportunity.score.totalScore}/50
                          </div>
                          <form
                            action={generateOpportunityReadoutAction.bind(
                              null,
                              productId,
                              opportunity.id,
                            )}
                          >
                            <button type="submit" className="button-secondary">
                              AI readout
                            </button>
                          </form>
                          {bundle.globalFeatureFlags.proAiEnabled ? (
                            <form
                              action={generateOpportunityReadoutAction.bind(
                                null,
                                productId,
                                opportunity.id,
                              )}
                            >
                              <input type="hidden" name="useProModel" value="on" />
                              <button type="submit" className="button-secondary">
                                AI readout Pro
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{opportunity.painStatement}</p>
                      <p className="mt-3 text-sm text-slate-400">{opportunity.score.thesis}</p>
                      {opportunity.score.aiRecommendation ? (
                        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/5 p-4 text-sm leading-7 text-cyan-100">
                          {opportunity.score.aiRecommendation}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </Section>
          </fieldset>
        </div>
      ) : null}

      {currentSection === "validate" ? (
        <div className="space-y-8">
          {bundle.template ? <TemplateGuidance template={bundle.template} stage="validate" /> : null}
          {isArchived ? <WorkflowLockNotice /> : null}
          <fieldset disabled={isArchived} className="space-y-8 border-0 p-0">
          <Section
            eyebrow="Validation"
            title="Lead logging, transcript intelligence, and founder follow-through"
            description={bundle.validationDecision.summary}
          >
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Total leads" value={String(bundle.validationDecision.totalLeads)} />
              <StatCard
                label="Enthusiastic yes"
                value={String(bundle.validationDecision.enthusiasticYesCount)}
              />
              <StatCard
                label="Pending analysis"
                value={String(bundle.crmSummary.pendingAnalysisCount)}
                detail="Queued or failed transcript analyses"
              />
              <StatCard
                label="Overdue tasks"
                value={String(bundle.crmSummary.overdueCount)}
                detail={`${bundle.crmSummary.dueTodayCount} due today / ${bundle.crmSummary.snoozedCount} snoozed`}
              />
            </div>
          </Section>

          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-8">
              <Section eyebrow="Leads" title="Log validation targets">
                <form action={addValidationLeadAction.bind(null, productId)} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Name</span>
                      <input name="name" required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Email</span>
                      <input name="email" type="email" required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Company</span>
                      <input name="company" required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Role</span>
                      <input name="role" required />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Channel</span>
                      <input name="channel" defaultValue="LinkedIn" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Status</span>
                      <select name="status" defaultValue="contacted">
                        <option value="queued">Queued</option>
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="enthusiastic">Enthusiastic</option>
                        <option value="declined">Declined</option>
                      </select>
                    </label>
                  </div>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Notes</span>
                    <textarea name="notes" rows={4} />
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                      <input name="willingToPay" type="checkbox" className="h-4 w-4" />
                      Willing to pay
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                      <input name="demoBooked" type="checkbox" className="h-4 w-4" />
                      Demo booked
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                      <input name="reservationPlaced" type="checkbox" className="h-4 w-4" />
                      Reservation placed
                    </label>
                  </div>
                  <button type="submit" className="button-primary">
                    Log validation lead
                  </button>
                </form>
              </Section>

              <Section
                eyebrow="Transcripts"
                title="Capture validation sessions"
                description="Paste transcript text or upload a text transcript file. The app stores normalized text, runs analysis, and extracts objections, pain points, and next actions."
              >
                <form
                  action={createValidationSessionAction.bind(null, productId)}
                  encType="multipart/form-data"
                  className="space-y-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Capture mode</span>
                      <select name="sourceMode" defaultValue="paste">
                        <option value="paste">Paste transcript</option>
                        <option value="upload">Upload transcript file</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Linked lead</span>
                      <select name="leadId" defaultValue="">
                        <option value="">No lead linked</option>
                        {leadOptions.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Channel</span>
                      <select name="channel" defaultValue="call">
                        {VALIDATION_SESSION_CHANNELS.map((channel) => (
                          <option key={channel} value={channel}>
                            {toTitleCase(channel)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Context</span>
                      <input
                        name="context"
                        placeholder="Discovery call with plant operations manager"
                      />
                    </label>
                  </div>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Transcript text</span>
                    <textarea
                      name="transcriptText"
                      rows={9}
                      placeholder="Paste the transcript here when using paste mode."
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Transcript upload</span>
                    <input
                      name="transcriptFile"
                      type="file"
                      accept=".txt,.md,.vtt,text/plain,text/markdown,text/vtt"
                    />
                  </label>
                  <p className="text-sm leading-7 text-slate-400">
                    Upload mode currently supports text-based transcript formats only: `.txt`,
                    `.md`, and `.vtt`.
                  </p>
                  {bundle.globalFeatureFlags.proAiEnabled ? (
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                      <input name="useProModel" type="checkbox" className="h-4 w-4" />
                      Use Pro model for transcript analysis
                    </label>
                  ) : null}
                  <button type="submit" className="button-primary">
                    Capture transcript
                  </button>
                </form>
              </Section>

              <Section eyebrow="Founder Tasks" title="Schedule the next move">
                <form action={createValidationTaskAction.bind(null, productId)} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Task type</span>
                      <select name="type" defaultValue="follow-up">
                        {VALIDATION_TASK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {toTitleCase(type)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Linked lead</span>
                      <select name="leadId" defaultValue="">
                        <option value="">No lead linked</option>
                        {leadOptions.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm text-slate-300">Title</span>
                      <input
                        name="title"
                        required
                        placeholder="Follow up with pricing and pilot timeline"
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm text-slate-300">Notes</span>
                      <textarea
                        name="notes"
                        rows={4}
                        placeholder="Capture the exact promise or objection to resolve."
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-slate-300">Due on</span>
                      <input name="dueOn" type="date" />
                    </label>
                  </div>
                  <button type="submit" className="button-primary">
                    Create task
                  </button>
                </form>
              </Section>
            </div>

            <div className="space-y-8">
              <Section eyebrow="Responses" title="Lead ledger">
              <div className="mb-6 grid gap-4 md:grid-cols-3">
              <StatCard
                label="Touchpoints"
                value={String(bundle.outreachSummary.totalTouchpoints)}
                detail={bundle.outreachSummary.lastTouchpointAt ? `Last touch ${formatDate(bundle.outreachSummary.lastTouchpointAt)}` : "No outreach logged yet"}
              />
              <StatCard
                label="Coverage"
                value={`${bundle.outreachSummary.contactedLeadCount}/${bundle.leads.length || 0}`}
                detail={`${bundle.outreachSummary.contactCoverageRate.toFixed(0)}% of leads have at least one contact`}
              />
              <StatCard
                label="Positive"
                value={String(bundle.outreachSummary.positiveLeadCount)}
                detail="Leads with positive or booked outcomes"
              />
              </div>
              <div className="space-y-4">
                {bundle.leads.length === 0 ? (
                  <EmptyState
                    title="No validation leads logged"
                    detail="Add the first 10 target users here and treat the 3-of-10 threshold as a hard gate before build."
                  />
                ) : (
                  bundle.leads.map((lead) => (
                    <div key={lead.id} className="rounded-[1.35rem] border border-white/10 bg-slate-950/55 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{lead.name}</p>
                        <p className="text-sm text-slate-400">
                          {lead.role} / {lead.company} / {lead.channel}
                        </p>
                      </div>
                      <StatusPill status={lead.status === "enthusiastic" ? "connected" : "pending"} />
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{lead.notes || "No notes yet."}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {lead.willingToPay ? (
                        <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                          Willing to pay
                        </span>
                      ) : null}
                      {lead.demoBooked ? (
                        <span className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                          Demo booked
                        </span>
                      ) : null}
                      {lead.reservationPlaced ? (
                        <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                          Reservation placed
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-3">
                      <p>Last contact: {formatDate(lead.lastContactedAt)}</p>
                      <p>Last response: {formatDate(lead.lastResponseAt)}</p>
                      <p>Next follow-up: {formatDate(lead.nextFollowUpAt)}</p>
                    </div>
                    <details className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-cyan-100">
                        Log outreach touchpoint
                      </summary>
                      <form
                        action={logValidationTouchpointAction.bind(null, productId, lead.id)}
                        className="mt-4 space-y-4"
                      >
                        <div className="grid gap-4 md:grid-cols-3">
                          <label className="space-y-2">
                            <span className="text-sm text-slate-300">Type</span>
                            <select name="type" defaultValue="dm">
                              {VALIDATION_TOUCHPOINT_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {toTitleCase(type)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm text-slate-300">Outcome</span>
                            <select name="outcome" defaultValue="sent">
                              {VALIDATION_TOUCHPOINT_OUTCOMES.map((outcome) => (
                                <option key={outcome} value={outcome}>
                                  {toTitleCase(outcome)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm text-slate-300">Lead status</span>
                            <select name="status" defaultValue={lead.status}>
                              {VALIDATION_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {toTitleCase(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                          <label className="space-y-2">
                            <span className="text-sm text-slate-300">Summary</span>
                            <textarea
                              name="summary"
                              rows={3}
                              required
                              placeholder="What happened, what objection surfaced, and what the next move is."
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm text-slate-300">Next follow-up</span>
                            <input name="nextFollowUpOn" type="date" />
                          </label>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                            <input name="willingToPay" type="checkbox" className="h-4 w-4" />
                            Mark willing to pay
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                            <input name="demoBooked" type="checkbox" className="h-4 w-4" />
                            Mark demo booked
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                            <input name="reservationPlaced" type="checkbox" className="h-4 w-4" />
                            Mark reservation placed
                          </label>
                        </div>
                        <button type="submit" className="button-secondary">
                          Save touchpoint
                        </button>
                      </form>
                    </details>
                    {(touchpointsByLead.get(lead.id) ?? []).length > 0 ? (
                      <div className="mt-5 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Recent touchpoints
                        </p>
                        {(touchpointsByLead.get(lead.id) ?? []).slice(0, 3).map((touchpoint) => (
                          <div
                            key={touchpoint.id}
                            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-200"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="font-medium text-white">
                                {toTitleCase(touchpoint.type)} / {toTitleCase(touchpoint.outcome)}
                              </p>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                {formatDateTime(touchpoint.createdAt)}
                              </p>
                            </div>
                            <p className="mt-2 leading-7 text-slate-300">{touchpoint.summary}</p>
                            {touchpoint.nextFollowUpAt ? (
                              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-200">
                                Follow up by {formatDate(touchpoint.nextFollowUpAt)}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    </div>
                  ))
                )}
              </div>
              </Section>

              <Section
                eyebrow="CRM Queue"
                title="Task queue"
                description="Manual founder tasks and AI-suggested follow-ups segmented by active state."
              >
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Due and overdue
                    </p>
                    <ValidationTaskList
                      tasks={[...bundle.taskBuckets.overdue, ...bundle.taskBuckets.dueToday]}
                      leads={bundle.leads}
                      emptyTitle="No due CRM tasks"
                      emptyDetail="Tasks ready for action will appear here."
                    />
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Snoozed
                    </p>
                    <ValidationTaskList
                      tasks={bundle.taskBuckets.snoozed}
                      leads={bundle.leads}
                      emptyTitle="No snoozed CRM tasks"
                      emptyDetail="Snoozed follow-ups will appear here until they are reopened."
                    />
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Completed
                    </p>
                    <ValidationTaskList
                      tasks={bundle.taskBuckets.completed}
                      leads={bundle.leads}
                      emptyTitle="No completed CRM tasks"
                      emptyDetail="Completed founder follow-ups will appear here."
                    />
                  </div>
                </div>
              </Section>

              <Section
                eyebrow="Session Ledger"
                title="Captured transcripts"
                description="Every transcript stays attached to the product lane with its latest analysis status and extracted intelligence."
              >
                <ValidationSessionList
                  sessions={bundle.sessions}
                  leads={bundle.leads}
                  emptyTitle="No validation sessions yet"
                  emptyDetail="Paste or upload the first transcript to build objection and pain-point memory."
                />
              </Section>
            </div>
          </div>

          <Section
            eyebrow="Patterns"
            title="Repeated objections and pain signals"
            description="The CRM clusters completed transcript analyses so the founder can sharpen positioning and prioritize what to resolve."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Top objections</p>
                <div className="mt-4 space-y-3">
                  {bundle.crmSummary.topObjections.length > 0 ? (
                    bundle.crmSummary.topObjections.map((item) => (
                      <div
                        key={`objection-${item.label}`}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                      >
                        {item.label} ({item.count})
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      No objection clusters yet. Add transcripts to start building signal.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Top pain points</p>
                <div className="mt-4 space-y-3">
                  {bundle.crmSummary.topPainPoints.length > 0 ? (
                    bundle.crmSummary.topPainPoints.map((item) => (
                      <div
                        key={`pain-${item.label}`}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                      >
                        {item.label} ({item.count})
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      No pain-point clusters yet. Capture interviews to surface recurring friction.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Section>
          </fieldset>
        </div>
      ) : null}

      {currentSection === "spec" ? (
        <div className="space-y-8">
          {bundle.template ? <TemplateGuidance template={bundle.template} stage="spec" /> : null}
          {isArchived ? <WorkflowLockNotice /> : null}
          <fieldset disabled={isArchived} className="space-y-8 border-0 p-0">
          <Section eyebrow="Spec Draft" title="One-page product spec">
            <div className="flex flex-wrap gap-3">
              <form action={generateSpecAction.bind(null, productId)}>
                <button type="submit" className="button-primary">
                  Draft with AI
                </button>
              </form>
              {bundle.globalFeatureFlags.proAiEnabled ? (
                <form action={generateSpecAction.bind(null, productId)}>
                  <input type="hidden" name="useProModel" value="on" />
                  <button type="submit" className="button-secondary">
                    Draft with Pro
                  </button>
                </form>
              ) : null}
            </div>
          </Section>

          <Section eyebrow="Edit Spec" title="Lock the implementation target">
            <form action={saveSpecAction.bind(null, productId)} className="grid gap-5 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Target user</span>
                <input name="targetUser" defaultValue={bundle.spec?.targetUser ?? bundle.product.targetUser} required />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Pricing hypothesis</span>
                <input name="pricingHypothesis" defaultValue={bundle.spec?.pricingHypothesis ?? bundle.product.pricingHypothesis} required />
              </label>
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm text-slate-300">Problem</span>
                <textarea name="problem" rows={4} defaultValue={bundle.spec?.problem ?? bundle.product.coreProblem} required />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">V1 features, one per line</span>
                <textarea name="v1FeaturesText" rows={6} defaultValue={joinLines(bundle.spec?.v1Features ?? [])} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Explicit exclusions, one per line</span>
                <textarea name="exclusionsText" rows={6} defaultValue={joinLines(bundle.spec?.exclusions ?? [])} />
              </label>
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm text-slate-300">Launch criteria, one per line</span>
                <textarea name="launchCriteriaText" rows={5} defaultValue={joinLines(bundle.spec?.launchCriteria ?? [])} />
              </label>
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm text-slate-300">Definition of done</span>
                <textarea name="definitionOfDone" rows={6} defaultValue={bundle.spec?.definitionOfDone ?? ""} />
              </label>
              <div className="lg:col-span-2">
                <button type="submit" className="button-primary">
                  Save spec
                </button>
              </div>
            </form>
          </Section>
          </fieldset>
        </div>
      ) : null}

      {currentSection === "build" ? (
        <div className="space-y-8">
          {isArchived ? <WorkflowLockNotice /> : null}
          <fieldset disabled={isArchived} className="space-y-8 border-0 p-0">
          <Section
            eyebrow="Build"
            title="Release control"
            description="Turn the spec into a concrete ship lane with founder-owned release goals, blockers, and live delivery visibility."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Build Checks"
                value={`${bundle.buildReadiness.checks.filter((check) => check.passed).length}/${bundle.buildReadiness.checks.length}`}
                detail={bundle.buildReadiness.headline}
              />
              <StatCard
                label="Ship Steps"
                value={String(bundle.buildSheet.shipChecklist.length)}
                detail="Tracked release checklist items"
              />
              <StatCard
                label="Blockers"
                value={String(bundle.buildSheet.blockers.length)}
                detail={
                  bundle.buildReadiness.readyForLaunch
                    ? "Build handoff is ready for Launch"
                    : "Resolve blockers before launch review"
                }
              />
            </div>
          </Section>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <Section
              eyebrow="Release Plan"
              title="Founder handoff notes"
              description="Capture the exact release goal, checklist, blockers, and target ship date that define when this lane can move into Launch."
            >
              <form action={saveBuildSheetAction.bind(null, productId)} className="grid gap-5">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Release goal</span>
                  <textarea
                    name="releaseGoal"
                    rows={3}
                    defaultValue={bundle.buildSheet.releaseGoal}
                    placeholder="Describe the release milestone that earns a launch review."
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Ship checklist, one per line</span>
                  <textarea
                    name="shipChecklistText"
                    rows={6}
                    defaultValue={joinLines(bundle.buildSheet.shipChecklist)}
                    placeholder={"Smoke-test onboarding\nVerify release commit\nConfirm deploy health"}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Build blockers, one per line</span>
                  <textarea
                    name="blockersText"
                    rows={5}
                    defaultValue={joinLines(bundle.buildSheet.blockers)}
                    placeholder="List only blockers that prevent a launch handoff."
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Notes</span>
                  <textarea
                    name="notes"
                    rows={5}
                    defaultValue={bundle.buildSheet.notes}
                    placeholder="Capture founder context, risk notes, and release decisions."
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Target release date</span>
                  <input name="targetReleaseOn" type="date" defaultValue={targetReleaseDateValue} />
                </label>
                <div>
                  <button type="submit" className="button-primary">
                    Save build state
                  </button>
                </div>
              </form>
            </Section>

            <Section
              eyebrow="Readiness"
              title="Build to launch handoff"
              description={bundle.buildReadiness.detail}
            >
              <div className="space-y-4">
                {bundle.buildReadiness.checks.map((check) => (
                  <div
                    key={check.key}
                    className="rounded-[1.3rem] border border-white/10 bg-slate-950/55 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-white">{check.label}</p>
                      <StatusPill status={check.passed ? "connected" : "pending"} />
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{check.detail}</p>
                  </div>
                ))}
                <div className="rounded-[1.3rem] border border-cyan-300/20 bg-cyan-400/5 p-5 text-sm leading-7 text-cyan-100">
                  {bundle.buildReadiness.readyForLaunch
                    ? "Build is ready to move into Launch. Run the launch gate after final checklist review."
                    : "Keep this lane in Build until release controls, repo state, deploy state, and blockers are fully aligned."}
                </div>
              </div>
            </Section>
          </div>

          <Section
            eyebrow="Delivery State"
            title="GitHub and deploy visibility"
            description="Build stays operationally grounded when repo and deployment snapshots are refreshed from the live systems."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">GitHub delivery</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {githubSummary?.headline ?? "GitHub pending"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <StatusPill status={githubSummary?.status ?? "not_connected"} />
                    {github ? (
                      <form action={refreshGithubAction.bind(null, productId, "build")}>
                        <button type="submit" className="button-secondary">
                          Refresh GitHub
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {githubSummary?.detail ??
                    "Connect GitHub to track branch, push, pull-request, and release state."}
                </p>
                {githubSummary ? (
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    {githubSummary.metrics.map((metric) => (
                      <div
                        key={`github-metric-${metric.label}`}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {metric.label}
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-100">{metric.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {githubSummary?.diagnostics.length ? (
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {githubSummary.diagnostics.map((metric) => (
                      <div key={`github-diagnostic-${metric.label}`}>
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {metric.label}
                        </dt>
                        <dd className="mt-1 break-all text-sm text-slate-300">{metric.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">GCP delivery</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {gcpSummary?.headline ?? "Google Cloud pending"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <StatusPill status={gcpSummary?.status ?? "not_connected"} />
                    {gcp ? (
                      <form action={refreshGcpAction.bind(null, productId, "build")}>
                        <button type="submit" className="button-secondary">
                          Refresh GCP
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {gcpSummary?.detail ??
                    "Connect Google Cloud to track latest revision, build state, traffic, and service URL."}
                </p>
                {gcpSummary ? (
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    {gcpSummary.metrics.map((metric) => (
                      <div
                        key={`gcp-metric-${metric.label}`}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {metric.label}
                        </dt>
                        <dd className="mt-2 break-all text-sm font-medium text-slate-100">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {gcpSummary?.diagnostics.length ? (
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {gcpSummary.diagnostics.map((metric) => (
                      <div key={`gcp-diagnostic-${metric.label}`}>
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {metric.label}
                        </dt>
                        <dd className="mt-1 break-all text-sm text-slate-300">{metric.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </div>
          </Section>
          </fieldset>
        </div>
      ) : null}

      {currentSection === "ops" ? (
        <div className="space-y-8">
          {bundle.template ? <TemplateGuidance template={bundle.template} stage="ops" /> : null}
          {isArchived ? <WorkflowLockNotice /> : null}
          <fieldset disabled={isArchived} className="space-y-8 border-0 p-0">
          <Section eyebrow="Ops" title="Connect the live systems">
            <div className="grid gap-6 lg:grid-cols-2">
              <form action={connectGithubAction.bind(null, productId)} className="space-y-4 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">GitHub</h3>
                  <StatusPill status={github?.status ?? "not_connected"} />
                </div>
                <input name="owner" required placeholder="Repository owner" defaultValue={String(github?.metadata.owner ?? "")} />
                <input name="repo" required placeholder="Repository name" defaultValue={String(github?.metadata.repo ?? "")} />
                <input name="installationId" placeholder="GitHub App installation ID" defaultValue={String(github?.metadata.installationId ?? "")} />
                <textarea name="personalAccessToken" rows={3} placeholder="Optional beta fallback PAT if the GitHub App is not configured." />
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="button-primary">Connect GitHub</button>
                  {github ? (
                    <button
                      type="submit"
                      formAction={refreshGithubAction.bind(null, productId, "ops")}
                      formNoValidate
                      className="button-secondary"
                    >
                      Refresh GitHub
                    </button>
                  ) : null}
                </div>
              </form>

              <form action={connectGcpAction.bind(null, productId)} className="space-y-4 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Google Cloud</h3>
                  <StatusPill status={gcp?.status ?? "not_connected"} />
                </div>
                <input name="projectId" required placeholder="GCP project ID" defaultValue={String(gcp?.metadata.projectId ?? "")} />
                <input name="region" required placeholder="Cloud Run region" defaultValue={String(gcp?.metadata.region ?? "us-central1")} />
                <input name="serviceName" required placeholder="Cloud Run service name" defaultValue={String(gcp?.metadata.serviceName ?? "")} />
                <input name="buildRegion" placeholder="Cloud Build region" defaultValue={String(gcp?.metadata.buildRegion ?? "global")} />
                <textarea name="serviceAccountJson" rows={7} required placeholder="Paste least-privileged service account JSON for beta sync." />
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="button-primary">Connect GCP</button>
                  {gcp ? (
                    <button
                      type="submit"
                      formAction={refreshGcpAction.bind(null, productId, "ops")}
                      formNoValidate
                      className="button-secondary"
                    >
                      Refresh GCP
                    </button>
                  ) : null}
                </div>
              </form>

              <form action={connectStripeAction.bind(null, productId)} className="space-y-4 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Stripe</h3>
                  <StatusPill status={stripe?.status ?? "not_connected"} />
                </div>
                <textarea name="secretKey" rows={4} required placeholder="Restricted Stripe API key for catalog and subscription snapshot sync." />
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="button-primary">Connect Stripe</button>
                  {stripe ? (
                    <button
                      type="submit"
                      formAction={refreshStripeAction.bind(null, productId, "ops")}
                      formNoValidate
                      className="button-secondary"
                    >
                      Refresh Stripe
                    </button>
                  ) : null}
                </div>
              </form>

              <form action={connectResendAction.bind(null, productId)} className="space-y-4 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Resend</h3>
                  <StatusPill status={resend?.status ?? "not_connected"} />
                </div>
                <input name="senderEmail" required placeholder="noreply@yourdomain.com" defaultValue={bundle.emailSequence?.senderEmail ?? ""} />
                <textarea name="apiKey" rows={4} required placeholder="Resend API key" />
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                  <input name="useProModel" type="checkbox" className="h-4 w-4" />
                  Use Pro model for onboarding copy
                </label>
                {!bundle.globalFeatureFlags.proAiEnabled ? (
                  <p className="text-xs text-slate-500">
                    Pro generation is disabled at the platform level. This flow will use Flash.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="button-primary">Connect Resend</button>
                  {resend ? (
                    <button
                      type="submit"
                      formAction={refreshResendAction.bind(null, productId, "ops")}
                      formNoValidate
                      className="button-secondary"
                    >
                      Refresh Resend
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </Section>

          <Section
            eyebrow="Health"
            title="Operational summaries"
            description="Read the current repo, deploy, billing, and onboarding state without digging through raw snapshots."
          >
            <OpsHealthBoard summary={bundle.opsHealth} />
          </Section>

          <Section eyebrow="Onboarding" title="Day 0 / 1 / 3 / 7 / 14 sequence">
            {!bundle.emailSequence ? (
              <EmptyState
                title="No email sequence yet"
                detail="Connect Resend first to generate the default onboarding sequence."
              />
            ) : (
              <div className="space-y-6">
                <form action={updateEmailSequenceAction.bind(null, productId)} className="space-y-5 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Sender email</span>
                    <input name="senderEmail" defaultValue={bundle.emailSequence.senderEmail} />
                  </label>
                  {bundle.emailSequence.items.map((item) => (
                    <div key={item.key} className="grid gap-4 rounded-2xl border border-white/10 p-4">
                      <p className="text-sm font-semibold text-white">Day {item.day}</p>
                      <input name={`subject-${item.day}`} defaultValue={item.subject} />
                      <textarea name={`body-${item.day}`} rows={4} defaultValue={item.body} />
                    </div>
                  ))}
                  <button type="submit" className="button-primary">Save sequence</button>
                </form>

                <form action={sendTestEmailAction.bind(null, productId)} className="grid gap-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-5 md:grid-cols-[1fr_180px_auto]">
                  <input name="recipientEmail" type="email" required placeholder="Send a test to this email" />
                  <select name="itemKey" defaultValue="day-0">
                    {bundle.emailSequence.items.map((item) => (
                      <option key={item.key} value={item.key}>
                        Day {item.day}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="button-secondary">Send test</button>
                </form>
              </div>
            )}
          </Section>
          </fieldset>
        </div>
      ) : null}

      {currentSection === "launch" ? (
        <div className="space-y-8">
          {bundle.template ? <TemplateGuidance template={bundle.template} stage="launch" /> : null}
          {isArchived ? <WorkflowLockNotice /> : null}
          <fieldset disabled={isArchived} className="space-y-8 border-0 p-0">
          <Section eyebrow="Launch Gate" title="Operational readiness and maintenance-mode signal">
            <div className="flex flex-wrap gap-3">
              <form action={evaluateLaunchGateAction.bind(null, productId)}>
                <button type="submit" className="button-primary">Evaluate launch gate</button>
              </form>
              <form action={generateLaunchChecklistAction.bind(null, productId)}>
                <button type="submit" className="button-secondary">Generate checklist</button>
              </form>
              {bundle.globalFeatureFlags.proAiEnabled ? (
                <form action={generateLaunchChecklistAction.bind(null, productId)}>
                  <input type="hidden" name="useProModel" value="on" />
                  <button type="submit" className="button-secondary">Generate checklist Pro</button>
                </form>
              ) : null}
              {bundle.launchGate ? <StatusPill status={bundle.launchGate.passed ? "connected" : "pending"} /> : null}
            </div>
            {bundle.launchGate ? (
              <div className="mt-6 space-y-4">
                {bundle.launchGate.checks.map((check) => (
                  <div key={check.key} className="rounded-[1.3rem] border border-white/10 bg-slate-950/55 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-white">{check.label}</p>
                      <StatusPill status={check.passed ? "connected" : "pending"} />
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{check.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Section>

          <Section eyebrow="Checklist" title="Current launch checklist">
            {bundle.product.launchChecklist.length === 0 ? (
              <EmptyState
                title="No launch checklist yet"
                detail="Generate a checklist from the current product state or write one manually below."
              />
            ) : (
              <div className="space-y-3">
                {bundle.product.launchChecklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section eyebrow="Metrics" title="Ready-for-next-product criteria">
            <form action={updateLaunchStateAction.bind(null, productId)} className="grid gap-5 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Monthly recurring revenue</span>
                <input name="monthlyRecurringRevenue" type="number" min="0" defaultValue={bundle.product.metrics.monthlyRecurringRevenue} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Monthly churn rate (%)</span>
                <input name="monthlyChurnRate" type="number" min="0" step="0.1" defaultValue={bundle.product.metrics.monthlyChurnRate} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Support hours / week</span>
                <input name="supportHoursPerWeek" type="number" min="0" step="0.5" defaultValue={bundle.product.metrics.supportHoursPerWeek} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Active P1 bugs</span>
                <input name="activeP1Bugs" type="number" min="0" defaultValue={bundle.product.metrics.activeP1Bugs} />
              </label>
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm text-slate-300">Critical blockers, one per line</span>
                <textarea name="criticalBlockersText" rows={5} defaultValue={joinLines(bundle.product.criticalBlockers)} />
              </label>
              <label className="space-y-2 lg:col-span-2">
                <span className="text-sm text-slate-300">Launch checklist, one per line</span>
                <textarea name="launchChecklistText" rows={5} defaultValue={joinLines(bundle.product.launchChecklist)} />
              </label>
              <div className="lg:col-span-2">
                <button type="submit" className="button-primary">Save launch state</button>
              </div>
            </form>
          </Section>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
