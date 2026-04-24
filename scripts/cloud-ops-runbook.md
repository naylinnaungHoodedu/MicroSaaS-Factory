# Cloud Ops Runbook

## Commercialization Sequence

Use the staged rollout in this order:

1. Keep at least one visible public plan live so pricing and public signup can stay healthy.
2. Turn on public pricing before public checkout; pricing visibility is allowed to lead checkout.
3. Target the final posture `platformBillingEnabled=true`, `publicSignupEnabled=true`, `selfServeProvisioningEnabled=true`, and `checkoutEnabled=true`, but only after the checks below are green.
4. Keep public signup live until Firebase client and admin readiness are both green.
5. Turn on self-serve provisioning only after `/api/healthz` reports `selfServeReady=true` and `guidance.repoControlledIssues` no longer lists self-serve activation work.
6. Turn on checkout only after `/api/healthz` reports `checkoutReady=true`, `guidance.repoControlledIssues` no longer lists Stripe checkout work, and the public edge verification passes.
7. Promote long HSTS only after the apex HTTP host returns a permanent `301`.

## Scheduler

Use `setup-cloud-scheduler.ps1` after Cloud Run is deployed and `INTERNAL_AUTOMATION_KEY` is set on the service. The script enables the Cloud Scheduler API automatically before creating or updating the jobs.

Example:

```powershell
pwsh ./scripts/setup-cloud-scheduler.ps1 `
  -ProjectId my-gcp-project `
  -ServiceUrl https://microsaasfactory.io `
  -AutomationKey $env:INTERNAL_AUTOMATION_KEY `
  -Region us-central1
```

This creates or updates:

- `microsaas-factory-validation-crm` -> `POST /api/internal/jobs/validation-crm/run` every 4 hours
- `microsaas-factory-live-ops` -> `POST /api/internal/jobs/live-ops/run` every 6 hours

## Monitoring

Use `setup-monitoring-alerts.ps1` after the service is emitting logs from failed or partial automation runs. The script enables the required Logging and Monitoring APIs automatically.

Example:

```powershell
pwsh ./scripts/setup-monitoring-alerts.ps1 `
  -ProjectId my-gcp-project `
  -NotificationEmail ops@example.com `
  -Region us-central1
```

This creates:

- A log-based metric keyed off `microsaas_factory_automation_warning` and `microsaas_factory_automation_failure`
- A Cloud Monitoring alert policy that fires when the metric is greater than zero
- An email notification channel if `-NotificationEmail` is provided and no matching channel already exists

## Public Edge

The staged commercialization rollout assumes the public edge is verified independently from the app build:

1. Keep at least one visible public plan live so pricing and signup can remain healthy.
2. Do not keep `checkoutEnabled=true` until Stripe checkout is manually exercised against production.
3. Do not keep `selfServeProvisioningEnabled=true` until Firebase client and admin readiness are both green.
4. Treat the apex HTTP `302 -> https` behavior as a launch blocker; do not call the rollout complete until it becomes `301`.
5. Review `/api/healthz` first; if `guidance.repoControlledIssues` is non-empty, stop and finish the remaining repo/runtime work before doing edge verification.

Cloud Build should already be green on:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e`

Run the verification script after each production rollout:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectPermanentRedirect
```

The script checks:

- `https://<domain>/` response headers, including HSTS
- homepage title, meta description, and canonical presence
- Enforced `Content-Security-Policy` instead of report-only mode
- manifest description presence
- sitemap coverage
- `http://<domain>/` redirect posture
- `robots.txt`, `sitemap.xml`, `/terms`, `/privacy`, and `/api/healthz`
- DNS visibility for SPF, MX, DMARC, optional DKIM hosts, and CAA records

By default the verifier checks SPF and MX on both the apex domain and `send.<domain>`, which better matches staged sender-subdomain rollouts. Override with `-SpfHosts` if your sender uses a different host.

After public-funnel or SEO changes, use the optional parity flags so repo-to-live drift is explicit instead of inferred from screenshots or manual spot checks. If these checks fail, the deployment is still serving older metadata, manifest text, sitemap coverage, or homepage posture copy than the current repository expects.

Recommended parity check for the current public funnel posture:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectPermanentRedirect `
  -ExpectedHomepageTitle "MicroSaaS Factory" `
  -ExpectedHomepageDescriptionContains "public pricing, guided signup, launch control, and one workspace from first signal to revenue" `
  -ExpectedHomepageCanonical "https://microsaasfactory.io/" `
  -ExpectedManifestDescriptionContains "public pricing, guided signup, launch control, and one workspace from first signal to revenue" `
  -ExpectedSitemapPaths "/","/pricing","/signup","/login","/waitlist","/terms","/privacy" `
  -ExpectedHomepagePhrases "Start the founder workspace with clear pricing, guided signup, and a deliberate activation path.","Launch readiness stays attached to the public promise."
```

If the public edge still returns `302`, do not set `MICROSAAS_FACTORY_LONG_HSTS=1` yet. Promote long HSTS only after the permanent `301` redirect is confirmed.

When the edge is verified for a long-lived secure launch posture, rerun with long HSTS:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectPermanentRedirect `
  -ExpectLongHsts
```

For the final public self-serve plus checkout launch, require checkout and self-serve readiness plus provider-issued DKIM hostnames:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectLaunchReady `
  -DkimHosts selector1._domainkey.microsaasfactory.io,selector2._domainkey.microsaasfactory.io
```

Suggested DNS posture for the production domain:

- SPF TXT record for the active transactional sender host, usually `send.<domain>`
- Provider-issued DKIM records
- `_dmarc` TXT with `p=quarantine`
- CAA records for the active certificate authority

## Manual verification

1. Trigger both internal job routes once with the automation bearer key.
2. Confirm the `microsaasFactoryState/automationRuns` document exists in Firestore and that its `value` array receives the new run entries.
3. Force one partial or failed run and confirm:
  - The admin console shows the alert banner and recent-run status.
  - Cloud Logging receives the structured warning or failure event.
  - The log-based metric increments and the alert policy opens.
4. Confirm `/api/healthz` returns HTTP 200 for the current staged rollout, even before the final all-on launch posture is enabled.
5. Before keeping the full public launch posture on, confirm `/api/healthz` reports `checkoutReady=true` and `selfServeReady=true`, then review `guidance.summary` plus `guidance.repoControlledIssues`.
6. After the health check is green, verify `/terms`, `/privacy`, live Stripe checkout, and the permanent `301` redirect on the live edge.
