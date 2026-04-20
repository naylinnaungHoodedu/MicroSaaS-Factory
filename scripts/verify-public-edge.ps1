param(
  [string]$Domain = "microsaasfactory.io",
  [switch]$ExpectPermanentRedirect,
  [switch]$ExpectLongHsts
)

$ErrorActionPreference = "Stop"
$failures = New-Object System.Collections.Generic.List[string]

function Write-CheckResult {
  param(
    [string]$Label,
    [bool]$Passed,
    [string]$Detail
  )

  $status = if ($Passed) { "PASS" } else { "FAIL" }
  Write-Host ("[{0}] {1}: {2}" -f $status, $Label, $Detail)
}

function Get-ResponseHeaders {
  param([string]$Url)

  $raw = curl.exe -s -D - -o NUL $Url
  $headerMap = @{}

  foreach ($line in ($raw -split "`r?`n")) {
    if ($line -match "^[A-Za-z0-9-]+:\s*(.+)$") {
      $separator = $line.IndexOf(":")
      $key = $line.Substring(0, $separator).Trim().ToLowerInvariant()
      $value = $line.Substring($separator + 1).Trim()
      $headerMap[$key] = $value
    }
  }

  return @{
    Raw = $raw
    Headers = $headerMap
  }
}

function Assert-Condition {
  param(
    [string]$Label,
    [bool]$Condition,
    [string]$SuccessDetail,
    [string]$FailureDetail
  )

  if ($Condition) {
    Write-CheckResult -Label $Label -Passed $true -Detail $SuccessDetail
    return
  }

  $failures.Add(("{0}: {1}" -f $Label, $FailureDetail))
  Write-CheckResult -Label $Label -Passed $false -Detail $FailureDetail
}

$httpsRoot = "https://$Domain/"
$httpRoot = "http://$Domain/"

$httpsResponse = Get-ResponseHeaders -Url $httpsRoot
$robotsResponse = Get-ResponseHeaders -Url "https://$Domain/robots.txt"
$sitemapResponse = Get-ResponseHeaders -Url "https://$Domain/sitemap.xml"
$healthHeaders = Get-ResponseHeaders -Url "https://$Domain/api/healthz"
$healthBody = curl.exe -s "https://$Domain/api/healthz"
$httpResponse = Get-ResponseHeaders -Url $httpRoot

$hsts = $httpsResponse.Headers["strict-transport-security"]
$location = $httpResponse.Headers["location"]

Assert-Condition `
  -Label "HTTPS root HSTS" `
  -Condition ([string]::IsNullOrWhiteSpace($hsts) -eq $false) `
  -SuccessDetail $hsts `
  -FailureDetail "Strict-Transport-Security header is missing on $httpsRoot."

if ($ExpectLongHsts) {
  Assert-Condition `
    -Label "Long HSTS" `
    -Condition ($hsts -match "max-age=31536000" -and $hsts -match "includeSubDomains") `
    -SuccessDetail $hsts `
    -FailureDetail "Long HSTS was expected but the header is '$hsts'."
}

Assert-Condition `
  -Label "robots.txt" `
  -Condition ($robotsResponse.Raw -match "^HTTP/\S+\s+200") `
  -SuccessDetail "robots.txt returned 200." `
  -FailureDetail "robots.txt did not return HTTP 200."

Assert-Condition `
  -Label "sitemap.xml" `
  -Condition ($sitemapResponse.Raw -match "^HTTP/\S+\s+200") `
  -SuccessDetail "sitemap.xml returned 200." `
  -FailureDetail "sitemap.xml did not return HTTP 200."

Assert-Condition `
  -Label "Health endpoint" `
  -Condition ($healthHeaders.Raw -match "^HTTP/\S+\s+200") `
  -SuccessDetail $healthBody `
  -FailureDetail "/api/healthz did not return HTTP 200. Body: $healthBody"

$redirectPattern = if ($ExpectPermanentRedirect) { "^HTTP/\S+\s+301" } else { "^HTTP/\S+\s+30[12]" }
$redirectExpectation = if ($ExpectPermanentRedirect) { "301" } else { "301 or 302" }

Assert-Condition `
  -Label "HTTP redirect" `
  -Condition (($httpResponse.Raw -match $redirectPattern) -and ($location -eq $httpsRoot)) `
  -SuccessDetail "$redirectExpectation redirect to $httpsRoot confirmed." `
  -FailureDetail "Expected an HTTP $redirectExpectation redirect to $httpsRoot. Raw response: $($httpResponse.Raw.Trim())"

try {
  $txtRecords = nslookup -type=txt $Domain 2>&1 | Out-String
  Write-CheckResult -Label "TXT records" -Passed $true -Detail $txtRecords.Trim()
} catch {
  $failures.Add("TXT records: lookup failed for $Domain.")
  Write-CheckResult -Label "TXT records" -Passed $false -Detail $_.Exception.Message
}

try {
  $mxRecords = nslookup -type=mx $Domain 2>&1 | Out-String
  Write-CheckResult -Label "MX records" -Passed $true -Detail $mxRecords.Trim()
} catch {
  $failures.Add("MX records: lookup failed for $Domain.")
  Write-CheckResult -Label "MX records" -Passed $false -Detail $_.Exception.Message
}

try {
  $dmarcRecords = nslookup -type=txt "_dmarc.$Domain" 2>&1 | Out-String
  Assert-Condition `
    -Label "DMARC" `
    -Condition ($dmarcRecords -match "p=quarantine") `
    -SuccessDetail $dmarcRecords.Trim() `
    -FailureDetail "Expected a DMARC TXT record with p=quarantine."
} catch {
  $failures.Add("DMARC: lookup failed for _dmarc.$Domain.")
  Write-CheckResult -Label "DMARC" -Passed $false -Detail $_.Exception.Message
}

try {
  $caaRecords = nslookup -type=CAA $Domain 2>&1 | Out-String
  Assert-Condition `
    -Label "CAA" `
    -Condition ($caaRecords -notmatch "Non-existent domain" -and $caaRecords -match $Domain) `
    -SuccessDetail $caaRecords.Trim() `
    -FailureDetail "CAA records were not found for $Domain."
} catch {
  $failures.Add("CAA: lookup failed for $Domain.")
  Write-CheckResult -Label "CAA" -Passed $false -Detail $_.Exception.Message
}

if ($failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Public edge verification failed:"
  $failures | ForEach-Object { Write-Host ("- {0}" -f $_) }
  exit 1
}

Write-Host ""
Write-Host "Public edge verification passed."
