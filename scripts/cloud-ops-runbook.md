# Cloud Ops Runbook

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

1. Keep at least one visible public plan live so pricing and signup intent can remain healthy.
2. Leave `checkoutEnabled=false` until Stripe checkout is manually exercised against production.
3. Keep `selfServeProvisioningEnabled=false` until Firebase client and admin readiness are both green.

Run the verification script after each production rollout:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectPermanentRedirect
```

The script checks:

- `https://<domain>/` response headers, including HSTS
- Enforced `Content-Security-Policy` instead of report-only mode
- `http://<domain>/` redirect posture
- `robots.txt`, `sitemap.xml`, `/terms`, `/privacy`, and `/api/healthz`
- DNS visibility for SPF, MX, DMARC, optional DKIM hosts, and CAA records

If the public edge still returns `302`, do not set `MICROSAAS_FACTORY_LONG_HSTS=1` yet. Promote long HSTS only after the permanent `301` redirect is confirmed.

When the edge is verified for a long-lived secure launch posture, rerun with long HSTS:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectPermanentRedirect `
  -ExpectLongHsts
```

For the final public self-serve launch, require checkout and self-serve readiness plus provider-issued DKIM hostnames:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectLaunchReady `
  -DkimHosts selector1._domainkey.microsaasfactory.io,selector2._domainkey.microsaasfactory.io
```

Suggested DNS posture for the production domain:

- SPF TXT record for the active transactional sender
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
4. Confirm `/api/healthz` returns HTTP 200 for the current staged rollout, even when checkout and self-serve remain disabled.
5. Before enabling public self-serve, confirm `/api/healthz` reports `checkoutReady=true` and `selfServeReady=true`, then verify `/terms`, `/privacy`, and the permanent `301` redirect on the live edge.
