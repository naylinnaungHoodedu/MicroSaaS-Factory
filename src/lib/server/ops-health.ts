import { INTEGRATION_LABELS } from "@/lib/constants";
import type {
  DeploymentSnapshot,
  EmailSequence,
  IntegrationConnection,
  IntegrationOpsSummary,
  OpsHealthMetric,
  ProductOpsHealthSummary,
  RevenueSnapshot,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const GITHUB_STALE_DAYS = 14;
const GITHUB_AUTOMATION_STALE_DAYS = 2;
const STRIPE_STALE_DAYS = 7;
const GCP_AUTOMATION_STALE_DAYS = 2;
const RESEND_AUTOMATION_STALE_DAYS = 2;
const FAILED_BUILD_STATUSES = new Set(["FAILURE", "INTERNAL_ERROR", "TIMEOUT", "CANCELLED", "EXPIRED"]);

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function daysSince(value?: string) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.floor((Date.now() - timestamp) / DAY_IN_MS);
}

function isStale(value: string | undefined, thresholdDays: number) {
  const ageInDays = daysSince(value);
  return ageInDays !== null && ageInDays > thresholdDays;
}

function latestBy<T>(entries: T[], getTimestamp: (entry: T) => string) {
  return [...entries].sort((left, right) => getTimestamp(right).localeCompare(getTimestamp(left)))[0] ?? null;
}

function pickSnapshot(
  snapshots: DeploymentSnapshot[],
  provider: DeploymentSnapshot["provider"],
) {
  return latestBy(
    snapshots.filter((entry) => entry.provider === provider),
    (entry) => entry.updatedAt,
  );
}

function compactMetrics(metrics: Array<OpsHealthMetric | null>) {
  return metrics.filter((metric): metric is OpsHealthMetric => Boolean(metric));
}

function humanizeSyncSource(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  if (value === "scheduled") {
    return "Scheduled";
  }

  if (value === "webhook") {
    return "Webhook";
  }

  return "Manual";
}

function defaultAutomationMode(provider: IntegrationConnection["provider"]) {
  return provider === "github" ? "webhook + scheduled fallback" : "scheduled refresh";
}

function formatAutomationFreshness(
  lastSyncAt: string | undefined,
  thresholdDays: number,
) {
  return isStale(lastSyncAt, thresholdDays) ? "Stale" : "Fresh";
}

function formatTrafficSummary(trafficEntries: unknown[]) {
  const parts = trafficEntries
    .map((entry) => {
      const record = asRecord(entry);
      const percent = asNumber(record?.percent);
      const revision = asString(record?.revision) ?? "unknown revision";

      if (percent === undefined) {
        return revision;
      }

      return `${percent}% ${revision}`;
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "Not available";
}

function formatLatestBuild(buildEntries: unknown[]) {
  const latestBuild = asRecord(buildEntries[0]);

  if (!latestBuild) {
    return "No recent builds";
  }

  const status = asString(latestBuild.status) ?? "Unknown";
  const finishedAt = asString(latestBuild.finishTime);
  const createdAt = asString(latestBuild.createTime);
  const timestamp = finishedAt ?? createdAt;

  return timestamp ? `${status} at ${timestamp}` : status;
}

function findSenderDomainStatus(
  senderEmail: string | undefined,
  domains: Array<{ name: string; status: string }>,
  totalDomainCount?: number,
) {
  const senderDomain = senderEmail?.split("@")[1]?.toLowerCase();

  if (!senderDomain) {
    return {
      senderDomain: undefined,
      domainStatus: undefined,
      lookupIncomplete: false,
    };
  }

  const match = domains.find((domain) => {
    const normalizedName = domain.name.toLowerCase();
    return senderDomain === normalizedName || senderDomain.endsWith(`.${normalizedName}`);
  });

  return {
    senderDomain,
    domainStatus: match?.status,
    lookupIncomplete: !match && typeof totalDomainCount === "number" && totalDomainCount > domains.length,
  };
}

function summarizeGithub(
  connection: IntegrationConnection | null,
  snapshot: DeploymentSnapshot | null,
): IntegrationOpsSummary {
  const fallbackRepoName =
    [asString(connection?.metadata.owner), asString(connection?.metadata.repo)].filter(Boolean).join("/") ||
    "Repository pending";
  const repoFullName =
    asString(connection?.metadata.repoFullName) ?? fallbackRepoName;

  if (!connection) {
    return {
      provider: "github",
      label: INTEGRATION_LABELS.github,
      status: "not_connected",
      headline: "GitHub not connected",
      detail: "Connect the target repository to track recent commits, pull requests, and releases.",
      metrics: [
        { label: "Repository", value: "Not connected" },
        { label: "Last sync", value: "Not available" },
      ],
      diagnostics: [],
      rawSnapshot: null,
    };
  }

  if (connection.status === "error") {
    return {
      provider: "github",
      label: INTEGRATION_LABELS.github,
      status: "error",
      headline: repoFullName,
      detail: connection.lastError ?? "GitHub sync failed. Reconnect the repository and retry the sync.",
      metrics: [
        { label: "Repository", value: repoFullName },
        { label: "Last sync", value: connection.lastSyncAt ?? "Not available" },
      ],
      diagnostics: compactMetrics([
        connection.lastError ? { label: "Last error", value: connection.lastError } : null,
      ]),
      rawSnapshot: snapshot?.data ?? null,
    };
  }

  if (!snapshot) {
    return {
      provider: "github",
      label: INTEGRATION_LABELS.github,
      status: "pending",
      headline: repoFullName,
      detail: "Repository access is configured, but no GitHub snapshot has been captured yet.",
      metrics: [
        { label: "Repository", value: repoFullName },
        { label: "Last sync", value: connection.lastSyncAt ?? "Not available" },
      ],
      diagnostics: [],
      rawSnapshot: null,
    };
  }

  const recentCommits = asArray(snapshot.data.recentCommits);
  const recentPullRequests = asArray(snapshot.data.recentPullRequests);
  const releases = asArray(snapshot.data.releases);
  const openPullRequests = recentPullRequests.filter((entry) => asString(asRecord(entry)?.state) === "open").length;
  const defaultBranch = asString(snapshot.data.defaultBranch) ?? "Not available";
  const lastPushAt = asString(snapshot.data.lastPushAt);
  const repoUrl = asString(snapshot.data.repoUrl);
  const latestRelease = asString(asRecord(releases[0])?.tag) ?? "None";
  const stale = isStale(lastPushAt, GITHUB_STALE_DAYS);
  const automationStale = isStale(connection.lastSyncAt, GITHUB_AUTOMATION_STALE_DAYS);
  const automationMode =
    asString(connection.metadata.automationMode) ?? defaultAutomationMode("github");
  const lastSyncSource = humanizeSyncSource(asString(connection.metadata.lastSyncSource));
  const lastWebhookAt = asString(connection.metadata.lastWebhookAt);

  return {
    provider: "github",
    label: INTEGRATION_LABELS.github,
    status: stale || automationStale ? "warning" : "success",
    headline: repoFullName,
    detail: stale
      ? `Repository sync is live, but the last push is older than ${GITHUB_STALE_DAYS} days.`
      : automationStale
        ? "Repository metadata is connected, but webhook or scheduled automation has not refreshed it recently."
        : `Tracking ${recentCommits.length} recent commits, ${openPullRequests} open pull requests, and ${releases.length} recent releases.`,
    metrics: [
      { label: "Default branch", value: defaultBranch },
      { label: "Automation", value: automationMode },
      { label: "Last sync source", value: lastSyncSource },
      { label: "Automation freshness", value: formatAutomationFreshness(connection.lastSyncAt, GITHUB_AUTOMATION_STALE_DAYS) },
      { label: "Last push", value: lastPushAt ?? "Not available" },
      { label: "Recent commits", value: String(recentCommits.length) },
      {
        label: "Pull requests",
        value: recentPullRequests.length > 0 ? `${openPullRequests} open / ${recentPullRequests.length} recent` : "No recent pull requests",
      },
      { label: "Latest release", value: latestRelease },
    ],
    diagnostics: compactMetrics([
      repoUrl ? { label: "Repository URL", value: repoUrl } : null,
      asString(connection.metadata.authMode) ? { label: "Auth mode", value: String(connection.metadata.authMode) } : null,
      asString(connection.metadata.installationId) ? { label: "Installation ID", value: String(connection.metadata.installationId) } : null,
      lastWebhookAt ? { label: "Last webhook", value: lastWebhookAt } : null,
      connection.lastSyncAt ? { label: "Last sync", value: connection.lastSyncAt } : null,
    ]),
    rawSnapshot: snapshot.data,
  };
}

function summarizeGcp(
  connection: IntegrationConnection | null,
  snapshot: DeploymentSnapshot | null,
): IntegrationOpsSummary {
  const serviceName =
    asString(connection?.metadata.serviceName) ??
    asString(snapshot?.data.serviceName) ??
    "Cloud Run service pending";

  if (!connection) {
    return {
      provider: "gcp",
      label: INTEGRATION_LABELS.gcp,
      status: "not_connected",
      headline: "Google Cloud not connected",
      detail: "Connect Cloud Run and Cloud Build to watch deployment health before launch review.",
      metrics: [
        { label: "Service", value: "Not connected" },
        { label: "Latest build", value: "Not available" },
      ],
      diagnostics: [],
      rawSnapshot: null,
    };
  }

  if (connection.status === "error") {
    return {
      provider: "gcp",
      label: INTEGRATION_LABELS.gcp,
      status: "error",
      headline: serviceName,
      detail: connection.lastError ?? "Google Cloud sync failed. Check Cloud Run and Cloud Build access.",
      metrics: [
        { label: "Service", value: serviceName },
        { label: "Last sync", value: connection.lastSyncAt ?? "Not available" },
      ],
      diagnostics: compactMetrics([
        connection.lastError ? { label: "Last error", value: connection.lastError } : null,
      ]),
      rawSnapshot: snapshot?.data ?? null,
    };
  }

  if (!snapshot) {
    return {
      provider: "gcp",
      label: INTEGRATION_LABELS.gcp,
      status: "pending",
      headline: serviceName,
      detail: "Google Cloud access is configured, but no deployment snapshot has been captured yet.",
      metrics: [
        { label: "Service", value: serviceName },
        { label: "Last sync", value: connection.lastSyncAt ?? "Not available" },
      ],
      diagnostics: [],
      rawSnapshot: null,
    };
  }

  const terminalCondition = asRecord(snapshot.data.terminalCondition);
  const terminalState = asString(terminalCondition?.state);
  const terminalMessage = asString(terminalCondition?.message);
  const latestBuilds = asArray(snapshot.data.latestBuilds);
  const latestBuild = asRecord(latestBuilds[0]);
  const latestBuildStatus = asString(latestBuild?.status);
  const buildFailed = latestBuildStatus ? FAILED_BUILD_STATUSES.has(latestBuildStatus) : false;
  const serviceHealthy = !terminalState || terminalState === "CONDITION_SUCCEEDED";
  const traffic = formatTrafficSummary(asArray(snapshot.data.traffic));
  const serviceUrl = asString(snapshot.data.serviceUrl);
  const latestReadyRevision = asString(snapshot.data.latestReadyRevision) ?? "Not available";
  const automationStale = isStale(connection.lastSyncAt, GCP_AUTOMATION_STALE_DAYS);
  const status = buildFailed
    ? "error"
    : automationStale
      ? "warning"
      : serviceHealthy && (!latestBuildStatus || latestBuildStatus === "SUCCESS")
        ? "success"
        : "warning";
  const automationMode =
    asString(connection.metadata.automationMode) ?? defaultAutomationMode("gcp");

  return {
    provider: "gcp",
    label: INTEGRATION_LABELS.gcp,
    status,
    headline: serviceName,
    detail: buildFailed
      ? `Latest Cloud Build finished with ${latestBuildStatus}.`
      : automationStale
        ? "Google Cloud is connected, but scheduled automation has not refreshed the deployment snapshot recently."
      : !serviceHealthy
        ? terminalMessage ?? `Cloud Run reports ${terminalState ?? "an unhealthy terminal state"}.`
        : `Revision ${latestReadyRevision} is serving traffic in ${asString(snapshot.data.region) ?? asString(connection.metadata.region) ?? "the configured region"}.`,
    metrics: [
      { label: "Latest revision", value: latestReadyRevision },
      { label: "Automation", value: automationMode },
      { label: "Last sync source", value: humanizeSyncSource(asString(connection.metadata.lastSyncSource)) },
      { label: "Automation freshness", value: formatAutomationFreshness(connection.lastSyncAt, GCP_AUTOMATION_STALE_DAYS) },
      { label: "Traffic split", value: traffic },
      { label: "Latest build", value: formatLatestBuild(latestBuilds) },
      { label: "Recent builds", value: String(latestBuilds.length) },
      { label: "Service URL", value: serviceUrl ?? "Not available" },
    ],
    diagnostics: compactMetrics([
      asString(snapshot.data.projectId) ? { label: "Project ID", value: String(snapshot.data.projectId) } : null,
      asString(snapshot.data.region) ? { label: "Region", value: String(snapshot.data.region) } : null,
      asString(connection.metadata.buildRegion) ? { label: "Build region", value: String(connection.metadata.buildRegion) } : null,
      terminalState ? { label: "Terminal condition", value: terminalState } : null,
      terminalMessage ? { label: "Terminal message", value: terminalMessage } : null,
      connection.lastSyncAt ? { label: "Last sync", value: connection.lastSyncAt } : null,
    ]),
    rawSnapshot: snapshot.data,
  };
}

function summarizeStripe(
  connection: IntegrationConnection | null,
  revenueSnapshot: RevenueSnapshot | null,
): IntegrationOpsSummary {
  if (!connection) {
    return {
      provider: "stripe",
      label: INTEGRATION_LABELS.stripe,
      status: "not_connected",
      headline: "Stripe not connected",
      detail: "Connect the restricted Stripe key to sync pricing, subscriptions, and MRR.",
      metrics: [
        { label: "MRR", value: "Not available" },
        { label: "Subscriptions", value: "Not available" },
      ],
      diagnostics: [],
    };
  }

  if (connection.status === "error") {
    return {
      provider: "stripe",
      label: INTEGRATION_LABELS.stripe,
      status: "error",
      headline: "Stripe sync failed",
      detail: connection.lastError ?? "Stripe sync failed. Check the restricted key permissions and retry.",
      metrics: [
        { label: "Last sync", value: connection.lastSyncAt ?? "Not available" },
      ],
      diagnostics: compactMetrics([
        connection.lastError ? { label: "Last error", value: connection.lastError } : null,
      ]),
    };
  }

  if (!revenueSnapshot) {
    return {
      provider: "stripe",
      label: INTEGRATION_LABELS.stripe,
      status: "pending",
      headline: "Revenue snapshot pending",
      detail: "Stripe access is configured, but the first revenue snapshot has not been stored yet.",
      metrics: [
        { label: "Last sync", value: connection.lastSyncAt ?? "Not available" },
      ],
      diagnostics: [],
    };
  }

  const stale = isStale(revenueSnapshot.syncedAt, STRIPE_STALE_DAYS);
  const automationMode =
    asString(connection.metadata.automationMode) ?? defaultAutomationMode("stripe");

  return {
    provider: "stripe",
    label: INTEGRATION_LABELS.stripe,
    status: stale ? "warning" : "success",
    headline: `${formatCurrency(revenueSnapshot.monthlyRecurringRevenue, revenueSnapshot.currency)} MRR`,
    detail: stale
      ? `Stripe is connected, but the last revenue snapshot is older than ${STRIPE_STALE_DAYS} days.`
      : `Tracking ${revenueSnapshot.activeSubscriptions} active subscriptions across ${revenueSnapshot.productCount} products.`,
    metrics: [
      { label: "Active subscriptions", value: String(revenueSnapshot.activeSubscriptions) },
      { label: "Automation", value: automationMode },
      { label: "Last sync source", value: humanizeSyncSource(asString(connection.metadata.lastSyncSource)) },
      { label: "Automation freshness", value: formatAutomationFreshness(connection.lastSyncAt, STRIPE_STALE_DAYS) },
      { label: "ARR", value: formatCurrency(revenueSnapshot.annualRecurringRevenue, revenueSnapshot.currency) },
      { label: "Catalog products", value: String(revenueSnapshot.productCount) },
      { label: "Last synced", value: revenueSnapshot.syncedAt },
    ],
    diagnostics: compactMetrics([
      { label: "Currency", value: revenueSnapshot.currency },
      asNumber(connection.metadata.priceCount) !== undefined
        ? { label: "Synced prices", value: String(connection.metadata.priceCount) }
        : null,
      connection.lastSyncAt ? { label: "Connection sync", value: connection.lastSyncAt } : null,
    ]),
  };
}

function summarizeResend(
  connection: IntegrationConnection | null,
  emailSequence: EmailSequence | null,
): IntegrationOpsSummary {
  const senderEmail =
    emailSequence?.senderEmail ?? asString(connection?.metadata.senderEmail);

  if (!connection) {
    return {
      provider: "resend",
      label: INTEGRATION_LABELS.resend,
      status: "not_connected",
      headline: "Resend not connected",
      detail: "Connect Resend to validate the sender domain and generate the onboarding sequence.",
      metrics: [
        { label: "Sender", value: "Not connected" },
        { label: "Sequence", value: "Not generated" },
      ],
      diagnostics: [],
    };
  }

  if (connection.status === "error") {
    return {
      provider: "resend",
      label: INTEGRATION_LABELS.resend,
      status: "error",
      headline: senderEmail ?? "Resend sync failed",
      detail: connection.lastError ?? "Resend validation failed. Check the API key and sender domain setup.",
      metrics: [
        { label: "Sender", value: senderEmail ?? "Not available" },
        { label: "Last sync", value: connection.lastSyncAt ?? "Not available" },
      ],
      diagnostics: compactMetrics([
        connection.lastError ? { label: "Last error", value: connection.lastError } : null,
      ]),
    };
  }

  const domains = asArray(connection.metadata.domains)
    .map((entry) => {
      const record = asRecord(entry);
      const name = asString(record?.name);
      const status = asString(record?.status);

      if (!name || !status) {
        return null;
      }

      return { name, status };
    })
    .filter((entry): entry is { name: string; status: string } => Boolean(entry));
  const verifiedDomains = domains.filter((entry) => entry.status.toLowerCase() === "verified").length;
  const totalDomainCount = asNumber(connection.metadata.domainCount) ?? domains.length;
  const { senderDomain, domainStatus, lookupIncomplete } = findSenderDomainStatus(
    senderEmail,
    domains,
    totalDomainCount,
  );
  const sequenceReady = Boolean(emailSequence);
  const domainVerified = domainStatus?.toLowerCase() === "verified";
  const automationStale = isStale(connection.lastSyncAt, RESEND_AUTOMATION_STALE_DAYS);
  const status =
    !sequenceReady || !senderEmail || !domainVerified || automationStale ? "warning" : "success";
  const automationMode =
    asString(connection.metadata.automationMode) ?? defaultAutomationMode("resend");

  return {
    provider: "resend",
    label: INTEGRATION_LABELS.resend,
    status,
    headline: senderEmail ?? "Onboarding email pending",
    detail: !senderEmail
      ? "Resend is connected, but the sender email is not configured yet."
      : !sequenceReady
        ? "Resend is connected, but the onboarding sequence has not been generated yet."
        : automationStale
          ? "Resend is connected, but scheduled automation has not refreshed sender-domain status recently."
        : lookupIncomplete
          ? `Sender domain ${senderDomain ?? "for this email"} is not present in the stored Resend domain metadata yet. Reconnect Resend to refresh the full domain list.`
          : !domainVerified
          ? `Sender domain ${senderDomain ?? "for this email"} is not verified yet. Complete DNS verification before relying on onboarding email.`
          : `Sender domain is verified and ${emailSequence?.items.length ?? 0} onboarding emails are ready.`,
    metrics: [
      { label: "Sender email", value: senderEmail ?? "Not configured" },
      { label: "Automation", value: automationMode },
      { label: "Last sync source", value: humanizeSyncSource(asString(connection.metadata.lastSyncSource)) },
      { label: "Automation freshness", value: formatAutomationFreshness(connection.lastSyncAt, RESEND_AUTOMATION_STALE_DAYS) },
      { label: "Sender domain", value: senderDomain ?? "Not available" },
      { label: "Domain status", value: lookupIncomplete ? "Metadata incomplete" : domainStatus ?? "Not verified" },
      { label: "Sequence items", value: String(emailSequence?.items.length ?? 0) },
      { label: "Last test sent", value: emailSequence?.lastTestSentAt ?? "Not sent yet" },
    ],
    diagnostics: compactMetrics([
      { label: "Verified domains", value: `${verifiedDomains}/${totalDomainCount || 0}` },
      lookupIncomplete ? { label: "Metadata refresh", value: "Reconnect Resend to store the full sender-domain list." } : null,
      emailSequence?.updatedAt ? { label: "Sequence updated", value: emailSequence.updatedAt } : null,
      connection.lastSyncAt ? { label: "Last sync", value: connection.lastSyncAt } : null,
    ]),
  };
}

export function summarizeProductOpsHealth(input: {
  integrations: IntegrationConnection[];
  deploymentSnapshots: DeploymentSnapshot[];
  revenueSnapshots: RevenueSnapshot[];
  emailSequence: EmailSequence | null;
}): ProductOpsHealthSummary {
  const github = summarizeGithub(
    input.integrations.find((entry) => entry.provider === "github") ?? null,
    pickSnapshot(input.deploymentSnapshots, "github"),
  );
  const gcp = summarizeGcp(
    input.integrations.find((entry) => entry.provider === "gcp") ?? null,
    pickSnapshot(input.deploymentSnapshots, "gcp"),
  );
  const stripe = summarizeStripe(
    input.integrations.find((entry) => entry.provider === "stripe") ?? null,
    latestBy(input.revenueSnapshots, (entry) => entry.syncedAt),
  );
  const resend = summarizeResend(
    input.integrations.find((entry) => entry.provider === "resend") ?? null,
    input.emailSequence,
  );
  const providers = [github, gcp, stripe, resend];
  const connectedCount = input.integrations.filter((entry) => entry.status === "connected").length;
  const attentionProviders = providers.filter((provider) => provider.status !== "success");
  const overallStatus =
    providers.some((provider) => provider.status === "error")
      ? "error"
      : connectedCount === 0
        ? "pending"
        : attentionProviders.length === 0
          ? "success"
          : "warning";

  return {
    overallStatus,
    connectedCount,
    totalCount: providers.length,
    headline:
      connectedCount === providers.length
        ? "All four operational systems are connected"
        : `${connectedCount} of ${providers.length} operational systems are connected`,
    detail:
      attentionProviders.length === 0
        ? "GitHub, Google Cloud, Stripe, and Resend are all reporting healthy founder-facing status."
        : `Needs attention: ${attentionProviders.map((provider) => provider.label).join(", ")}.`,
    providers,
  };
}
