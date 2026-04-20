param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$ServiceAccountName = "microsaas-factory-runner",
  [string]$DisplayName = "MicroSaaS Factory Cloud Run"
)

$ErrorActionPreference = "Stop"
$serviceAccountEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"

& gcloud services enable `
  iam.googleapis.com `
  run.googleapis.com `
  firestore.googleapis.com `
  secretmanager.googleapis.com `
  --project $ProjectId | Out-Null

$existingAccounts = @(& gcloud iam service-accounts list `
  "--project" $ProjectId `
  "--format=value(email)")
$exists = $existingAccounts -contains $serviceAccountEmail

if (-not $exists) {
  & gcloud iam service-accounts create $ServiceAccountName `
    "--project" $ProjectId `
    "--display-name" $DisplayName | Out-Null

  do {
    Start-Sleep -Seconds 2
    $existingAccounts = @(& gcloud iam service-accounts list `
      "--project" $ProjectId `
      "--format=value(email)")
  } until ($existingAccounts -contains $serviceAccountEmail)
}

$member = "serviceAccount:$serviceAccountEmail"
$roles = @(
  "roles/datastore.user",
  "roles/secretmanager.secretAccessor"
)

foreach ($role in $roles) {
  & gcloud projects add-iam-policy-binding $ProjectId `
    "--member" $member `
    "--role" $role `
    "--quiet" | Out-Null
}

Write-Output $serviceAccountEmail
