param(
  [string]$Domain = "microsaasfactory.io",
  [switch]$ExpectPermanentRedirect,
  [switch]$ExpectLongHsts,
  [switch]$ExpectCheckoutReady,
  [switch]$ExpectSelfServeReady,
  [switch]$ExpectLaunchReady,
  [string[]]$SpfHosts = @(),
  [string[]]$DkimHosts = @(),
  [string]$ExpectedHomepageTitle = "",
  [string]$ExpectedHomepageDescriptionContains = "",
  [string]$ExpectedHomepageCanonical = "",
  [string]$ExpectedManifestDescriptionContains = "",
  [string[]]$ExpectedSitemapPaths = @(),
  [string[]]$ExpectedHomepagePhrases = @()
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

function Get-ResponseBody {
  param([string]$Url)

  return (curl.exe -sL $Url | Out-String)
}

function Get-RegexGroupValue {
  param(
    [string]$Text,
    [string]$Pattern
  )

  $match = [regex]::Match($Text, $Pattern)

  if ($match.Success) {
    return $match.Groups[1].Value.Trim()
  }

  return ""
}

function Get-HomepageMetaContent {
  param(
    [string]$Html,
    [string]$Name
  )

  $pattern = '(?is)<meta[^>]+name=["'']' + [regex]::Escape($Name) + '["''][^>]+content=["'']([^"'']+)["'']'
  return Get-RegexGroupValue -Text $Html -Pattern $pattern
}

function Get-ExpectedSitemapUrl {
  param(
    [string]$DomainName,
    [string]$PathOrUrl
  )

  if ([string]::IsNullOrWhiteSpace($PathOrUrl)) {
    return ""
  }

  if ($PathOrUrl.StartsWith("http://") -or $PathOrUrl.StartsWith("https://")) {
    return $PathOrUrl.Trim()
  }

  if ($PathOrUrl.StartsWith("/")) {
    return "https://$DomainName$PathOrUrl"
  }

  return "https://$DomainName/$PathOrUrl"
}

function Normalize-UrlValue {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  return $Value.Trim().TrimEnd("/")
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

function Get-DnsTextRecords {
  param([string]$HostName)

  try {
    $records = Resolve-DnsName -Name $HostName -Type TXT -ErrorAction Stop |
      Where-Object { $_.Strings } |
      ForEach-Object { ($_.Strings -join "") }

    if ($records.Count -gt 0) {
      return $records
    }
  } catch {
  }

  $nslookupOutput = nslookup -type=txt $HostName 2>&1 | Out-String
  $records = @()

  foreach ($line in ($nslookupOutput -split "`r?`n")) {
    if ($line -match 'text = "(.*)"') {
      $records += $Matches[1]
    }
  }

  return $records
}

function Get-DnsMxRecords {
  param([string]$HostName)

  try {
    $records = Resolve-DnsName -Name $HostName -Type MX -ErrorAction Stop |
      Where-Object { $_.NameExchange } |
      ForEach-Object { $_.NameExchange.TrimEnd(".") }

    if ($records.Count -gt 0) {
      return $records
    }
  } catch {
  }

  $nslookupOutput = nslookup -type=mx $HostName 2>&1 | Out-String
  $records = @()

  foreach ($line in ($nslookupOutput -split "`r?`n")) {
    if ($line -match "mail exchanger = (.+)$") {
      $records += $Matches[1].Trim().TrimEnd(".")
    }
  }

  return $records
}

function Get-DnsCnameRecords {
  param([string]$HostName)

  try {
    $records = Resolve-DnsName -Name $HostName -Type CNAME -ErrorAction Stop |
      Where-Object { $_.NameHost } |
      ForEach-Object { $_.NameHost.TrimEnd(".") }

    if ($records.Count -gt 0) {
      return $records
    }
  } catch {
  }

  $nslookupOutput = nslookup -type=cname $HostName 2>&1 | Out-String
  $records = @()

  foreach ($line in ($nslookupOutput -split "`r?`n")) {
    if ($line -match "canonical name = (.+)$") {
      $records += $Matches[1].Trim().TrimEnd(".")
    }
  }

  return $records
}

function Get-DnsCaaRecords {
  param([string]$HostName)

  try {
    $dnsGoogle = curl.exe -s "https://dns.google/resolve?name=$HostName&type=257" | ConvertFrom-Json
    $records = @()
    $answers = @()

    if ($null -ne $dnsGoogle -and $null -ne $dnsGoogle.Answer) {
      $answers = @($dnsGoogle.Answer)
    }

    foreach ($answer in $answers) {
      if ($answer.data) {
        $records += [string]$answer.data
      }
    }

    if ($records.Count -gt 0) {
      return $records
    }
  } catch {
  }

  $nslookupOutput = nslookup -type=CAA $HostName 2>&1 | Out-String
  $records = @()

  foreach ($line in ($nslookupOutput -split "`r?`n")) {
    if ($line -match "CAA record = (.+)$") {
      $records += $Matches[1].Trim()
    }
  }

  return $records
}

$httpsRoot = "https://$Domain/"
$httpRoot = "http://$Domain/"

$httpsResponse = Get-ResponseHeaders -Url $httpsRoot
$homeHtml = Get-ResponseBody -Url $httpsRoot
$robotsResponse = Get-ResponseHeaders -Url "https://$Domain/robots.txt"
$sitemapResponse = Get-ResponseHeaders -Url "https://$Domain/sitemap.xml"
$sitemapBody = Get-ResponseBody -Url "https://$Domain/sitemap.xml"
$manifestBody = Get-ResponseBody -Url "https://$Domain/manifest.webmanifest"
$termsResponse = Get-ResponseHeaders -Url "https://$Domain/terms"
$privacyResponse = Get-ResponseHeaders -Url "https://$Domain/privacy"
$healthHeaders = Get-ResponseHeaders -Url "https://$Domain/api/healthz"
$healthBody = curl.exe -s "https://$Domain/api/healthz" | Out-String
$httpResponse = Get-ResponseHeaders -Url $httpRoot

$hsts = $httpsResponse.Headers["strict-transport-security"]
$location = $httpResponse.Headers["location"]
$csp = $httpsResponse.Headers["content-security-policy"]
$cspReportOnly = $httpsResponse.Headers["content-security-policy-report-only"]
$homeTitle = Get-RegexGroupValue -Text $homeHtml -Pattern '(?is)<title>(.*?)</title>'
$homeDescription = Get-HomepageMetaContent -Html $homeHtml -Name "description"
$homeCanonical = Get-RegexGroupValue -Text $homeHtml -Pattern '(?is)<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)["'']'
$manifestJson = $null
$manifestDescription = ""
$sitemapUrls = [regex]::Matches($sitemapBody, '(?is)<loc>(.*?)</loc>') | ForEach-Object {
  $_.Groups[1].Value.Trim()
}
$expectPermanentRedirectNow = $ExpectPermanentRedirect -or $ExpectLaunchReady
$expectCheckoutReadyNow = $ExpectCheckoutReady -or $ExpectLaunchReady
$expectSelfServeReadyNow = $ExpectSelfServeReady -or $ExpectLaunchReady
$senderHosts = if ($SpfHosts.Count -gt 0) { $SpfHosts } else { @($Domain, "send.$Domain") }

try {
  $manifestJson = $manifestBody | ConvertFrom-Json
  $manifestDescription = [string]$manifestJson.description
} catch {
  $failures.Add("Manifest JSON: could not parse /manifest.webmanifest as JSON.")
  Write-CheckResult -Label "Manifest JSON" -Passed $false -Detail $_.Exception.Message
}

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

Assert-Condition `
  -Label "Homepage title tag" `
  -Condition ([string]::IsNullOrWhiteSpace($homeTitle) -eq $false) `
  -SuccessDetail $homeTitle `
  -FailureDetail "Expected a non-empty <title> tag on $httpsRoot."

Assert-Condition `
  -Label "Homepage meta description" `
  -Condition ([string]::IsNullOrWhiteSpace($homeDescription) -eq $false) `
  -SuccessDetail $homeDescription `
  -FailureDetail "Expected a non-empty homepage meta description on $httpsRoot."

Assert-Condition `
  -Label "Homepage canonical" `
  -Condition ([string]::IsNullOrWhiteSpace($homeCanonical) -eq $false) `
  -SuccessDetail $homeCanonical `
  -FailureDetail "Expected a canonical link tag on $httpsRoot."

if ($manifestJson) {
  Assert-Condition `
    -Label "Manifest description" `
    -Condition ([string]::IsNullOrWhiteSpace($manifestDescription) -eq $false) `
    -SuccessDetail $manifestDescription `
    -FailureDetail "Expected a non-empty manifest description."
}

Assert-Condition `
  -Label "Sitemap URL coverage" `
  -Condition (@($sitemapUrls).Count -gt 0) `
  -SuccessDetail ($sitemapUrls -join "; ") `
  -FailureDetail "Expected sitemap.xml to contain one or more <loc> entries."

if (-not [string]::IsNullOrWhiteSpace($ExpectedHomepageTitle)) {
  Assert-Condition `
    -Label "Homepage title parity" `
    -Condition ($homeTitle -eq $ExpectedHomepageTitle) `
    -SuccessDetail $homeTitle `
    -FailureDetail "Expected homepage title '$ExpectedHomepageTitle' but found '$homeTitle'."
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedHomepageDescriptionContains)) {
  Assert-Condition `
    -Label "Homepage description parity" `
    -Condition ($homeDescription -like "*$ExpectedHomepageDescriptionContains*") `
    -SuccessDetail $homeDescription `
    -FailureDetail "Expected homepage description to contain '$ExpectedHomepageDescriptionContains' but found '$homeDescription'."
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedHomepageCanonical)) {
  $normalizedActualCanonical = Normalize-UrlValue -Value $homeCanonical
  $normalizedExpectedCanonical = Normalize-UrlValue -Value $ExpectedHomepageCanonical

  Assert-Condition `
    -Label "Homepage canonical parity" `
    -Condition ($normalizedActualCanonical -eq $normalizedExpectedCanonical) `
    -SuccessDetail $homeCanonical `
    -FailureDetail "Expected canonical '$ExpectedHomepageCanonical' but found '$homeCanonical'."
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedManifestDescriptionContains)) {
  Assert-Condition `
    -Label "Manifest description parity" `
    -Condition ($manifestDescription -like "*$ExpectedManifestDescriptionContains*") `
    -SuccessDetail $manifestDescription `
    -FailureDetail "Expected manifest description to contain '$ExpectedManifestDescriptionContains' but found '$manifestDescription'."
}

foreach ($expectedPath in $ExpectedSitemapPaths) {
  $expectedUrl = Get-ExpectedSitemapUrl -DomainName $Domain -PathOrUrl $expectedPath

  if ([string]::IsNullOrWhiteSpace($expectedUrl)) {
    continue
  }

  Assert-Condition `
    -Label "Sitemap contains $expectedUrl" `
    -Condition ($sitemapUrls -contains $expectedUrl) `
    -SuccessDetail $expectedUrl `
    -FailureDetail "Expected sitemap.xml to contain '$expectedUrl'."
}

foreach ($expectedPhrase in $ExpectedHomepagePhrases) {
  if ([string]::IsNullOrWhiteSpace($expectedPhrase)) {
    continue
  }

  Assert-Condition `
    -Label "Homepage phrase '$expectedPhrase'" `
    -Condition ($homeHtml -like "*$expectedPhrase*") `
    -SuccessDetail "Homepage includes expected posture phrase." `
    -FailureDetail "Expected homepage HTML to contain '$expectedPhrase'."
}

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
  $txtDetails = foreach ($dnsHost in $senderHosts) {
    $records = Get-DnsTextRecords -HostName $dnsHost
    if ($records.Count -gt 0) {
      "$dnsHost => $($records -join '; ')"
    } else {
      "$dnsHost => <no TXT records>"
    }
  }

  Write-CheckResult -Label "TXT records" -Passed $true -Detail ($txtDetails -join "`n")

  $spfRecords = foreach ($dnsHost in $senderHosts) {
    foreach ($record in (Get-DnsTextRecords -HostName $dnsHost)) {
      if ($record -match "v=spf1") {
        [pscustomobject]@{
          HostName = $dnsHost
          Record = $record
        }
      }
    }
  }

  Assert-Condition `
    -Label "SPF" `
    -Condition (@($spfRecords).Count -gt 0) `
    -SuccessDetail ("SPF record present at " + ($spfRecords | ForEach-Object { "$($_.HostName): $($_.Record)" } | Select-Object -First 1)) `
    -FailureDetail ("Expected a TXT SPF record containing v=spf1 at one of: {0}." -f ($senderHosts -join ", "))
} catch {
  $failures.Add("TXT records: lookup failed for sender hosts.")
  Write-CheckResult -Label "TXT records" -Passed $false -Detail $_.Exception.Message
}

try {
  $mxDetails = foreach ($dnsHost in $senderHosts) {
    $records = Get-DnsMxRecords -HostName $dnsHost
    if ($records.Count -gt 0) {
      "$dnsHost => $($records -join '; ')"
    } else {
      "$dnsHost => <no MX records>"
    }
  }
  Write-CheckResult -Label "MX records" -Passed $true -Detail ($mxDetails -join "`n")
} catch {
  $failures.Add("MX records: lookup failed for sender hosts.")
  Write-CheckResult -Label "MX records" -Passed $false -Detail $_.Exception.Message
}

try {
  $dmarcRecords = Get-DnsTextRecords -HostName "_dmarc.$Domain"
  Assert-Condition `
    -Label "DMARC" `
    -Condition (($dmarcRecords -join " ") -match "p=quarantine" -or ($dmarcRecords -join " ") -match "p=reject") `
    -SuccessDetail ($dmarcRecords -join "; ") `
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
    $dkimTextRecords = @(Get-DnsTextRecords -HostName $dkimHost)
    $dkimCnameRecords = @(Get-DnsCnameRecords -HostName $dkimHost)
    $dkimText = $dkimTextRecords -join " "
    $dkimPassed = $dkimText -match "k=rsa" -or
      $dkimText -match "v=DKIM1" -or
      $dkimCnameRecords.Count -gt 0
    $dkimDetail = if ($dkimCnameRecords.Count -gt 0) {
      "CNAME => $($dkimCnameRecords -join '; ')"
    } elseif ($dkimTextRecords.Count -gt 0) {
      $dkimTextRecords -join "; "
    } else {
      "<no TXT or CNAME records>"
    }

    Assert-Condition `
      -Label "DKIM $dkimHost" `
      -Condition $dkimPassed `
      -SuccessDetail $dkimDetail `
      -FailureDetail "Expected a DKIM TXT or provider CNAME record at $dkimHost."
  } catch {
    $failures.Add("DKIM: lookup failed for $dkimHost.")
    Write-CheckResult -Label "DKIM $dkimHost" -Passed $false -Detail $_.Exception.Message
  }
}

try {
  $caaRecords = Get-DnsCaaRecords -HostName $Domain
  Assert-Condition `
    -Label "CAA" `
    -Condition ($caaRecords.Count -gt 0) `
    -SuccessDetail ($caaRecords -join "; ") `
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
