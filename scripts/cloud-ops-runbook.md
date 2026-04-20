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

## Manual verification

1. Trigger both internal job routes once with the automation bearer key.
2. Confirm the `microsaasFactoryState/automationRuns` document exists in Firestore and that its `value` array receives the new run entries.
3. Force one partial or failed run and confirm:
   - The admin console shows the alert banner and recent-run status.
   - Cloud Logging receives the structured warning or failure event.
   - The log-based metric increments and the alert policy opens.
