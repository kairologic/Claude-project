# rescan-campaign-providers.ps1
# ═══════════════════════════════════════════════════════════
# Rescans Round 1 providers via the LIVE /api/scan endpoint
# (same engine providers see on kairologic.net/scan).
# Then updates last_scan_result in registry via Supabase.
#
# This guarantees: email score = landing page score = live scan score.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\rescan-campaign-providers.ps1
# ═══════════════════════════════════════════════════════════

$BASE_URL = "https://kairologic.net"
$SUPABASE_URL = "https://mxrtltezhkxhqizvxvsz.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw"
$DELAY_SECONDS = 5

# Campaign providers from campaign-round1-clean.csv
$providers = @(
    @{ npi="1275883910"; name="Acupuncture Center of Dallas Inc"; url="https://acupuncturetx.com" },
    @{ npi="1265759559"; name="Gemscorp Optometry PA"; url="https://veyepcarrollton.com" },
    @{ npi="1457729394"; name="McCasland Family Dental Too PLLC"; url="https://mccaslandfamilydentistry.com" },
    @{ npi="1366808271"; name="North Wellness & Chiro Center"; url="https://nwchirohouston.com" },
    @{ npi="1528321411"; name="A Medics EMS LLC"; url="https://ampmems.net" },
    @{ npi="1518005099"; name="First Wellness Center"; url="https://firstwellnessaustin.com" },
    @{ npi="1396128534"; name="Burleson Dental PLLC"; url="https://burlesondentalcare.com" },
    @{ npi="1194064519"; name="Jaiswal LLC"; url="https://jaiswalgroup.net" },
    @{ npi="1013222611"; name="UltraOptik LLC"; url="https://lasik2c.com" },
    @{ npi="1104036268"; name="Louetta Dental Professionals"; url="https://dentalprofessionalsonline.com" },
    @{ npi="1972937340"; name="Gregory D Peter DC PA"; url="https://pruskijointandspine.com" },
    @{ npi="1841210606"; name="GHMed LLC"; url="https://ghomehealth.com" },
    @{ npi="1770199218"; name="Quality Family Health Care Clinics PLLC"; url="https://quickmdcare.com" },
    @{ npi="1255465027"; name="Glen Rose Medical Clinic PA"; url="https://glenrosemedicalcenter.com" },
    @{ npi="1194121004"; name="Edge-MD Northwest Hwy PLLC"; url="https://thedoctoredges.com" },
    @{ npi="1003170226"; name="Heartland Physicians Associates PLLC"; url="https://hpapsychiatry.com" },
    @{ npi="1679466585"; name="Illuminating Pathways Counseling Services"; url="https://illuminatingpathwaystx.com" },
    @{ npi="1225041981"; name="Elevate Physical Therapy and Wellness"; url="https://elevateptleander.com" },
    @{ npi="1538604079"; name="About Living Healthcare Services"; url="https://livinghopehealthcare.com" },
    @{ npi="1215718184"; name="BlueHaven Psychiatry PLLC"; url="https://bluehavenpsychiatry.com" },
    @{ npi="1487981072"; name="Texas Dental Holdings PLLC"; url="https://southlakedental.com" },
    @{ npi="1902964711"; name="International Pharmacies Inc"; url="https://internationalpharmacy.com" },
    @{ npi="1104102110"; name="Art of Dentistry"; url="https://morgansmiles.com" },
    @{ npi="1043561798"; name="W.E.Care Optometry LLC"; url="https://wecareoptometry.com" },
    @{ npi="1992369854"; name="Bespoke Vision PLLC"; url="https://bespokevision.org" },
    @{ npi="1528092566"; name="Pediatric Associates of Austin PA"; url="https://pediatricassociates.net" }
)

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  KairoLogic Campaign Rescan (Live Engine)" -ForegroundColor Cyan
Write-Host "  Providers: $($providers.Count)" -ForegroundColor Cyan
Write-Host "  Delay: ${DELAY_SECONDS}s between scans" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$results = @()
$okCount = 0
$errCount = 0

for ($i = 0; $i -lt $providers.Count; $i++) {
    $p = $providers[$i]
    $num = $i + 1
    Write-Host "[$num/$($providers.Count)] $($p.name) ($($p.npi))" -ForegroundColor White -NoNewline

    try {
        # Step 1: Call the LIVE scan API (same as website uses)
        $scanBody = @{
            npi = $p.npi
            url = $p.url
        } | ConvertTo-Json

        $scan = Invoke-RestMethod `
            -Uri "$BASE_URL/api/scan" `
            -Method POST `
            -ContentType "application/json" `
            -Body $scanBody `
            -TimeoutSec 60

        $score = $scan.riskScore
        $level = $scan.riskLevel

        if (-not $score) {
            Write-Host " -> ERROR: No score returned" -ForegroundColor Red
            $errCount++
            $results += [PSCustomObject]@{ NPI=$p.npi; Name=$p.name; Score=""; Level=""; DR=""; Pass=""; Fail=""; Error="No score" }
            continue
        }

        $findings = @($scan.findings)
        $passCount = @($findings | Where-Object { $_.status -eq "pass" }).Count
        $failCountN = @($findings | Where-Object { $_.status -eq "fail" }).Count

        # Get DR score for status label
        $drScore = 100
        if ($scan.categoryScores -and $scan.categoryScores.data_sovereignty) {
            $drScore = $scan.categoryScores.data_sovereignty.percentage
        }

        if ($score -lt 60 -or $drScore -lt 65) {
            $statusLabel = "Violation"
        } elseif ($score -lt 80 -or $drScore -lt 75) {
            $statusLabel = "Drift Detected"
        } else {
            $statusLabel = "Verified Sovereign"
        }

        # Step 2: Save full scan result to registry.last_scan_result
        $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

        # Convert scan object to JSON for the PATCH
        $registryBody = @{
            risk_score = $score
            risk_level = $level
            status_label = $statusLabel
            last_scan_result = $scan
            last_scan_timestamp = $now
            updated_at = $now
        } | ConvertTo-Json -Depth 20 -Compress

        $supaHeaders = @{
            "apikey" = $SUPABASE_KEY
            "Authorization" = "Bearer $SUPABASE_KEY"
            "Content-Type" = "application/json"
            "Prefer" = "return=minimal"
        }

        Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/registry?npi=eq.$($p.npi)" `
            -Method PATCH `
            -Headers $supaHeaders `
            -Body $registryBody `
            -TimeoutSec 10 | Out-Null

        # Display
        $scoreColor = if ($score -ge 80) { "Green" } elseif ($score -ge 60) { "Yellow" } else { "Red" }
        Write-Host " -> " -NoNewline
        Write-Host "$score/100" -ForegroundColor $scoreColor -NoNewline
        Write-Host " ($statusLabel)" -NoNewline
        Write-Host " P:$passCount F:$failCountN DR:$([math]::Round($drScore))%" -ForegroundColor Gray

        $okCount++
        $results += [PSCustomObject]@{
            NPI = $p.npi; Name = $p.name; Score = $score; Level = $statusLabel
            DR = [math]::Round($drScore); Pass = $passCount; Fail = $failCountN; Error = ""
        }
    }
    catch {
        Write-Host " -> FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $errCount++
        $results += [PSCustomObject]@{ NPI=$p.npi; Name=$p.name; Score=""; Level=""; DR=""; Pass=""; Fail=""; Error=$_.Exception.Message }
    }

    if ($i -lt $providers.Count - 1) {
        Start-Sleep -Seconds $DELAY_SECONDS
    }
}

# Summary
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  RESCAN COMPLETE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Success: $okCount / $($providers.Count)" -ForegroundColor $(if ($okCount -eq $providers.Count) { "Green" } else { "Yellow" })
if ($errCount -gt 0) { Write-Host "  Failed:  $errCount" -ForegroundColor Red }
Write-Host ""

$s = @($results | Where-Object { $_.Score -ne "" })
if ($s.Count -gt 0) {
    $critical = @($s | Where-Object { [int]$_.Score -lt 40 }).Count
    $atRisk   = @($s | Where-Object { [int]$_.Score -ge 40 -and [int]$_.Score -lt 60 }).Count
    $drift    = @($s | Where-Object { [int]$_.Score -ge 60 -and [int]$_.Score -lt 80 }).Count
    $sov      = @($s | Where-Object { [int]$_.Score -ge 80 }).Count

    Write-Host "  Score distribution:" -ForegroundColor White
    if ($critical -gt 0) { Write-Host "    Critical (<40):   $critical" -ForegroundColor Red }
    if ($atRisk -gt 0)   { Write-Host "    At Risk (40-59):  $atRisk" -ForegroundColor Yellow }
    if ($drift -gt 0)    { Write-Host "    Drift (60-79):    $drift" -ForegroundColor DarkYellow }
    if ($sov -gt 0)      { Write-Host "    Sovereign (80+):  $sov" -ForegroundColor Green }
    Write-Host ""
}

$results | Format-Table NPI, Score, Level, DR, Pass, Fail, Name, Error -AutoSize

$csvPath = "rescan-results-$(Get-Date -Format 'yyyy-MM-dd-HHmm').csv"
$results | Export-Csv -Path $csvPath -NoTypeInformation
Write-Host "Saved to: $csvPath" -ForegroundColor DarkGray
