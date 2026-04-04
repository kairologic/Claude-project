# ============================================================
# KairoLogic Round 2 Campaign Builder
# ============================================================
# Step 1: Pull unscanned providers with URLs from registry
# Step 2: Batch scan them via /api/scan
# Step 3: Filter for score < 60
# Step 4: Find contact emails from their websites
# Step 5: Output campaign-ready SQL
#
# USAGE:
#   .\build-round2-campaign.ps1 -ScanBatchSize 100 -ScoreMax 60
# ============================================================

param(
    [int]$ScanBatchSize = 100,
    [int]$ScoreMax = 60,
    [int]$TargetCount = 50
)

$BaseUrl = "https://kairologic.net"
$SupabaseUrl = "https://mxrtltezhkxhqizvxvsz.supabase.co/rest/v1"
$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw"
$Headers = @{
    "apikey" = $AnonKey
    "Authorization" = "Bearer $AnonKey"
}
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " KairoLogic Round 2 Campaign Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Scan batch:  $ScanBatchSize providers"
Write-Host "Score filter: < $ScoreMax"
Write-Host "Target:       $TargetCount providers"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Pull unscanned providers with URLs ──
Write-Host "[1/5] Fetching providers with URLs that need scanning..." -ForegroundColor Yellow

# Query providers that have URLs - we'll filter unscanned ones in PowerShell
$allProviders = @()
$offset = 0
$pageSize = 1000

# Paginate through registry to find providers with URLs but no scores
while ($true) {
    $uri = "$SupabaseUrl/registry?select=npi,name,url,city,state,risk_score&order=created_at.asc&limit=$pageSize&offset=$offset"
    try {
        $page = Invoke-RestMethod -Uri $uri -Headers $Headers
    } catch {
        Write-Host "  Error fetching page at offset $offset : $_" -ForegroundColor Red
        break
    }
    
    if ($page.Count -eq 0) { break }
    
    # Count unscanned in this batch
    $unscannedInPage = ($page | Where-Object { $_.url -and $_.url.Length -gt 3 -and ($null -eq $_.risk_score) }).Count
    $allProviders += $page
    $offset += $pageSize
    
    $totalUnscanned = ($allProviders | Where-Object { $_.url -and $_.url.Length -gt 3 -and ($null -eq $_.risk_score) }).Count
    Write-Host "  Fetched $($allProviders.Count) total, $totalUnscanned unscanned so far..." -ForegroundColor Gray
    
    # Stop once we have enough unscanned candidates (3x target to allow for filtering)
    if ($totalUnscanned -ge ($ScanBatchSize * 2)) { 
        Write-Host "  Enough candidates found, stopping pagination." -ForegroundColor Gray
        break 
    }
    
    if ($page.Count -lt $pageSize) { break }
}

# Filter: has URL, no risk_score (unscanned)
$unscanned = $allProviders | Where-Object { 
    $_.url -and $_.url.Length -gt 3 -and ($null -eq $_.risk_score)
} | Select-Object -First $ScanBatchSize

Write-Host "  Total providers with URLs: $($allProviders.Count)" -ForegroundColor Gray
Write-Host "  Unscanned (no risk_score): $($unscanned.Count)" -ForegroundColor Green

if ($unscanned.Count -eq 0) {
    Write-Host "  No unscanned providers found. Try providers with URLs but old scans instead." -ForegroundColor Red
    exit 1
}

# ── Step 2: Scan each provider ──
Write-Host ""
Write-Host "[2/5] Scanning providers (this will take a while)..." -ForegroundColor Yellow

$scanResults = @()
$scanCount = 0
$errorCount = 0

foreach ($p in $unscanned) {
    $scanCount++
    $pct = [math]::Round(($scanCount / $unscanned.Count) * 100)
    Write-Host "  [$scanCount/$($unscanned.Count)] ($pct%) Scanning $($p.name) ($($p.npi))..." -ForegroundColor Gray -NoNewline

    try {
        # Clean URL - strip protocol prefix for the scan API
        $cleanUrl = $p.url -replace '^https?://', '' -replace '/$', ''
        
        $scanBody = @{ npi = $p.npi; url = $cleanUrl } | ConvertTo-Json
        $scanRes = Invoke-RestMethod -Uri "$BaseUrl/api/scan" -Method POST -ContentType "application/json" -Body $scanBody -TimeoutSec 120
        
        $score = $null
        if ($scanRes.riskScore) { $score = $scanRes.riskScore }
        elseif ($scanRes.score) { $score = $scanRes.score }
        elseif ($scanRes.sovereignty_score) { $score = $scanRes.sovereignty_score }

        if ($score -ne $null) {
            Write-Host " Score: $score" -ForegroundColor $(if ($score -lt 60) { "Red" } elseif ($score -lt 80) { "Yellow" } else { "Green" })
            $scanResults += [PSCustomObject]@{
                NPI = $p.npi
                Name = $p.name
                URL = $p.url
                City = $p.city
                State = $p.state
                Score = $score
            }
        } else {
            Write-Host " No score returned" -ForegroundColor DarkGray
        }

        # Rate limit: wait between scans
        Start-Sleep -Milliseconds 2000
    } catch {
        $errorCount++
        Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Start-Sleep -Milliseconds 1000
    }
}

Write-Host ""
Write-Host "  Scanned: $($scanResults.Count) successful, $errorCount errors" -ForegroundColor Green

# ── Step 3: Filter for low scores ──
Write-Host ""
Write-Host "[3/5] Filtering for score < $ScoreMax..." -ForegroundColor Yellow

$lowScore = $scanResults | Where-Object { $_.Score -lt $ScoreMax } | Sort-Object Score
Write-Host "  Found $($lowScore.Count) providers scoring below $ScoreMax" -ForegroundColor $(if ($lowScore.Count -ge 30) { "Green" } else { "Yellow" })

if ($lowScore.Count -eq 0) {
    Write-Host "  No low-scoring providers found. Try increasing ScanBatchSize or ScoreMax." -ForegroundColor Red
    # Still output all results for reference
    $scanResults | Sort-Object Score | Select-Object NPI, Name, Score, URL, City | Format-Table -AutoSize
    exit 1
}

# Show distribution
Write-Host ""
Write-Host "  Score distribution:" -ForegroundColor Gray
$scanResults | Group-Object { 
    if ($_.Score -lt 40) { "Critical (<40)" }
    elseif ($_.Score -lt 60) { "Violations (40-59)" }
    elseif ($_.Score -lt 80) { "Drift (60-79)" }
    else { "Compliant (80+)" }
} | Sort-Object Name | ForEach-Object {
    Write-Host "    $($_.Name): $($_.Count)" -ForegroundColor Gray
}

# ── Step 4: Find emails from websites ──
Write-Host ""
Write-Host "[4/5] Finding contact emails for low-score providers..." -ForegroundColor Yellow

$withEmails = @()
$noEmails = @()

foreach ($p in $lowScore) {
    Write-Host "  Checking $($p.URL)..." -ForegroundColor Gray -NoNewline

    try {
        # Try fetching the website contact page for email
        $pageContent = ""
        try {
            $pageContent = (Invoke-WebRequest -Uri "https://$($p.URL)" -TimeoutSec 10 -UseBasicParsing).Content
        } catch {
            try {
                $pageContent = (Invoke-WebRequest -Uri "http://$($p.URL)" -TimeoutSec 10 -UseBasicParsing).Content
            } catch {}
        }

        # Also try /contact page
        try {
            $contactContent = (Invoke-WebRequest -Uri "https://$($p.URL)/contact" -TimeoutSec 10 -UseBasicParsing).Content
            $pageContent += " " + $contactContent
        } catch {
            try {
                $contactContent = (Invoke-WebRequest -Uri "https://$($p.URL)/contact-us" -TimeoutSec 10 -UseBasicParsing).Content
                $pageContent += " " + $contactContent
            } catch {}
        }

        # Extract emails using regex
        $emailMatches = [regex]::Matches($pageContent, '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
        
        # Filter out common junk emails
        $junkDomains = @('example.com', 'sentry.io', 'wixpress.com', 'wordpress.org', 'w3.org', 'schema.org', 'googleapis.com', 'cloudflare.com', 'google.com', 'facebook.com', 'twitter.com')
        $validEmails = $emailMatches.Value | Where-Object { 
            $email = $_
            $domain = ($email -split '@')[1]
            ($junkDomains | ForEach-Object { $domain -like "*$_" }) -notcontains $true
        } | Select-Object -Unique

        if ($validEmails.Count -gt 0) {
            $email = $validEmails[0]  # Take the first valid email
            Write-Host " $email" -ForegroundColor Green
            $withEmails += [PSCustomObject]@{
                NPI = $p.NPI
                Name = $p.Name
                URL = $p.URL
                City = $p.City
                Score = $p.Score
                Email = $email
            }
        } else {
            Write-Host " No email found" -ForegroundColor DarkGray
            $noEmails += $p
        }

        Start-Sleep -Milliseconds 1000
    } catch {
        Write-Host " Error: $_" -ForegroundColor Red
        $noEmails += $p
    }
}

Write-Host ""
Write-Host "  With emails: $($withEmails.Count)" -ForegroundColor Green
Write-Host "  No email found: $($noEmails.Count)" -ForegroundColor DarkGray

# ── Step 5: Generate outputs ──
Write-Host ""
Write-Host "[5/5] Generating campaign files..." -ForegroundColor Yellow

# Take up to target count
$final = $withEmails | Select-Object -First $TargetCount

# Generate HMAC codes for each
$final | ForEach-Object {
    $bytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash(
        [System.Text.Encoding]::UTF8.GetBytes("kairologic-campaign-$($_.NPI)-sb1188")
    )
    $_ | Add-Member -NotePropertyName "Code" -NotePropertyValue ([BitConverter]::ToString($bytes[0..5]).Replace("-","").ToLower()) -Force
}

# Output CSV
$csvPath = "round2-campaign-$Timestamp.csv"
$final | Select-Object NPI, Name, URL, City, Score, Email, Code | Export-Csv -Path $csvPath -NoTypeInformation
Write-Host "  CSV: $csvPath ($($final.Count) providers)" -ForegroundColor Green

# Output SQL
$sqlPath = "round2-campaign-$Timestamp.sql"
$sqlLines = @("-- KairoLogic Round 2 Campaign: $($final.Count) providers, score < $ScoreMax")
$sqlLines += "-- Generated $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$sqlLines += ""
$sqlLines += "INSERT INTO campaign_outreach (npi, report_code, email_sent_to, practice_name, url, campaign_name) VALUES"

$values = @()
foreach ($p in $final) {
    $safeName = $p.Name -replace "'", "''"
    $values += "  ('$($p.NPI)', '$($p.Code)', '$($p.Email)', '$safeName', '$($p.URL)', 'sb1188-round2')"
}
$sqlLines += ($values -join ",`n")
$sqlLines += "ON CONFLICT DO NOTHING;"
$sqlLines += ""
$sqlLines += "-- Verify"
$sqlLines += "SELECT npi, practice_name, email_sent_to, url FROM campaign_outreach WHERE campaign_name = 'sb1188-round2' ORDER BY created_at;"

$sqlLines -join "`n" | Set-Content -Path $sqlPath
Write-Host "  SQL: $sqlPath" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Round 2 Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Scanned:     $($scanResults.Count) providers"
Write-Host "  Score < 60:  $($lowScore.Count) providers"
Write-Host "  With emails: $($withEmails.Count) providers"
Write-Host "  Final list:  $($final.Count) providers"
Write-Host ""
Write-Host "  Score range: $($final[-1].Score) - $($final[0].Score)"
Write-Host ""

# Show the list
$final | Format-Table @{L='NPI';E={$_.NPI}}, @{L='Score';E={$_.Score}}, @{L='Name';E={$_.Name.Substring(0, [Math]::Min(35, $_.Name.Length))}}, @{L='Email';E={$_.Email}}, @{L='City';E={$_.City}} -AutoSize

Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Review the CSV and SQL files" -ForegroundColor Gray
Write-Host "  2. Run the SQL in Supabase" -ForegroundColor Gray
Write-Host "  3. Run rescan script to get fresh scores into registry" -ForegroundColor Gray
Write-Host "  4. Send: campaign_name = 'sb1188-round2'" -ForegroundColor Gray
