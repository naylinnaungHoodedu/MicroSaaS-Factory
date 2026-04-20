param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$MetricName = "microsaas_factory_automation_problem_count",
  [string]$PolicyDisplayName = "MicroSaaS Factory automation problems",
  [string]$NotificationChannel = "",
  [string]$NotificationEmail = "",
  [string]$Region = "us-central1"
)

$ErrorActionPreference = "Stop"
$filter = 'resource.type="cloud_run_revision" AND resource.labels.location="' + $Region + '" AND (textPayload:"microsaas_factory_automation_warning" OR textPayload:"microsaas_factory_automation_failure")'

function Invoke-GcpJson {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("GET", "POST", "PATCH")]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [object]$Body = $null
  )

  $token = (& gcloud auth print-access-token).Trim()
  $headers = @{
    Authorization = "Bearer $token"
  }

  if ($null -ne $Body) {
    $headers["Content-Type"] = "application/json"
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 10)
  }

  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
}

& gcloud services enable `
  logging.googleapis.com `
  monitoring.googleapis.com `
  --project $ProjectId | Out-Null

$existingMetrics = @(& gcloud logging metrics list `
  "--project" $ProjectId `
  "--format=value(name)")
$metricExists = $existingMetrics -contains $MetricName

if (-not $metricExists) {
  & gcloud logging metrics create $MetricName `
    "--project" $ProjectId `
    "--description" "Counts failed or partial MicroSaaS Factory automation runs." `
    "--log-filter" $filter | Out-Null
}

if (-not $NotificationChannel -and $NotificationEmail) {
  $channelsResponse = Invoke-GcpJson `
    -Method GET `
    -Uri "https://monitoring.googleapis.com/v3/projects/$ProjectId/notificationChannels"
  $existingChannel = @($channelsResponse.notificationChannels) | Where-Object {
    $_.type -eq "email" -and $_.labels.email_address -eq $NotificationEmail
  } | Select-Object -First 1

  if ($existingChannel) {
    $NotificationChannel = $existingChannel.name
  } else {
    $createdChannel = Invoke-GcpJson `
      -Method POST `
      -Uri "https://monitoring.googleapis.com/v3/projects/$ProjectId/notificationChannels" `
      -Body @{
        type = "email"
        displayName = "MicroSaaS Factory operator ($NotificationEmail)"
        labels = @{
          email_address = $NotificationEmail
        }
        enabled = $true
      }
    $NotificationChannel = $createdChannel.name
  }
}

$policyBody = @{
  displayName = $PolicyDisplayName
  combiner = "OR"
  conditions = @(
    @{
      displayName = "Automation warning or failure detected"
      conditionThreshold = @{
        filter = 'metric.type="logging.googleapis.com/user/' + $MetricName + '" resource.type="cloud_run_revision"'
        comparison = "COMPARISON_GT"
        thresholdValue = 0
        duration = "0s"
        aggregations = @(
          @{
            alignmentPeriod = "300s"
            perSeriesAligner = "ALIGN_SUM"
          }
        )
        trigger = @{
          count = 1
        }
      }
    }
  )
  alertStrategy = @{
    autoClose = "1800s"
  }
  enabled = $true
}

if ($NotificationChannel) {
  $policyBody.notificationChannels = @($NotificationChannel)
}

$policiesResponse = Invoke-GcpJson `
  -Method GET `
  -Uri "https://monitoring.googleapis.com/v3/projects/$ProjectId/alertPolicies"
$existingPolicy = @($policiesResponse.alertPolicies) | Where-Object {
  $_.displayName -eq $PolicyDisplayName
} | Select-Object -First 1

if ($existingPolicy) {
  $policyBody.name = $existingPolicy.name
  Invoke-GcpJson `
    -Method PATCH `
    -Uri ("https://monitoring.googleapis.com/v3/" + $existingPolicy.name + "?updateMask=display_name,combiner,conditions,alert_strategy,enabled,notification_channels") `
    -Body $policyBody | Out-Null
} else {
  Invoke-GcpJson `
    -Method POST `
    -Uri "https://monitoring.googleapis.com/v3/projects/$ProjectId/alertPolicies" `
    -Body $policyBody | Out-Null
}
