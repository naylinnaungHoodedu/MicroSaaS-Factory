param(
  [string]$Domain = "microsaasfactory.io",
  [switch]$ExpectPermanentRedirect,
  [switch]$ExpectLongHsts,
  [switch]$ExpectCheckoutReady,
  [switch]$ExpectSelfServeReady,
  [switch]$ExpectLaunchReady,
  [string[]]$DkimHosts = @()
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

  $raw = curl.exe -s -D - -o NUL $Url | Out-String
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
$termsResponse = Get-ResponseHeaders -Url "https://$Domain/terms"
$privacyResponse = Get-ResponseHeaders -Url "https://$Domain/privacy"
$healthHeaders = Get-ResponseHeaders -Url "https://$Domain/api/healthz"
$healthBody = curl.exe -s "https://$Domain/api/healthz" | Out-String
$httpResponse = Get-ResponseHeaders -Url $httpRoot

$hsts = $httpsResponse.Headers["strict-transport-security"]
$location = $httpResponse.Headers["location"]
$csp = $httpsResponse.Headers["content-security-policy"]
$cspReportOnly = $httpsResponse.Headers["content-security-policy-report-only"]
$expectPermanentRedirectNow = $ExpectPermanentRedirect -or $ExpectLaunchReady
$expectCheckoutReadyNow = $ExpectCheckoutReady -or $ExpectLaunchReady
$expectSelfServeReadyNow = $ExpectSelfServeReady -or $ExpectLaunchReady

Assert-Condition `
  -Label "HTTPS root HSTS" `
  -Condition ([string]::IsNullOrWhiteSpace($hsts) -eq $false) `
  -SuccessDetail $hsts `
  -FailureDetail "Strict-Transport-Security header is missing on $httpsRoot."

Assert-Condition `
  -Label "Enforced CSP" `
  -Condition ([string]::IsNullOrWhiteSpace($csp) -eq $false -and [string]::IsNullOrWhiteSpace($cspReportOnly)) `
  -SuccessDetail $csp `
  -FailureDetail "Expected Content-Security-Policy without report-only mode on $httpsRoot."

if ($ExpectLongHsts) {
  Assert-Condition `
    -Label "Long HSTS" `
    -Condition ($hsts -match "max-age=31536000" -and $hsts -match "includeSubDomains") `
    -SuccessDetail $hsts `
    -FailureDetail "Long HSTS was expected but the header is '$hsts'."
}

Assert-Condition `
  -Label "robots.txt" `
  -Condition ([bool]($robotsResponse.Raw -match "^HTTP/\S+\s+200")) `
  -SuccessDetail "robots.txt returned 200." `
  -FailureDetail "robots.txt did not return HTTP 200."

Assert-Condition `
  -Label "sitemap.xml" `
  -Condition ([bool]($sitemapResponse.Raw -match "^HTTP/\S+\s+200")) `
  -SuccessDetail "sitemap.xml returned 200." `
  -FailureDetail "sitemap.xml did not return HTTP 200."

Assert-Condition `
  -Label "Terms page" `
  -Condition ([bool]($termsResponse.Raw -match "^HTTP/\S+\s+200")) `
  -SuccessDetail "/terms returned 200." `
  -FailureDetail "/terms did not return HTTP 200."

Assert-Condition `
  -Label "Privacy page" `
  -Condition ([bool]($privacyResponse.Raw -match "^HTTP/\S+\s+200")) `
  -SuccessDetail "/privacy returned 200." `
  -FailureDetail "/privacy did not return HTTP 200."

Assert-Condition `
  -Label "Health endpoint" `
  -Condition ([bool]($healthHeaders.Raw -match "^HTTP/\S+\s+200")) `
  -SuccessDetail $healthBody `
  -FailureDetail "/api/healthz did not return HTTP 200. Body: $healthBody"

$healthJson = $null

try {
  $healthJson = $healthBody | ConvertFrom-Json
} catch {
  $failures.Add("Health JSON: could not parse /api/healthz response as JSON.")
  Write-CheckResult -Label "Health JSON" -Passed $false -Detail $_.Exception.Message
}

if ($healthJson) {
  if ($expectCheckoutReadyNow) {
    Assert-Condition `
      -Label "Checkout readiness" `
      -Condition ([bool]$healthJson.readiness.checkoutReady) `
      -SuccessDetail "checkoutReady=true" `
      -FailureDetail "Expected /api/healthz readiness.checkoutReady=true."
  }

  if ($expectSelfServeReadyNow) {
    Assert-Condition `
      -Label "Self-serve readiness" `
      -Condition ([bool]$healthJson.readiness.selfServeReady) `
      -SuccessDetail "selfServeReady=true" `
      -FailureDetail "Expected /api/healthz readiness.selfServeReady=true."
  }
}

$redirectPattern = if ($expectPermanentRedirectNow) { "^HTTP/\S+\s+301" } else { "^HTTP/\S+\s+30[12]" }
$redirectExpectation = if ($expectPermanentRedirectNow) { "301" } else { "301 or 302" }

Assert-Condition `
  -Label "HTTP redirect" `
  -Condition ([bool]($httpResponse.Raw -match $redirectPattern) -and ($location -eq $httpsRoot)) `
  -SuccessDetail "$redirectExpectation redirect to $httpsRoot confirmed." `
  -FailureDetail "Expected an HTTP $redirectExpectation redirect to $httpsRoot. Raw response: $($httpResponse.Raw.Trim())"

try {
  $txtRecords = nslookup -type=txt $Domain 2>&1 | Out-String
  Write-CheckResult -Label "TXT records" -Passed $true -Detail $txtRecords.Trim()
  Assert-Condition `
    -Label "SPF" `
    -Condition ($txtRecords -match "v=spf1") `
    -SuccessDetail "SPF record present." `
    -FailureDetail "Expected a TXT SPF record containing v=spf1."
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
    -Condition ($dmarcRecords -match "p=quarantine" -or $dmarcRecords -match "p=reject") `
    -SuccessDetail $dmarcRecords.Trim() `
    -FailureDetail "Expected a DMARC TXT record with p=quarantine or p=reject."
} catch {
  $failures.Add("DMARC: lookup failed for _dmarc.$Domain.")
  Write-CheckResult -Label "DMARC" -Passed $false -Detail $_.Exception.Message
}

if ($ExpectLaunchReady -and $DkimHosts.Count -eq 0) {
  $failures.Add("DKIM: ExpectLaunchReady requires one or more -DkimHosts values.")
  Write-CheckResult -Label "DKIM" -Passed $false -Detail "Provide provider-issued DKIM hostnames with -DkimHosts."
}

foreach ($dkimHost in $DkimHosts) {
  try {
    $dkimRecords = nslookup -type=txt $dkimHost 2>&1 | Out-String
    Assert-Condition `
      -Label "DKIM $dkimHost" `
      -Condition ($dkimRecords -match "k=rsa" -or $dkimRecords -match "v=DKIM1") `
      -SuccessDetail $dkimRecords.Trim() `
      -FailureDetail "Expected a DKIM TXT record at $dkimHost."
  } catch {
    $failures.Add("DKIM: lookup failed for $dkimHost.")
    Write-CheckResult -Label "DKIM $dkimHost" -Passed $false -Detail $_.Exception.Message
  }
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
