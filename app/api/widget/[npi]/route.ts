/**
 * KairoLogic Sentry Widget API
 * GET /api/widget/[npi]
 * 
 * Returns compliance status for the embeddable widget
 * 
 * BUSINESS RULES:
 * - Score >= COMPLIANCE_THRESHOLD: Widget visible, shows "Verified" green status
 * - Score < COMPLIANCE_THRESHOLD: Widget HIDDEN from public (returns hidden status)
 *   - Admin dashboard will show "warning/yellow" status for these records
 * - Subscription inactive: Widget hidden
 * - Admin manually sets hidden: Widget hidden
 */

import { NextRequest, NextResponse } from 'next/server';

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

// Compliance threshold - widget only visible if score >= this value
const COMPLIANCE_THRESHOLD = 75;

// CORS headers for cross-origin widget requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { npi: string } }
) {
  try {
    const npi = params.npi;

    // Validate NPI format
    if (!npi || !/^\d{10}$/.test(npi)) {
      return NextResponse.json(
        { 
          error: 'Invalid NPI', 
          message: 'NPI must be a 10-digit number' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch provider data from Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}&select=id,npi,name,url,risk_score,widget_status,subscription_status,last_scan_timestamp,updated_at,is_visible`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        // Cache for 5 minutes
        next: { revalidate: 300 }
      }
    );

    if (!response.ok) {
      console.error('[Widget API] Supabase error:', response.status);
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: 'Unable to fetch provider data' 
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const data = await response.json();

    // Provider not found in registry - but still allow scan for new NPIs
    if (!data || data.length === 0) {
      return NextResponse.json(
        { 
          npi: npi,
          widget_status: 'not_registered',
          registered: false,
          message: 'Provider not found in registry - scan available',
          // Allow them to run a scan
          scan_url: `/scan?npi=${npi}`,
          can_scan: true
        },
        { status: 200, headers: corsHeaders }  // 200 not 404 - this is valid state
      );
    }

    const provider = data[0];

    // Check subscription and widget status
    const { publicStatus, adminStatus } = determineWidgetStatus(provider);

    // If widget should be hidden from public, return minimal data
    // The widget script will not render anything
    if (publicStatus === 'hidden') {
      return NextResponse.json(
        {
          npi: provider.npi,
          widget_status: 'hidden',
          admin_status: adminStatus, // For debugging/admin reference
          message: adminStatus === 'inactive' 
            ? 'Subscription inactive' 
            : adminStatus === 'warning'
            ? 'Compliance score below threshold'
            : 'Widget hidden by administrator'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Widget is VISIBLE - return verified status with limited public data
    // Only shows when score >= COMPLIANCE_THRESHOLD
    const publicData = {
      npi: provider.npi,
      name: provider.name || 'Healthcare Provider',
      // Always show as "verified" since we only display if above threshold
      verified: true,
      compliance_score: provider.risk_score || COMPLIANCE_THRESHOLD,
      widget_status: 'verified', // Green status for public
      subscription_status: provider.subscription_status || 'active',
      last_scan_timestamp: provider.last_scan_timestamp || provider.updated_at,
      updated_at: provider.updated_at,
      // Link to results page (will show top issues only)
      report_url: `/scan/results?npi=${provider.npi}&mode=verified`
    };

    return NextResponse.json(publicData, { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 min cache
      }
    });

  } catch (error) {
    console.error('[Widget API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Server error', 
        message: 'An unexpected error occurred' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Determine the widget status based on provider data
 * 
 * PUBLIC WIDGET RULES:
 * - Only shows if score >= COMPLIANCE_THRESHOLD (75%)
 * - Below threshold = widget hidden from public
 * - Subscription inactive = widget hidden
 * - Admin override hidden = widget hidden
 */
function determineWidgetStatus(provider: {
  widget_status?: string;
  subscription_status?: string;
  is_visible?: boolean;
  risk_score?: number;
}): { publicStatus: string; adminStatus: string } {
  const score = provider.risk_score ?? 0;
  
  // Explicit admin override - hidden
  if (provider.widget_status === 'hidden') {
    return { publicStatus: 'hidden', adminStatus: 'hidden' };
  }

  // Check subscription status
  if (provider.subscription_status === 'inactive') {
    return { publicStatus: 'hidden', adminStatus: 'inactive' };
  }

  // Check visibility flag
  if (provider.is_visible === false) {
    return { publicStatus: 'hidden', adminStatus: 'hidden' };
  }

  // THRESHOLD CHECK - This is the key business rule
  // Below threshold: Widget HIDDEN from public, Admin sees WARNING/YELLOW
  if (score < COMPLIANCE_THRESHOLD) {
    return { publicStatus: 'hidden', adminStatus: 'warning' };
  }

  // Score >= threshold: Widget VISIBLE as VERIFIED/GREEN
  return { publicStatus: 'active', adminStatus: 'active' };
}

/**
 * Get risk level from score
 */
function getRiskLevel(score: number): string {
  if (score >= 75) return 'low';
  if (score >= 50) return 'medium';
  if (score >= 25) return 'high';
  return 'critical';
}
