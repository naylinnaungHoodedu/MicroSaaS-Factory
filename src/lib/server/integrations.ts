import { createSign, createHmac } from "node:crypto";
import { secureCompare } from "@/lib/server/crypto";
import { getMicrosaasFactoryAppUrl, type BillingInterval } from "@/lib/server/runtime-config";

type GithubSyncInput = {
  owner: string;
  repo: string;
  installationId?: string;
  personalAccessToken?: string;
};

type GcpSyncInput = {
  projectId: string;
  region: string;
  serviceName: string;
  buildRegion?: string;
  serviceAccountJson: string;
};

type StripeSyncInput = {
  secretKey: string;
};

type ResendSyncInput = {
  apiKey: string;
  senderEmail: string;
};

type StripePlatformCheckoutInput = {
  priceId: string;
  customerEmail: string;
  workspaceId: string;
  planId: string;
  billingInterval: BillingInterval;
};

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function exchangeGoogleToken(account: GoogleServiceAccount, scopes: string[]) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = toBase64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claimSet}`);
  signer.end();
  const signature = signer.sign(account.private_key).toString("base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claimSet}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`GCP auth failed with ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function getGithubAccessToken(input: GithubSyncInput) {
  if (input.personalAccessToken) {
    return input.personalAccessToken;
  }

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey || !input.installationId) {
    throw new Error(
      "GitHub App is not configured. Provide GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, and an installation ID, or use the PAT fallback.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = toBase64Url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claimSet}`);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");
  const jwt = `${header}.${claimSet}.${signature}`;

  const response = await fetch(
    `https://api.github.com/app/installations/${input.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "User-Agent": "MicroSaaS-Factory",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub installation auth failed with ${response.status}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

async function fetchGithubJson<T>(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "MicroSaaS-Factory",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function syncGithubConnection(input: GithubSyncInput) {
  const token = await getGithubAccessToken(input);
  const repoPath = `${input.owner}/${input.repo}`;
  const [repo, commits, pulls, releases] = await Promise.all([
    fetchGithubJson<{
      full_name: string;
      default_branch: string;
      html_url: string;
      pushed_at: string;
    }>(`https://api.github.com/repos/${repoPath}`, token),
    fetchGithubJson<Array<{ sha: string; commit: { message: string; author: { date: string } } }>>(
      `https://api.github.com/repos/${repoPath}/commits?per_page=5`,
      token,
    ),
    fetchGithubJson<
      Array<{
        number: number;
        title: string;
        state: string;
        html_url: string;
        updated_at: string;
      }>
    >(`https://api.github.com/repos/${repoPath}/pulls?state=all&per_page=5`, token),
    fetchGithubJson<
      Array<{ tag_name: string; html_url: string; published_at: string | null }>
    >(`https://api.github.com/repos/${repoPath}/releases?per_page=3`, token),
  ]);

  return {
    metadata: {
      owner: input.owner,
      repo: input.repo,
      repoFullName: repo.full_name,
      defaultBranch: repo.default_branch,
      repoUrl: repo.html_url,
      installationId: input.installationId ?? null,
      authMode: input.personalAccessToken ? "pat" : "app",
    },
    snapshot: {
      defaultBranch: repo.default_branch,
      repoUrl: repo.html_url,
      lastPushAt: repo.pushed_at,
      recentCommits: commits.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        authoredAt: commit.commit.author.date,
      })),
      recentPullRequests: pulls.map((pull) => ({
        number: pull.number,
        title: pull.title,
        state: pull.state,
        url: pull.html_url,
        updatedAt: pull.updated_at,
      })),
      releases: releases.map((release) => ({
        tag: release.tag_name,
        url: release.html_url,
        publishedAt: release.published_at,
      })),
    },
    secret: input.personalAccessToken,
  };
}

export async function syncGcpConnection(input: GcpSyncInput) {
  const account = JSON.parse(input.serviceAccountJson) as GoogleServiceAccount;
  const token = await exchangeGoogleToken(account, [
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  const buildRegion = input.buildRegion ?? "global";

  const serviceResponse = await fetch(
    `https://run.googleapis.com/v2/projects/${input.projectId}/locations/${input.region}/services/${input.serviceName}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!serviceResponse.ok) {
    throw new Error(
      `Cloud Run service lookup failed for ${input.serviceName} (${serviceResponse.status})`,
    );
  }

  const service = (await serviceResponse.json()) as {
    name: string;
    uri?: string;
    latestReadyRevision?: string;
    terminalCondition?: { state?: string; message?: string };
    traffic?: Array<{ percent?: number; revision?: string }>;
  };

  const buildsResponse = await fetch(
    `https://cloudbuild.googleapis.com/v1/projects/${input.projectId}/locations/${buildRegion}/builds?pageSize=5`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  const builds = buildsResponse.ok
    ? ((await buildsResponse.json()) as {
        builds?: Array<{
          id: string;
          status: string;
          finishTime?: string;
          createTime?: string;
          substitutions?: Record<string, string>;
        }>;
      })
    : { builds: [] };

  return {
    metadata: {
      projectId: input.projectId,
      region: input.region,
      serviceName: input.serviceName,
      buildRegion,
      serviceAccountEmail: account.client_email,
    },
    snapshot: {
      projectId: input.projectId,
      region: input.region,
      serviceName: input.serviceName,
      serviceUrl: service.uri ?? null,
      latestReadyRevision: service.latestReadyRevision ?? null,
      terminalCondition: service.terminalCondition ?? null,
      traffic: service.traffic ?? [],
      latestBuilds: builds.builds ?? [],
    },
    secret: input.serviceAccountJson,
  };
}

function normalizeStripeInterval(interval: string, amount: number) {
  if (interval === "year") {
    return amount / 12;
  }

  if (interval === "week") {
    return (amount * 52) / 12;
  }

  if (interval === "day") {
    return amount * 30;
  }

  return amount;
}

export async function syncStripeConnection(input: StripeSyncInput) {
  const headers = {
    Authorization: `Bearer ${input.secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const [productsResponse, pricesResponse, subscriptionsResponse] = await Promise.all([
    fetch("https://api.stripe.com/v1/products?limit=100", { headers, cache: "no-store" }),
    fetch("https://api.stripe.com/v1/prices?limit=100", { headers, cache: "no-store" }),
    fetch(
      "https://api.stripe.com/v1/subscriptions?status=all&limit=100&expand[]=data.items.data.price",
      {
        headers,
        cache: "no-store",
      },
    ),
  ]);

  if (!productsResponse.ok || !pricesResponse.ok || !subscriptionsResponse.ok) {
    throw new Error("Stripe sync failed. Check the restricted key permissions.");
  }

  const products = (await productsResponse.json()) as { data: Array<{ id: string }> };
  const prices = (await pricesResponse.json()) as { data: Array<{ id: string }> };
  const subscriptions = (await subscriptionsResponse.json()) as {
    data: Array<{
      status: string;
      items: {
        data: Array<{
          quantity: number | null;
          price: {
            currency: string;
            unit_amount: number | null;
            recurring?: { interval: string };
          };
        }>;
      };
    }>;
  };

  const activeSubscriptions = subscriptions.data.filter((subscription) =>
    ["active", "trialing", "past_due"].includes(subscription.status),
  );
  const monthlyRecurringRevenue = activeSubscriptions.reduce((total, subscription) => {
    return (
      total +
      subscription.items.data.reduce((lineTotal, line) => {
        const unitAmount = (line.price.unit_amount ?? 0) / 100;
        const monthlyAmount = normalizeStripeInterval(
          line.price.recurring?.interval ?? "month",
          unitAmount,
        );
        return lineTotal + monthlyAmount * (line.quantity ?? 1);
      }, 0)
    );
  }, 0);

  return {
    metadata: {
      productCount: products.data.length,
      priceCount: prices.data.length,
    },
    snapshot: {
      currency: activeSubscriptions[0]?.items.data[0]?.price.currency?.toUpperCase() ?? "USD",
      activeSubscriptions: activeSubscriptions.length,
      monthlyRecurringRevenue,
      annualRecurringRevenue: monthlyRecurringRevenue * 12,
      productCount: products.data.length,
    },
    secret: input.secretKey,
  };
}

export async function createStripePlatformCheckoutSession(
  input: StripePlatformCheckoutInput,
) {
  const secretKey = process.env.STRIPE_PLATFORM_SECRET_KEY?.trim();
  const appUrl = getMicrosaasFactoryAppUrl();

  if (!secretKey) {
    throw new Error("STRIPE_PLATFORM_SECRET_KEY is not configured.");
  }

  if (!appUrl) {
    throw new Error("MICROSAAS_FACTORY_APP_URL is not configured.");
  }

  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("success_url", `${appUrl}/app?billing=success`);
  body.set("cancel_url", `${appUrl}/pricing?billing=cancelled`);
  body.set("client_reference_id", input.workspaceId);
  body.set("customer_email", input.customerEmail);
  body.set("allow_promotion_codes", "true");
  body.set("line_items[0][price]", input.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("metadata[workspaceId]", input.workspaceId);
  body.set("metadata[planId]", input.planId);
  body.set("metadata[billingInterval]", input.billingInterval);
  body.set("subscription_data[metadata][workspaceId]", input.workspaceId);
  body.set("subscription_data[metadata][planId]", input.planId);
  body.set("subscription_data[metadata][billingInterval]", input.billingInterval);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Stripe Checkout session creation failed.");
  }

  const session = (await response.json()) as {
    id?: string;
    url?: string;
    customer?: string | null;
    subscription?: string | null;
  };

  if (!session.id || !session.url) {
    throw new Error("Stripe Checkout did not return a redirect URL.");
  }

  return {
    id: session.id,
    url: session.url,
    customerId: session.customer ?? undefined,
    subscriptionId: session.subscription ?? undefined,
  };
}

export async function syncResendConnection(input: ResendSyncInput) {
  const response = await fetch("https://api.resend.com/domains", {
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Resend validation failed with status ${response.status}`);
  }

  const domains = (await response.json()) as {
    data?: Array<{ id: string; name: string; status: string }>;
  };

  return {
    metadata: {
      senderEmail: input.senderEmail,
      domainCount: domains.data?.length ?? 0,
      domains:
        domains.data?.map((domain) => ({
          name: domain.name,
          status: domain.status,
        })) ?? [],
    },
    secret: input.apiKey,
  };
}

export async function sendResendTestEmail(
  apiKey: string,
  senderEmail: string,
  recipient: string,
  subject: string,
  body: string,
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: senderEmail,
      to: recipient,
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend test email failed with status ${response.status}`);
  }

  return (await response.json()) as { id: string };
}

export function verifyGithubWebhookSignature(payload: string, signature?: string) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  return secureCompare(expected, signature);
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader?: string) {
  const secret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  const entries = signatureHeader.split(",").map((entry) => entry.trim());
  const timestamp = entries.find((entry) => entry.startsWith("t="))?.slice(2);
  const signatures = entries
    .filter((entry) => entry.startsWith("v1="))
    .map((entry) => entry.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return signatures.some((signature) => secureCompare(expected, signature));
}
