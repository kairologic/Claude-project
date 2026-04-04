# ============================================================
# KairoLogic - Stripe Webhook Dry Run Test
# ============================================================
# Simulates a checkout.session.completed webhook event
# Tests: registry update, dashboard token generation,
#        confirmation email, and purchase logging
#
# BEFORE RUNNING:
# 1. Make sure the provider exists in registry
# 2. Make sure is_paid = false for the test provider
# 3. Make sure dashboard_token is NULL (to test generation)
#
# USAGE:
#   .\test-webhook-dryrun.ps1 -NPI "1225041981" -Product "report"
#   .\test-webhook-dryrun.ps1 -NPI "1225041981" -Product "safe-harbor"
# ============================================================

param(
    [string]$NPI = "1225041981",
    [string]$Product = "report",
    [string]$Email = "hello@kairologic.net",
    [string]$Name = "Ravi Test"
)

$BaseUrl = "https://kairologic.net"

# Map product to Stripe-like amount
$amounts = @{
    "report" = 14900
    "safe-harbor" = 24900
}

$amount = $amounts[$Product]
if (-not $amount) {
    Write-Host "Unknown product: $Product. Use 'report' or 'safe-harbor'" -ForegroundColor Red
    exit 1
}

# Build a fake checkout.session.completed event
# The webhook parses this as JSON and extracts fields
$sessionId = "cs_test_dryrun_" + (Get-Date -Format "yyyyMMdd_HHmmss")
$paymentId = "pi_test_dryrun_" + (Get-Date -Format "yyyyMMdd_HHmmss")

$event = @{
    id = "evt_test_dryrun_" + (Get-Date -Format "yyyyMMdd_HHmmss")
    type = "checkout.session.completed"
    data = @{
        object = @{
            id = $sessionId
            payment_intent = $paymentId
            client_reference_id = $NPI
            customer_email = $Email
            customer_details = @{
                email = $Email
                name = $Name
            }
            customer = "cus_test_dryrun"
            amount_total = $amount
            currency = "usd"
            payment_status = "paid"
            status = "complete"
            metadata = @{
                product_type = $Product
            }
            # Line items hint for product detection
            display_items = @(
                @{
                    description = if ($Product -eq "safe-harbor") { "Safe Harbor Compliance Bundle" } else { "Sovereignty Audit Report" }
                    amount = $amount
                }
            )
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " KairoLogic Webhook Dry Run" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NPI:     $NPI"
Write-Host "Product: $Product"
Write-Host "Amount:  `$$($amount / 100)"
Write-Host "Email:   $Email"
Write-Host "Session: $sessionId"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current provider state
Write-Host "[1/4] Checking current provider state..." -ForegroundColor Yellow
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw"
}

try {
    $before = Invoke-RestMethod -Uri "https://mxrtltezhkxhqizvxvsz.supabase.co/rest/v1/registry?npi=eq.$NPI&select=npi,name,is_paid,widget_status,subscription_status,dashboard_token,risk_score&limit=1" -Headers $headers
    if ($before) {
        $p = $before[0]
        Write-Host "  Name:         $($p.name)" -ForegroundColor Gray
        Write-Host "  Score:        $($p.risk_score)" -ForegroundColor Gray
        Write-Host "  is_paid:      $($p.is_paid)" -ForegroundColor $(if ($p.is_paid) { "Red" } else { "Green" })
        Write-Host "  widget:       $($p.widget_status)" -ForegroundColor Gray
        Write-Host "  subscription: $($p.subscription_status)" -ForegroundColor Gray
        Write-Host "  token:        $(if ($p.dashboard_token) { $p.dashboard_token.Substring(0,12) + '...' } else { 'NULL' })" -ForegroundColor Gray
    } else {
        Write-Host "  Provider not found in registry!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  Failed to check provider: $_" -ForegroundColor Red
}

Write-Host ""

# Step 2: Fire the webhook
Write-Host "[2/4] Firing webhook..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$BaseUrl/api/stripe/webhook" `
        -Method POST `
        -ContentType "application/json" `
        -Body $event

    Write-Host "  Response:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "  Webhook failed: $_" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 3

# Step 3: Check provider state AFTER webhook
Write-Host "[3/4] Checking provider state after webhook..." -ForegroundColor Yellow
try {
    $after = Invoke-RestMethod -Uri "https://mxrtltezhkxhqizvxvsz.supabase.co/rest/v1/registry?npi=eq.$NPI&select=npi,name,is_paid,widget_status,subscription_status,subscription_tier,dashboard_token,trial_end_date,risk_score&limit=1" -Headers $headers
    if ($after) {
        $p = $after[0]
        Write-Host "  is_paid:      $($p.is_paid)" -ForegroundColor $(if ($p.is_paid) { "Green" } else { "Red" })
        Write-Host "  widget:       $($p.widget_status)" -ForegroundColor $(if ($p.widget_status -eq "active") { "Green" } else { "Yellow" })
        Write-Host "  subscription: $($p.subscription_status)" -ForegroundColor $(if ($p.subscription_status) { "Green" } else { "Yellow" })
        Write-Host "  tier:         $($p.subscription_tier)" -ForegroundColor Gray
        Write-Host "  token:        $(if ($p.dashboard_token) { $p.dashboard_token.Substring(0,12) + '...' } else { 'NULL (FAIL!)' })" -ForegroundColor $(if ($p.dashboard_token) { "Green" } else { "Red" })
        Write-Host "  trial_end:    $($p.trial_end_date)" -ForegroundColor Gray

        if ($p.dashboard_token) {
            Write-Host ""
            Write-Host "  Dashboard URL:" -ForegroundColor Cyan
            Write-Host "  $BaseUrl/dashboard/$NPI`?token=$($p.dashboard_token)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "  Failed to check provider: $_" -ForegroundColor Red
}

Write-Host ""

# Step 4: Check if confirmation email was sent
Write-Host "[4/4] Check your inbox at $Email for the confirmation email" -ForegroundColor Yellow
Write-Host "  Subject should be: 'Your KairoLogic ... is ready, ...'" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Dry Run Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Check email at $Email" -ForegroundColor Gray
Write-Host "  2. Click dashboard link above" -ForegroundColor Gray
Write-Host "  3. Test widget: open widget demo from E2E harness" -ForegroundColor Gray
Write-Host "  4. Test success page: $BaseUrl/payment/success?npi=$NPI&product=$Product" -ForegroundColor Gray
Write-Host ""

# Reset option
Write-Host "To reset for another test:" -ForegroundColor DarkGray
Write-Host "  UPDATE registry SET is_paid=false, dashboard_token=NULL, widget_status=NULL, subscription_status=NULL, subscription_tier=NULL, trial_end_date=NULL WHERE npi='$NPI';" -ForegroundColor DarkGray
