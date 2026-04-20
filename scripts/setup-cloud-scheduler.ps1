param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$ServiceUrl,

  [Parameter(Mandatory = $true)]
  [string]$AutomationKey,

  [string]$Region = "us-central1",
  [string]$TimeZone = "Etc/UTC"
)

$ErrorActionPreference = "Stop"
$serviceUrl = $ServiceUrl.TrimEnd("/")

& gcloud services enable cloudscheduler.googleapis.com "--project" $ProjectId | Out-Null

$jobs = @(
  @{
    Name = "microsaas-factory-validation-crm"
    Schedule = "0 */4 * * *"
    Uri = "$serviceUrl/api/internal/jobs/validation-crm/run"
    Description = "Runs the MicroSaaS Factory validation CRM sweep every 4 hours."
  },
  @{
    Name = "microsaas-factory-live-ops"
    Schedule = "0 */6 * * *"
    Uri = "$serviceUrl/api/internal/jobs/live-ops/run"
    Description = "Runs the MicroSaaS Factory live ops refresh every 6 hours."
  }
)

foreach ($job in $jobs) {
  $existingJobs = @(& gcloud scheduler jobs list `
    "--project" $ProjectId `
    "--location" $Region `
    "--format=value(name)")
  $commonArgs = @(
    "scheduler", "jobs",
    "--project", $ProjectId
  )

  $jobExists = $existingJobs -contains $job.Name

  $httpArgs = @(
    "--location", $Region,
    "--schedule", $job.Schedule,
    "--time-zone", $TimeZone,
    "--uri", $job.Uri,
    "--http-method", "POST",
    "--headers", "Authorization=Bearer $AutomationKey",
    "--description", $job.Description
  )

  if ($jobExists) {
    $updateArgs = @(
      "--location", $Region,
      "--schedule", $job.Schedule,
      "--time-zone", $TimeZone,
      "--uri", $job.Uri,
      "--http-method", "POST",
      "--update-headers", "Authorization=Bearer $AutomationKey",
      "--description", $job.Description
    )
    & gcloud @commonArgs "update" "http" $job.Name @updateArgs
  } else {
    & gcloud @commonArgs "create" "http" $job.Name @httpArgs
  }
}
