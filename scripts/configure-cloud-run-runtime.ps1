param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$AppUrl,

  [Parameter(Mandatory = $true)]
  [string]$FirestoreProjectId,

  [string]$ServiceName = "microsaas-factory",
  [string]$Region = "us-central1",
  [string]$RuntimeServiceAccountEmail = "",
  [string]$FirestoreDatabaseId = "microsaas-factory-db",
  [string]$FirestoreCollection = "microsaasFactoryState",
  [string]$FirebaseApiKey = "",
  [string]$FirebaseAuthDomain = "",
  [string]$FirebaseProjectId = "",
  [string]$FirebaseAppId = "",
  [string]$FirebaseStorageBucket = "",
  [string]$FirebaseMessagingSenderId = "",
  [string]$FirebaseServiceAccountProjectId = "",
  [string]$FirebaseServiceAccountClientEmail = "",
  [string]$GithubAppId = "",
  [string]$StripePlatformPriceMapJson = "",
  [string]$AdminAccessKeySecret = "microsaas-factory-admin-access-key",
  [string]$EncryptionKeySecret = "microsaas-factory-encryption-key",
  [string]$AutomationKeySecret = "microsaas-factory-internal-automation-key",
  [string]$StripePlatformSecretKeySecret = "",
  [string]$StripePlatformWebhookSecretSecret = "",
  [string]$FirebaseServiceAccountPrivateKeySecret = "",
  [string]$GithubAppPrivateKeySecret = "",
  [string]$GoogleServiceAccountJsonSecret = "",
  [switch]$DryRun,
  [switch]$RequireLaunchReadySecrets
)

$ErrorActionPreference = "Stop"

if (-not $RuntimeServiceAccountEmail) {
  $RuntimeServiceAccountEmail = "microsaas-factory-runner@$ProjectId.iam.gserviceaccount.com"
}

function Join-GcloudAssignments {
  param([string[]]$Assignments)

  if (-not $Assignments -or $Assignments.Count -eq 0) {
    return $null
  }

  $candidates = @("|", ";", "~", "#", "!")

  foreach ($candidate in $candidates) {
    $conflict = $false

    foreach ($assignment in $Assignments) {
      if ($assignment.Contains($candidate)) {
        $conflict = $true
        break
      }
    }

    if (-not $conflict) {
      return "^$candidate^" + ($Assignments -join $candidate)
    }
  }

  throw "Could not find a safe delimiter for gcloud assignments."
}

function Get-AssignmentName {
  param([string]$Assignment)

  $separator = $Assignment.IndexOf("=")

  if ($separator -lt 0) {
    return $Assignment
  }

  return $Assignment.Substring(0, $separator)
}

function Write-AssignmentSummary {
  param(
    [string]$Title,
    [string[]]$Assignments
  )

  Write-Host $Title

  if (-not $Assignments -or $Assignments.Count -eq 0) {
    Write-Host "  <none>"
    return
  }

  foreach ($assignment in $Assignments) {
    Write-Host ("  {0}=<set>" -f (Get-AssignmentName $assignment))
  }
}

function Write-SecretSummary {
  param(
    [string]$Title,
    [string[]]$Assignments
  )

  Write-Host $Title

  if (-not $Assignments -or $Assignments.Count -eq 0) {
    Write-Host "  <none>"
    return
  }

  foreach ($assignment in $Assignments) {
    $separator = $assignment.IndexOf("=")
    $name = if ($separator -lt 0) { $assignment } else { $assignment.Substring(0, $separator) }
    $secretRef = if ($separator -lt 0) { "<set>" } else { $assignment.Substring($separator + 1) }
    Write-Host ("  {0}={1}" -f $name, $secretRef)
  }
}

function Assert-RequiredValue {
  param(
    [string]$Label,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "$Label is required when -RequireLaunchReadySecrets is set."
  }
}

function Assert-StripePriceMap {
  param([string]$PriceMapJson)

  try {
    $priceMap = $PriceMapJson | ConvertFrom-Json
    $growth = $priceMap.growth

    if (
      [string]::IsNullOrWhiteSpace([string]$growth.monthly) -or
      [string]::IsNullOrWhiteSpace([string]$growth.annual)
    ) {
      throw "missing growth monthly or annual price IDs"
    }
  } catch {
    throw "StripePlatformPriceMapJson must be valid JSON with growth.monthly and growth.annual price IDs when -RequireLaunchReadySecrets is set."
  }
}

function Assert-SecretHasEnabledLatestVersion {
  param([string]$SecretName)

  if (-not $SecretName) {
    return
  }

  & gcloud secrets describe $SecretName `
    "--project" $ProjectId `
    "--format=value(name)" | Out-Null

  $latestState = [string](& gcloud secrets versions describe latest `
    "--secret" $SecretName `
    "--project" $ProjectId `
    "--format=value(state)")

  if ($latestState.Trim().ToLowerInvariant() -ne "enabled") {
    throw "Secret $SecretName exists in project $ProjectId, but its latest version is not enabled."
  }
}

if ($RequireLaunchReadySecrets) {
  Assert-RequiredValue "FirebaseApiKey" $FirebaseApiKey
  Assert-RequiredValue "FirebaseAuthDomain" $FirebaseAuthDomain
  Assert-RequiredValue "FirebaseProjectId" $FirebaseProjectId
  Assert-RequiredValue "FirebaseAppId" $FirebaseAppId
  Assert-RequiredValue "FirebaseServiceAccountProjectId" $FirebaseServiceAccountProjectId
  Assert-RequiredValue "FirebaseServiceAccountClientEmail" $FirebaseServiceAccountClientEmail
  Assert-RequiredValue "FirebaseServiceAccountPrivateKeySecret" $FirebaseServiceAccountPrivateKeySecret
  Assert-RequiredValue "StripePlatformSecretKeySecret" $StripePlatformSecretKeySecret
  Assert-RequiredValue "StripePlatformWebhookSecretSecret" $StripePlatformWebhookSecretSecret
  Assert-RequiredValue "StripePlatformPriceMapJson" $StripePlatformPriceMapJson
  Assert-StripePriceMap $StripePlatformPriceMapJson
}

if (-not $DryRun) {
  & gcloud services enable `
    run.googleapis.com `
    secretmanager.googleapis.com `
    --project $ProjectId | Out-Null

  $serviceAccounts = @(& gcloud iam service-accounts list `
    "--project" $ProjectId `
    "--format=value(email)")

  if ($serviceAccounts -notcontains $RuntimeServiceAccountEmail) {
    throw "Service account $RuntimeServiceAccountEmail does not exist in project $ProjectId."
  }
}

$envAssignments = @(
  "MICROSAAS_FACTORY_DB_BACKEND=firestore",
  "FIRESTORE_PROJECT_ID=$FirestoreProjectId",
  "FIRESTORE_DATABASE_ID=$FirestoreDatabaseId",
  "MICROSAAS_FACTORY_FIRESTORE_COLLECTION=$FirestoreCollection",
  "MICROSAAS_FACTORY_APP_URL=$($AppUrl.TrimEnd('/'))"
)

if ($FirebaseApiKey) {
  $envAssignments += "NEXT_PUBLIC_FIREBASE_API_KEY=$FirebaseApiKey"
}
if ($FirebaseAuthDomain) {
  $envAssignments += "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FirebaseAuthDomain"
}
if ($FirebaseProjectId) {
  $envAssignments += "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FirebaseProjectId"
}
if ($FirebaseAppId) {
  $envAssignments += "NEXT_PUBLIC_FIREBASE_APP_ID=$FirebaseAppId"
}
if ($FirebaseStorageBucket) {
  $envAssignments += "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$FirebaseStorageBucket"
}
if ($FirebaseMessagingSenderId) {
  $envAssignments += "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$FirebaseMessagingSenderId"
}
if ($FirebaseServiceAccountProjectId) {
  $envAssignments += "FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=$FirebaseServiceAccountProjectId"
}
if ($FirebaseServiceAccountClientEmail) {
  $envAssignments += "FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=$FirebaseServiceAccountClientEmail"
}
if ($GithubAppId) {
  $envAssignments += "GITHUB_APP_ID=$GithubAppId"
}
if ($StripePlatformPriceMapJson) {
  $envAssignments += "STRIPE_PLATFORM_PRICE_MAP_JSON=$StripePlatformPriceMapJson"
}

$secretEnvMap = [ordered]@{
  ADMIN_ACCESS_KEY = $AdminAccessKeySecret
  MICROSAAS_FACTORY_ENCRYPTION_KEY = $EncryptionKeySecret
  INTERNAL_AUTOMATION_KEY = $AutomationKeySecret
  STRIPE_PLATFORM_SECRET_KEY = $StripePlatformSecretKeySecret
  STRIPE_PLATFORM_WEBHOOK_SECRET = $StripePlatformWebhookSecretSecret
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = $FirebaseServiceAccountPrivateKeySecret
  GITHUB_APP_PRIVATE_KEY = $GithubAppPrivateKeySecret
  GOOGLE_SERVICE_ACCOUNT_JSON = $GoogleServiceAccountJsonSecret
}

$secretAssignments = @()

foreach ($key in $secretEnvMap.Keys) {
  $secretName = [string]$secretEnvMap[$key]

  if (-not $secretName) {
    continue
  }

  if (-not $DryRun) {
    Assert-SecretHasEnabledLatestVersion $secretName
  }

  $secretAssignments += ("{0}={1}:latest" -f $key, $secretName)
}

Write-Host ("Cloud Run service: {0}" -f $ServiceName)
Write-Host ("Project: {0}" -f $ProjectId)
Write-Host ("Region: {0}" -f $Region)
Write-Host ("Runtime service account: {0}" -f $RuntimeServiceAccountEmail)
Write-AssignmentSummary "Environment variables to set (values redacted):" $envAssignments
Write-SecretSummary "Secret refs to set:" $secretAssignments

if ($DryRun) {
  Write-Host "Dry run complete. No gcloud services enable or Cloud Run update command was executed."
  Write-Host "Remote Secret Manager version validation is skipped during dry runs."
  return
}

$gcloudArgs = @(
  "run", "services", "update", $ServiceName,
  "--project", $ProjectId,
  "--region", $Region,
  "--service-account", $RuntimeServiceAccountEmail
)

$envBlob = Join-GcloudAssignments $envAssignments
if ($envBlob) {
  $gcloudArgs += @("--set-env-vars", $envBlob)
}

$secretBlob = Join-GcloudAssignments $secretAssignments
if ($secretBlob) {
  $gcloudArgs += @("--set-secrets", $secretBlob)
}

& gcloud @gcloudArgs
