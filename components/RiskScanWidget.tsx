import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2, Shield, Globe, Brain, Lock, MapPin, AlertTriangle } from 'lucide-react';

// Supabase Configuration - Update these with your actual values
const SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

// Technical Fixes Mapping
const TECHNICAL_FIXES = {
  'DR-01': {
    technical_finding: 'Primary EHR domain resolves to IP addresses located outside the United States. Server geolocation analysis indicates hosting infrastructure in non-US regions, violating Texas data sovereignty requirements.',
    recommended_fix: `1. Migrate hosting to US-based data centers (AWS us-east-1, us-west-2, Azure East US, or Google Cloud us-central1)
2. Update DNS A records to point to new US-based IP addresses
3. Verify BGP routing tables show US-only paths
4. Configure geo-restrictions in your hosting provider to block non-US data replication
5. Update privacy policy to reflect US-only data storage
6. Obtain compliance attestation from hosting provider confirming US data residency`,
    fix_priority: 'Critical',
    fix_complexity: 'High'
  },
  'DR-02': {
    technical_finding: 'CDN edge nodes detected serving EHR content from non-US locations. HTTP headers indicate cache nodes in EU or APAC regions, creating potential data sovereignty violations.',
    recommended_fix: `1. Configure CDN to use US-only edge locations (Cloudflare: enable "US Only" in network settings)
2. For CloudFront: Create custom cache behavior limiting distribution to US regions
3. For Fastly: Set up geo-fencing rules to restrict edge nodes to US POPs
4. Verify Via/X-Cache headers show only US datacenter codes
5. Implement origin shield in US region to prevent data transit through foreign nodes
6. Test from multiple US locations to confirm edge node compliance`,
    fix_priority: 'Critical',
    fix_complexity: 'Medium'
  },
  'DR-03': {
    technical_finding: 'Mail exchange (MX) records route through servers with OCONUS (Outside Continental US) IP addresses. PHI transmitted via email may transit foreign infrastructure.',
    recommended_fix: `1. Update MX records to point to US-based mail servers only
2. If using Google Workspace: Enable "Data regions" policy to restrict to US
3. If using Microsoft 365: Configure "Data Residency" to US regions only
4. For custom mail servers: Migrate to US-based hosting (AWS SES in us-east-1)
5. Configure SMTP relay restrictions to prevent routing through foreign servers
6. Implement DANE/DNSSEC to prevent MX record hijacking
7. Add SPF/DKIM records specifying US-only authorized mail servers`,
    fix_priority: 'High',
    fix_complexity: 'Medium'
  },
  'DR-04': {
    technical_finding: 'Third-party JavaScript resources and API endpoints detected with hosting infrastructure outside US borders. Analytics, chat widgets, or scheduling tools may transmit PHI to foreign servers.',
    recommended_fix: `1. Audit all 3rd-party scripts with network trace (use Chrome DevTools Network tab)
2. Replace or proxy foreign-hosted resources:
   - Self-host analytics scripts (Plausible self-hosted, Matomo)
   - Use US-based alternatives (PostHog US region, Amplitude US data centers)
3. For essential foreign services: Implement server-side proxy to sanitize/anonymize PHI
4. Add Content-Security-Policy header restricting script sources to US domains
5. Use Subresource Integrity (SRI) hashes to prevent tampering
6. Conduct quarterly vendor audits requiring data residency attestations`,
    fix_priority: 'High',
    fix_complexity: 'High'
  },
  'AI-01': {
    technical_finding: 'No conspicuous disclosure found indicating use of artificial intelligence in patient care pathways. Homepage and patient-facing pages lack required "clear and conspicuous" AI usage notice.',
    recommended_fix: `1. Add prominent AI disclosure banner to homepage above fold:
   Example: "This practice uses AI-assisted tools to support clinical decision-making. A licensed practitioner reviews all AI-generated recommendations."
2. Place disclosure on patient portal login page
3. Include in patient intake forms (digital and paper)
4. Add to privacy policy with specific AI tool descriptions
5. Use minimum 14px font, high contrast (WCAG AA compliant)
6. HTML example:
   <div class="ai-disclosure" style="background: #FFF3CD; padding: 15px; margin: 20px 0; border-left: 4px solid #FFA500;">
     <strong>AI Disclosure:</strong> We use artificial intelligence tools...
   </div>`,
    fix_priority: 'High',
    fix_complexity: 'Low'
  },
  'AI-02': {
    technical_finding: 'AI disclosure links detected with obscured visibility properties. CSS analysis shows font-size < 12px, low opacity, or negative z-index indicating "dark pattern" design to hide disclosures.',
    recommended_fix: `1. Remove all CSS properties that reduce visibility:
   - Set font-size to minimum 14px
   - Remove opacity < 1.0
   - Remove display: none or visibility: hidden
   - Ensure z-index >= 0 (no stacking below other elements)
2. Use high contrast colors (minimum 4.5:1 ratio per WCAG)
3. Place disclosure links in primary navigation or footer
4. Avoid light gray text on white backgrounds
5. CSS example for compliant link:
   .ai-disclosure-link {
     font-size: 16px;
     color: #0066CC;
     text-decoration: underline;
     font-weight: 500;
   }
6. Test with WAVE accessibility tool to verify visibility`,
    fix_priority: 'Critical',
    fix_complexity: 'Low'
  },
  'AI-03': {
    technical_finding: 'AI-powered diagnostic tools (symptom checkers, risk calculators) lack mandatory disclaimer stating that licensed practitioner has reviewed AI output before clinical use.',
    recommended_fix: `1. Add disclaimer directly adjacent to AI diagnostic outputs:
   "This AI-generated assessment has been reviewed and approved by Dr. [Name], MD [License #]"
2. Implement workflow requiring practitioner sign-off before results shown to patient
3. Add audit trail capturing:
   - AI recommendation timestamp
   - Practitioner review timestamp
   - Practitioner ID and license number
4. Update informed consent forms to explain AI role and human oversight
5. HTML example:
   <div class="practitioner-review">
     [OK] Reviewed by Dr. Jane Smith, MD (License #12345) on [Date]
   </div>
6. Store attestations in EHR for compliance audits`,
    fix_priority: 'Critical',
    fix_complexity: 'Medium'
  },
  'AI-04': {
    technical_finding: 'Interactive chatbot systems lack initial disclosure notice. Users are not informed they are interacting with AI rather than human staff at conversation initiation.',
    recommended_fix: `1. Display AI disclosure as first message in chat window:
   "Hi! I'm an AI assistant. A human team member can take over at any time. How can I help?"
2. Add persistent indicator in chat interface (e.g., "AI Assistant" badge)
3. Provide "Speak to Human" button prominently displayed
4. Log user consent to interact with AI
5. Example implementation (JavaScript):
   chatbot.onOpen(() => {
     chatbot.sendMessage({
       text: "You're chatting with an AI assistant...",
       type: 'system-notice',
       dismissible: false
     });
   });
6. Include disclosure in chat widget footer: "AI-Powered Chat"`,
    fix_priority: 'High',
    fix_complexity: 'Low'
  },
  'ER-01': {
    technical_finding: 'Patient intake forms lack required "Biological Sex" field with distinct Male/Female options based on reproductive biology. Form may use gender identity field instead of biological sex.',
    recommended_fix: `1. Add "Biological Sex" field to patient registration form (separate from gender identity)
2. Label field clearly: "Biological Sex (assigned at birth based on reproductive system)"
3. Provide only two options: Male / Female
4. Add help text: "Based on reproductive gamete production (sperm/ova)"
5. HTML form example:
   <label>Biological Sex (Required by Texas Law)*</label>
   <select name="biological_sex" required>
     <option value="">Select...</option>
     <option value="Male">Male</option>
     <option value="Female">Female</option>
   </select>
6. Store in EHR as separate field from gender identity
7. Update database schema if needed to add biological_sex column
8. Optionally maintain separate "Gender Identity" field for comprehensive care`,
    fix_priority: 'Critical',
    fix_complexity: 'Low'
  },
  'ER-02': {
    technical_finding: 'Patient portal lacks distinct authentication and access pathway for parents/legal guardians of minor patients. No clear mechanism for parental access to minor records without impediments.',
    recommended_fix: `1. Create separate "Guardian/Parent Portal" section with dedicated login
2. Implement guardian verification workflow:
   - Verify legal relationship (birth certificate, custody papers)
   - Multi-factor authentication
   - Audit log of all guardian access
3. Provide unrestricted access to minor's complete medical record (no "dark patterns")
4. Add "Link Dependent" feature for parents to manage multiple children
5. Display notice: "As parent/legal guardian, you have full access to your minor child's health records per Texas law"
6. Remove any age-based access restrictions for parents of minors under 18
7. Ensure no artificial delays or obstacles in guardian registration
8. Technical implementation:
   - Add guardian_relationships table
   - Implement role-based access control (RBAC) with "guardian" role
   - Auto-grant full record access to verified guardians`,
    fix_priority: 'Critical',
    fix_complexity: 'High'
  },
  'ER-03': {
    technical_finding: 'Patient portal lacks specific documentation fields or communication options for metabolic health, nutrition, and dietary counseling as required for comprehensive care tracking.',
    recommended_fix: `1. Add dedicated "Metabolic Health & Nutrition" section to patient portal
2. Include tracking fields:
   - Dietary preferences and restrictions
   - Nutrition goals
   - Metabolic markers (A1C, fasting glucose, lipid panel)
   - Weight and BMI trends
3. Enable messaging with dietitian/nutritionist
4. Provide space for meal plans and dietary recommendations
5. Add structured data fields:
   <form>
     <label>Current Diet Type:</label>
     <select name="diet_type">
       <option>Standard</option>
       <option>Diabetic</option>
       <option>Low-carb</option>
       <option>Mediterranean</option>
     </select>
     <label>Metabolic Health Goals:</label>
     <textarea name="metabolic_goals"></textarea>
   </form>
6. Integrate with EHR for clinician visibility
7. Generate automated metabolic health summaries for provider review`,
    fix_priority: 'Medium',
    fix_complexity: 'Medium'
  },
  'ER-04': {
    technical_finding: 'Patient registration forms contain prohibited data fields collecting credit scores, voter registration status, or other explicitly forbidden personal information not relevant to healthcare.',
    recommended_fix: `1. Immediately remove prohibited fields from all forms:
   - Credit score
   - Credit rating
   - Voter registration status
   - Political affiliation
   - Any non-medical personal data
2. Audit database schema to identify and drop prohibited columns
3. Purge existing prohibited data per data retention policy
4. Update form validation to reject submissions with these fields
5. Review HIPAA minimum necessary standard
6. Allowed fields: Name, DOB, SSN (for billing), contact info, insurance, medical history
7. SQL cleanup example:
   ALTER TABLE patients DROP COLUMN IF EXISTS credit_score;
   ALTER TABLE patients DROP COLUMN IF EXISTS voter_status;
8. Update privacy policy to clarify only healthcare-relevant data collected
9. Train staff on prohibited data collection practices`,
    fix_priority: 'Critical',
    fix_complexity: 'Medium'
  }
};

interface RiskScanWidgetProps {
  initialNPI?: string;
  initialURL?: string;
  initialEmail?: string;
  autoStart?: boolean;
  onScanComplete?: (results: any) => void;
}

const RiskScanWidget: React.FC<RiskScanWidgetProps> = ({
  initialNPI = '',
  initialURL = '',
  initialEmail = '',
  autoStart = false,
  onScanComplete
}) => {
  const [npi, setNpi] = useState(initialNPI);
  const [url, setUrl] = useState(initialURL);
  const [email, setEmail] = useState(initialEmail);
  const [contactName, setContactName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<any>(null);
  const [scanLog, setScanLog] = useState<Array<{ message: string, type: string, timestamp: number }>>([]);

  const addLog = (message: string, type: string = 'info') => {
    setScanLog(prev => [...prev, { message, type, timestamp: Date.now() }]);
  };

  // Auto-start flag — triggers scan after component mounts
  const [shouldAutoStart, setShouldAutoStart] = useState(autoStart && !!initialNPI && !!initialURL);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Save to registry table first
  const saveToRegistry = async (scanResults: any) => {
    addLog('💾 Saving to registry...', 'info');

    try {
      // Get the provider name from scanResults or try to fetch from existing record
      let providerName = scanResults.name || scanResults.providerName;

      // If no name provided, try to get existing name from registry
      if (!providerName) {
        try {
          const existingResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/registry?npi=eq.${scanResults.npi}&select=name`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              }
            }
          );
          const existingData = await existingResponse.json();
          if (existingData && existingData.length > 0 && existingData[0].name) {
            providerName = existingData[0].name;
          }
        } catch (e) {
          // Ignore errors, will use fallback
        }
      }

      // Fallback to "Provider [NPI]" if still no name
      if (!providerName) {
        providerName = `Provider ${scanResults.npi}`;
      }

      const registryData = {
        id: `TX-${scanResults.npi}-${Math.random().toString(36).substr(2, 5)}`,
        name: providerName,
        npi: scanResults.npi,
        url: scanResults.url,
        email: scanResults.email || email || initialEmail || null,
        risk_score: scanResults.riskScore,
        risk_level: scanResults.riskLevel,
        risk_meter_level: scanResults.riskMeterLevel,
        overall_compliance_status: scanResults.complianceStatus,
        last_scan_timestamp: new Date().toISOString(),
        widget_status: scanResults.riskScore >= 90 ? 'active' : 'warning',
        updated_at: new Date().toISOString()
      };

      // Try UPDATE first (PATCH) using NPI as the identifier, if no rows affected, then INSERT (POST)
      addLog('Attempting to update existing registry entry...', 'info');

      let response = await fetch(
        `${SUPABASE_URL}/rest/v1/registry?npi=eq.${scanResults.npi}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation,count=exact'
          },
          body: JSON.stringify({
            url: registryData.url,
            email: registryData.email || undefined,
            risk_score: registryData.risk_score,
            risk_level: registryData.risk_level,
            risk_meter_level: registryData.risk_meter_level,
            overall_compliance_status: registryData.overall_compliance_status,
            last_scan_timestamp: registryData.last_scan_timestamp,
            widget_status: registryData.widget_status,
            updated_at: registryData.updated_at
          })
        }
      );

      // Check if PATCH actually updated any rows
      const patchData = await response.json().catch(() => []);
      const patchedRows = Array.isArray(patchData) ? patchData.length : 0;

      // If no rows were updated (NPI not in registry), UPSERT a new record
      if (patchedRows === 0) {
        addLog('No existing entry found, creating new provider record...', 'info');

        // Build UPSERT payload with only known registry columns
        const insertData: Record<string, any> = {
          id: `TX-${scanResults.npi}-${Math.random().toString(36).substr(2, 5)}`,
          name: registryData.name,
          npi: scanResults.npi,
          url: scanResults.url,
          email: registryData.email || null,
          risk_score: registryData.risk_score,
          risk_level: registryData.risk_level,
          last_scan_timestamp: registryData.last_scan_timestamp,
          widget_status: registryData.widget_status,
          widget_id: `WID-${scanResults.npi}-${Date.now().toString(36)}`,
          updated_at: registryData.updated_at
        };

        addLog(`UPSERT payload: ${JSON.stringify(Object.keys(insertData))}`, 'info');

        response = await fetch(
          `${SUPABASE_URL}/rest/v1/registry?on_conflict=npi`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Prefer': 'return=minimal,resolution=merge-duplicates'
            },
            body: JSON.stringify(insertData)
          }
        );

        if (!response.ok) {
          const errText = await response.text().catch(() => 'unknown');
          addLog(`[ERROR] INSERT failed (${response.status}): ${errText}`, 'warning');
        }
      }

      if (response.ok || response.status === 201 || response.status === 204) {
        addLog('[OK] Registry entry saved', 'success');

        // Verify the entry exists
        await delay(500);

        const verifyResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/registry?npi=eq.${scanResults.npi}`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );

        const verification = await verifyResponse.json();

        if (verification && verification.length > 0) {
          addLog('[OK] Registry entry verified', 'success');
          return true;
        } else {
          addLog('[WARN] Registry entry not found after save', 'warning');
          return false;
        }
      } else {
        const error = await response.text();
        addLog(`[WARN] Registry save failed`, 'warning');
        console.error('Registry save error:', error);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`[WARN] Registry save failed: ${errorMessage}`, 'warning');
      console.error('Registry error:', error);
      return false;
    }
  };

  // Save violations to Supabase
  const saveViolationsToSupabase = async (registryId: string, findings: any[]) => {
    const failedFindings = findings.filter(f => f.status === 'fail');

    if (failedFindings.length === 0) {
      addLog('[OK] No violations to save', 'success');
      return;
    }

    addLog(`💾 Saving ${failedFindings.length} violations to database...`, 'info');

    try {
      const violations = failedFindings.map((finding: any) => {
        const fixInfo = (TECHNICAL_FIXES as any)[finding.id] || {
          technical_finding: finding.detail,
          recommended_fix: 'Contact KairoLogic for detailed remediation guidance.',
          fix_priority: 'Medium',
          fix_complexity: 'Medium'
        };

        return {
          registry_id: registryId,
          violation_id: finding.id,
          violation_name: finding.name,
          violation_clause: finding.clause,
          technical_finding: fixInfo.technical_finding,
          recommended_fix: fixInfo.recommended_fix,
          fix_priority: fixInfo.fix_priority,
          fix_complexity: fixInfo.fix_complexity,
          captured_at: new Date().toISOString()
        };
      });

      // Call Supabase REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/violation_evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(violations)
      });

      if (response.ok) {
        addLog(`[OK] Saved ${violations.length} violations to database`, 'success');
        return true;
      } else {
        const error = await response.text();
        addLog(`[WARN] Database save failed: ${error}`, 'warning');
        console.error('Supabase save error:', error);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`[WARN] Database connection failed: ${errorMessage}`, 'warning');
      console.error('Supabase error:', error);
      return false;
    }
  };

  // Simulated WAF/Firewall detection - now just a status indicator
  const stealthProbe = async (targetUrl: string) => {
    addLog('🕵️ Initializing Sentry Engine v2.0...', 'info');
    await delay(300);
    addLog('[OK] Engine initialized', 'success');
    return { wafDetected: false, canProceed: true };
  };

  // ─── REAL SCAN via API ─────────────────────────────────
  // Calls /api/scan which performs actual network forensics:
  // - DNS resolution + IP geolocation
  // - HTTP header analysis for CDN/edge nodes
  // - MX record verification
  // - Page content crawl for AI disclosures & form analysis

  const runRealScan = async (targetUrl: string, targetNpi: string) => {
    setCurrentPhase('Connecting to Sentry API...');
    addLog('🚀 Dispatching scan request to Sentry Engine v2.0...', 'info');
    setProgress(15);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npi: targetNpi, url: targetUrl }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `API returned ${response.status}`);
      }

      const data = await response.json();

      // Stream progress through findings for UX
      setProgress(20);
      setCurrentPhase('Data Sovereignty & Residency (SB 1188)');
      addLog('📍 Phase 1: Data Sovereignty Checks...', 'info');

      for (const f of data.findings.filter((f: any) => f.id.startsWith('DR-'))) {
        await delay(400);
        const icon = f.status === 'pass' ? '[OK]' : f.status === 'fail' ? '✗' : '⚠';
        const type = f.status === 'pass' ? 'success' : f.status === 'fail' ? 'error' : 'warning';
        addLog(`${icon} ${f.id}: ${f.detail.substring(0, 100)}${f.detail.length > 100 ? '...' : ''}`, type);
      }

      setProgress(45);
      setCurrentPhase('AI Transparency & Disclosure (HB 149)');
      addLog('🤖 Phase 2: AI Transparency Checks...', 'info');

      for (const f of data.findings.filter((f: any) => f.id.startsWith('AI-'))) {
        await delay(350);
        const icon = f.status === 'pass' ? '[OK]' : f.status === 'fail' ? '✗' : '⚠';
        const type = f.status === 'pass' ? 'success' : f.status === 'fail' ? 'error' : 'warning';
        addLog(`${icon} ${f.id}: ${f.detail.substring(0, 100)}${f.detail.length > 100 ? '...' : ''}`, type);
      }

      setProgress(70);
      setCurrentPhase('EHR System Integrity');
      addLog('🔒 Phase 3: EHR Integrity Checks...', 'info');

      for (const f of data.findings.filter((f: any) => f.id.startsWith('ER-'))) {
        await delay(300);
        const icon = f.status === 'pass' ? '[OK]' : f.status === 'fail' ? '✗' : '⚠';
        const type = f.status === 'pass' ? 'success' : f.status === 'fail' ? 'error' : 'warning';
        addLog(`${icon} ${f.id}: ${f.detail.substring(0, 100)}${f.detail.length > 100 ? '...' : ''}`, type);
      }

      setProgress(85);

      // NPI verification status
      if (data.npiVerification) {
        if (data.npiVerification.valid) {
          addLog(`[OK] NPI Verified: ${data.npiVerification.name} (${data.npiVerification.type}) - ${data.npiVerification.specialty}`, 'success');
        } else {
          addLog('⚠ NPI not found in CMS NPPES registry', 'warning');
        }
      }

      // Scan metadata
      if (data.meta) {
        addLog(`📊 Engine: ${data.meta.engine} | Duration: ${data.meta.duration} | Checks: ${data.meta.checksRun} (${data.meta.checksPass} pass, ${data.meta.checksFail} fail, ${data.meta.checksWarn} warn)`, 'info');
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`[ERROR] Sentry API Error: ${errorMessage}`, 'error');
      addLog('Falling back to limited client-side checks...', 'warning');
      throw error;
    }
  };

  const calculateRiskScore = (allFindings: any[]) => {
    const totalChecks = allFindings.length;
    const passedChecks = allFindings.filter((f: any) => f.status === 'pass').length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    let riskLevel = 'High';
    let riskMeterLevel = 'Violation';

    if (score >= 67) {
      riskLevel = 'Low';
      riskMeterLevel = 'Sovereign';
    } else if (score >= 34) {
      riskLevel = 'Moderate';
      riskMeterLevel = 'Drift';
    }

    return { score, riskLevel, riskMeterLevel };
  };

  const runScan = async () => {
    if (!npi || !url) {
      addLog('[ERROR] Please provide both NPI and URL', 'error');
      return;
    }

    setScanning(true);
    setProgress(0);
    setResults(null);
    setScanLog([]);

    try {
      addLog(`🚀 Starting Sentry compliance scan for NPI: ${npi}`, 'info');
      addLog(`Target: ${url}`, 'info');

      // Initialize
      const stealthResult = await stealthProbe(url);
      setProgress(10);

      // ── Call real scan API ──
      let scanData;
      let allFindings;
      let score, riskLevel, riskMeterLevel;

      try {
        scanData = await runRealScan(url, npi);
        allFindings = scanData.findings;
        score = scanData.riskScore;
        riskLevel = scanData.riskLevel;
        riskMeterLevel = scanData.riskMeterLevel;
      } catch {
        // If API fails, we can't produce real results
        addLog('[ERROR] Real scan failed. Cannot produce compliance results without server-side analysis.', 'error');
        setScanning(false);
        return;
      }

      const topIssues = scanData.topIssues || allFindings
        .filter((f: any) => f.status === 'fail')
        .slice(0, 5)
        .map((f: any) => ({ id: f.id, name: f.name, clause: f.clause }));

      setProgress(90);
      addLog('📊 Finalizing risk profile...', 'info');

      // Try to get provider name from session storage or NPI verification
      let providerName = '';
      let providerEmail = email || '';
      try {
        const storedData = sessionStorage.getItem('scanData');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          providerName = parsed.name || '';
          if (!providerEmail) providerEmail = parsed.email || '';
        }
      } catch {
        // Ignore
      }
      if (!providerName && scanData.npiVerification?.name) {
        providerName = scanData.npiVerification.name;
      }

      const scanResults = {
        npi,
        url,
        email: providerEmail || email || '',
        name: providerName,
        providerName,
        riskScore: score,
        riskLevel,
        riskMeterLevel,
        complianceStatus: scanData.complianceStatus || (score >= 67 ? 'Sovereign' : score >= 34 ? 'Drift' : 'Violation'),
        findings: allFindings,
        topIssues,
        categoryScores: scanData.categoryScores || null,
        dataBorderMap: scanData.dataBorderMap || [],
        pageContext: scanData.pageContext || null,
        scanTimestamp: Date.now(),
        scanDuration: scanData.scanDuration,
        engineVersion: scanData.engineVersion,
        npiVerification: scanData.npiVerification,
        wafDetected: stealthResult.wafDetected
      };

      setProgress(95);
      addLog('💾 Saving results to registry...', 'info');

      // Save to registry
      await saveToRegistry(scanResults);

      // Save violations
      await saveViolationsToSupabase(npi, allFindings);

      // Auto-create prospect record for admin pipeline
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/prospects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            source: 'scan',
            source_detail: 'public_risk_scan',
            practice_name: providerName || 'Unknown Provider',
            contact_name: contactName || null,
            npi: npi,
            email: providerEmail || null,
            website_url: url,
            scan_score: score,
            scan_risk_level: scanResults.riskLevel,
            status: 'new',
            priority: score < 34 ? 'urgent' : score < 67 ? 'high' : 'normal',
            is_read: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
        addLog('[OK] Prospect record created', 'success');
      } catch {
        addLog('[WARN] Prospect creation skipped (non-critical)', 'warning');
      }

      // Auto-generate forensic report and store in scan_reports table
      addLog('📄 Generating forensic audit report...', 'info');
      let reportId = '';
      try {
        const reportResponse = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            npi,
            url,
            riskScore: score,
            complianceStatus: scanData.complianceStatus || (score >= 67 ? 'Sovereign' : score >= 34 ? 'Drift' : 'Violation'),
            findings: allFindings,
            categoryScores: scanData.categoryScores,
            dataBorderMap: scanData.dataBorderMap,
            pageContext: scanData.pageContext,
            npiVerification: scanData.npiVerification,
            engineVersion: scanData.engineVersion,
            scanDuration: scanData.scanDuration,
            providerName,
            name: providerName,
            meta: scanData.meta
          })
        });
        if (reportResponse.ok) {
          const reportResult = await reportResponse.json();
          reportId = reportResult.reportId || '';
          addLog(`[OK] Forensic report stored: ${reportId}`, 'success');
        } else {
          addLog('[WARN] Report storage failed (non-critical)', 'warning');
        }
      } catch {
        addLog('[WARN] Report generation skipped (non-critical)', 'warning');
      }

      // Try edge functions (non-blocking)
      try {
        await fetch(
          'https://mxrtltezhkxhqizvxvsz.supabase.co/functions/v1/calculate-risk',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npi, url, findings: allFindings, scanTimestamp: Date.now() })
          }
        );
      } catch {
        // Non-critical
      }

      setProgress(100);
      addLog(`[OK] Scan complete! Score: ${score}/100 (${riskMeterLevel})`, 'success');
      if (reportId) {
        addLog(`📋 Report ID: ${reportId}`, 'info');
        // Update registry record with report link
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npi}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                report_status: 'generated',
                latest_report_url: `/api/report?reportId=${reportId}`
              })
            }
          );
          addLog('[OK] Registry updated with report link', 'success');
        } catch {
          addLog('[WARN] Registry report link update skipped', 'warning');
        }
      }
      setResults({ ...scanResults, reportId });

      // Send email notifications (non-blocking)
      try {
        // Build findings summary for email
        const topFindingsSummary = topIssues.slice(0, 5).map((f: { name?: string; id?: string; status?: string; detail?: string }) =>
          `${f.status === 'fail' ? '❌' : f.status === 'warn' ? '⚠️' : '✅'} ${f.name || f.id}: ${(f.detail || '').substring(0, 120)}`
        ).join('\n');

        const emailPayload = {
          template_slug: 'immediate-summary',
          npi,
          score,
          url,
          risk_level: riskLevel,
          findings_summary: topFindingsSummary,
          findings_count: allFindings.length,
          fail_count: allFindings.filter((f: { status?: string }) => f.status === 'fail').length,
          warn_count: allFindings.filter((f: { status?: string }) => f.status === 'warn').length,
          pass_count: allFindings.filter((f: { status?: string }) => f.status === 'pass').length,
        };

        // 1. Send scan results to provider (if email provided)
        if (providerEmail) {
          addLog(`📧 Sending results to ${providerEmail}...`, 'info');
          fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...emailPayload, variables: { email: providerEmail, practice_name: providerName || 'Provider' } })
          }).then(() => addLog('[OK] Results email sent to provider', 'success'))
            .catch(() => addLog('[WARN] Provider email failed', 'warning'));
        }

        // 2. Always send admin notification
        fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...emailPayload, variables: { email: 'compliance@kairologic.com', practice_name: providerName || `NPI: ${npi}`, _force_internal: 'true' } })
        }).catch(() => { });
      } catch {
        // Non-critical
      }

      if (onScanComplete) {
        onScanComplete({ ...scanResults, reportId });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`[ERROR] Scan failed: ${errorMessage}`, 'error');
    } finally {
      setScanning(false);
      setCurrentPhase('');
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('Data')) return <Globe className="w-5 h-5" />;
    if (category.includes('AI')) return <Brain className="w-5 h-5" />;
    if (category.includes('EHR')) return <Lock className="w-5 h-5" />;
    return <Shield className="w-5 h-5" />;
  };

  // Auto-start scan when arriving from input form
  React.useEffect(() => {
    if (shouldAutoStart && !scanning && !results) {
      setShouldAutoStart(false);
      const timer = setTimeout(() => runScan(), 300);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoStart, scanning, results]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-800">Texas Healthcare Compliance Scanner</h2>
        </div>
        <p className="text-sm text-slate-600">SB1188 & HB149 Compliance Verification</p>
      </div>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Provider NPI <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={npi}
              onChange={(e) => setNpi(e.target.value)}
              placeholder="1234567890"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Website URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example-practice.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Dr. Jane Smith"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email <span className="text-gray-400 font-normal">(for results)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="office@yourpractice.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={scanning}
            />
          </div>
        </div>

        <button
          onClick={runScan}
          disabled={scanning || !npi || !url}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {scanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              Run Risk Scan
            </>
          )}
        </button>
      </div>

      {/* Progress Section */}
      {scanning && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">{currentPhase}</span>
              <span className="text-sm font-medium text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Live Log */}
          <div className="mt-4 bg-slate-50 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs">
            {scanLog.map((log: any, idx: number) => (
              <div
                key={idx}
                className={`mb-1 ${log.type === 'error' ? 'text-red-600' :
                    log.type === 'success' ? 'text-green-600' :
                      log.type === 'warning' ? 'text-amber-600' :
                        'text-slate-600'
                  }`}
              >
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="bg-white p-6 rounded-lg shadow-sm">

          {/* Page Context Banner */}
          {results.pageContext && (
            <div className="mb-4 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-sm text-slate-600">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Scanned page type: <strong className="text-slate-800 capitalize">{results.pageContext.type?.replace(/_/g, ' ') || 'General'}</strong></span>
              {results.pageContext.pageTitle && results.pageContext.pageTitle !== 'Unknown' && (
                <span className="text-slate-400 ml-1">— &quot;{results.pageContext.pageTitle.substring(0, 60)}&quot;</span>
              )}
              {results.pageContext.hasPatientPortal && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Portal Detected</span>}
              {results.pageContext.hasChatbot && <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">Chatbot Detected</span>}
            </div>
          )}

          {/* Composite Score + Category Breakdown */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Composite Compliance Score</h3>
                <p className="text-sm text-slate-600">NPI: {results.npi}</p>
                {results.engineVersion && <p className="text-xs text-slate-400 mt-0.5">Engine: {results.engineVersion}</p>}
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${results.riskScore >= 67 ? 'text-green-600' :
                    results.riskScore >= 34 ? 'text-amber-600' :
                      'text-red-600'
                  }`}>{results.riskScore}%</div>
                <div className={`text-sm font-semibold px-3 py-0.5 rounded-full inline-block mt-1 ${results.riskMeterLevel === 'Sovereign' ? 'bg-green-100 text-green-700' :
                    results.riskMeterLevel === 'Drift' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                  }`}>
                  {results.riskMeterLevel}
                </div>
              </div>
            </div>

            {/* Category Score Breakdown */}
            {results.categoryScores && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Category Breakdown — Path to 100%</h4>
                <div className="space-y-3">
                  {[
                    { key: 'data_sovereignty', label: 'Data Residency', icon: <Globe className="w-4 h-4" />, weight: '45%' },
                    { key: 'ai_transparency', label: 'AI Transparency', icon: <Brain className="w-4 h-4" />, weight: '30%' },
                    { key: 'clinical_integrity', label: 'Clinical Integrity', icon: <Lock className="w-4 h-4" />, weight: '25%' },
                  ].map((cat) => {
                    const catScore = results.categoryScores[cat.key];
                    if (!catScore) return null;
                    const pct = catScore.percentage;
                    const barColor = pct >= 67 ? 'bg-green-500' : pct >= 34 ? 'bg-amber-500' : 'bg-red-500';
                    const textColor = pct >= 67 ? 'text-green-700' : pct >= 34 ? 'text-amber-700' : 'text-red-700';
                    const bgColor = pct >= 67 ? 'bg-green-50' : pct >= 34 ? 'bg-amber-50' : 'bg-red-50';
                    return (
                      <div key={cat.key} className={`p-3 rounded-lg ${bgColor}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            {cat.icon}
                            <span>{cat.label}</span>
                            <span className="text-xs text-slate-400 font-normal">(weight: {cat.weight})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${textColor}`}>{pct}%</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catScore.level === 'Sovereign' ? 'bg-green-200 text-green-800' :
                                catScore.level === 'Drift' ? 'bg-amber-200 text-amber-800' :
                                  'bg-red-200 text-red-800'
                              }`}>{catScore.level}</span>
                          </div>
                        </div>
                        <div className="w-full bg-white/60 rounded-full h-2 mb-1">
                          <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs text-slate-500">
                          {catScore.passed}/{catScore.findings} passed
                          {catScore.failed > 0 && <span className="text-red-600 ml-1">• {catScore.failed} failed</span>}
                          {catScore.warnings > 0 && <span className="text-amber-600 ml-1">• {catScore.warnings} warning{catScore.warnings > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Data Border Map — snippet with category counts */}
          {results.dataBorderMap && results.dataBorderMap.length > 0 && (() => {
            const nodes = results.dataBorderMap;
            const total = nodes.length;
            const usCount = nodes.filter((n: any) => n.isSovereign).length;
            const foreign = nodes.filter((n: any) => !n.isSovereign);
            const foreignPHI = foreign.filter((n: any) => n.phiRisk === 'direct');
            const byType: Record<string, number> = {};
            nodes.forEach((n: any) => { byType[n.type || 'other'] = (byType[n.type || 'other'] || 0) + 1; });
            const preview = nodes.slice(0, 3);
            const remaining = total - preview.length;

            return (
              <div className="mb-6 border border-slate-200 rounded-lg overflow-hidden">
                {/* Header bar */}
                <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-sm">Data Border Map</span>
                    <span className="text-slate-400 text-xs ml-1">{total} endpoints analyzed</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-400 font-semibold">🇺🇸 {usCount} US</span>
                    {foreign.length > 0 && <span className="text-amber-400 font-semibold">🌍 {foreign.length} foreign</span>}
                    {foreignPHI.length > 0 && <span className="text-red-400 font-bold">⚠ {foreignPHI.length} PHI risk</span>}
                  </div>
                </div>

                {/* Type counts bar */}
                <div className="bg-slate-50 px-5 py-2 flex items-center gap-3 border-b border-slate-200 text-xs">
                  {Object.entries(byType).map(([type, count]) => (
                    <span key={type} className={`px-2 py-0.5 rounded-full font-medium ${type === 'primary' ? 'bg-blue-100 text-blue-700' :
                        type === 'mail' ? 'bg-purple-100 text-purple-700' :
                          type === 'cdn' ? 'bg-sky-100 text-sky-700' :
                            'bg-slate-100 text-slate-600'
                      }`}>
                      {count} {type}
                    </span>
                  ))}
                </div>

                {/* Preview items */}
                <div className="divide-y divide-slate-100">
                  {preview.map((node: any, idx: number) => {
                    const isUS = node.isSovereign;
                    return (
                      <div key={idx} className="px-5 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{isUS ? '🇺🇸' : '🌍'}</span>
                          <span className="font-medium text-sm text-slate-800 truncate max-w-[200px]">{node.domain}</span>
                          <span className="text-xs text-slate-400">{node.city}, {node.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${node.type === 'primary' ? 'bg-blue-50 text-blue-600' :
                              node.type === 'cdn' ? 'bg-sky-50 text-sky-600' :
                                node.type === 'mail' ? 'bg-purple-50 text-purple-600' :
                                  'bg-slate-50 text-slate-500'
                            }`}>{node.type}</span>
                          <span className={`font-semibold text-xs ${isUS ? 'text-green-600' : 'text-red-600'}`}>
                            {isUS ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer with remaining count */}
                {remaining > 0 && (
                  <div className="bg-slate-50 px-5 py-2.5 text-center border-t border-slate-200">
                    <span className="text-xs text-slate-500">+ {remaining} more endpoint{remaining > 1 ? 's' : ''} analyzed</span>
                    <span className="text-xs text-slate-400 ml-2">•</span>
                    <span className="text-xs text-blue-600 font-medium ml-2">Full map available in detailed report</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Category Summary Cards — no individual violation details */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Compliance Summary by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { prefix: 'DR-', label: 'Data Sovereignty & Residency', catKey: 'data_sovereignty', icon: <Globe className="w-6 h-6" />, statute: 'SB 1188' },
                { prefix: 'AI-', label: 'AI Transparency & Disclosure', catKey: 'ai_transparency', icon: <Brain className="w-6 h-6" />, statute: 'HB 149' },
                { prefix: 'ER-', label: 'Clinical Integrity', catKey: 'clinical_integrity', icon: <Lock className="w-6 h-6" />, statute: 'SB 1188' }
              ].map((category) => {
                const categoryFindings = results.findings?.filter((f: any) => f.id.startsWith(category.prefix)) || [];
                const catScore = results.categoryScores?.[category.catKey];
                const pct = catScore?.percentage || 0;
                const passed = categoryFindings.filter((f: any) => f.status === 'pass').length;
                const failed = categoryFindings.filter((f: any) => f.status === 'fail').length;
                const warned = categoryFindings.filter((f: any) => f.status === 'warn').length;
                const total = categoryFindings.length;
                const statusColor = pct >= 67 ? 'green' : pct >= 34 ? 'amber' : 'red';
                const statusBg = pct >= 67 ? 'from-green-50 to-emerald-50 border-green-200' : pct >= 34 ? 'from-amber-50 to-yellow-50 border-amber-200' : 'from-red-50 to-rose-50 border-red-200';
                const scoreTextColor = pct >= 67 ? 'text-green-700' : pct >= 34 ? 'text-amber-700' : 'text-red-700';
                const scoreBgColor = pct >= 67 ? 'bg-green-100' : pct >= 34 ? 'bg-amber-100' : 'bg-red-100';
                const barColor = pct >= 67 ? 'bg-green-500' : pct >= 34 ? 'bg-amber-500' : 'bg-red-500';

                return (
                  <div key={category.catKey} className={`bg-gradient-to-br ${statusBg} border rounded-xl p-5 relative overflow-hidden`}>
                    {/* Score badge - top right */}
                    <div className={`absolute top-3 right-3 ${scoreBgColor} ${scoreTextColor} text-2xl font-black px-3 py-1 rounded-lg`}>
                      {pct}%
                    </div>

                    {/* Icon + label */}
                    <div className={`${scoreTextColor} mb-3`}>
                      {category.icon}
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-0.5">{category.label}</h4>
                    <p className="text-xs text-slate-400 mb-4">{category.statute}</p>

                    {/* Progress bar */}
                    <div className="w-full bg-white/70 rounded-full h-2.5 mb-4">
                      <div className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>

                    {/* Pass / Fail / Warn counters */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                          <span className="text-green-700 font-black text-sm">{passed}</span>
                        </div>
                        <span className="text-xs text-slate-500">Pass</span>
                      </div>
                      {failed > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                            <span className="text-red-700 font-black text-sm">{failed}</span>
                          </div>
                          <span className="text-xs text-slate-500">Fail</span>
                        </div>
                      )}
                      {warned > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                            <span className="text-amber-700 font-black text-sm">{warned}</span>
                          </div>
                          <span className="text-xs text-slate-500">Warn</span>
                        </div>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">{total} checks</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══ SCORE-BASED ADAPTIVE CTA ═══ */}
            {(() => {
              const score = results.riskScore || 0;
              const failCount = results.findings?.filter((f: any) => f.status === 'fail').length || 0;
              const npiParam = results.npi || npi || '';
              const urlParam = results.url || url || '';
              const emailParam = email || '';
              const clientRef = `?client_reference_id=${npiParam}&prefilled_email=${encodeURIComponent(emailParam)}`;

              const LINKS = {
                report: `https://buy.stripe.com/test_dRm4gz9aX7ty9oz6VK4ko02${clientRef}`,
                safeHarbor: `https://buy.stripe.com/test_8x2bJ14UHbJO30b93S4ko03${clientRef}`,
                watch: `https://buy.stripe.com/test_9B614n2Mz0168kv0xm4ko01${clientRef}`,
                shield: `https://buy.stripe.com/test_5kQfZh1IveW058j7ZO4ko00${clientRef}`,
              };

              // ── TIER 1: Sovereign (80-100) ──
              if (score >= 80) {
                return (
                  <div className="mt-6 space-y-3">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-600 text-lg">🛡</span>
                        <h4 className="font-bold text-green-800 text-sm">Your score is strong — keep it that way</h4>
                      </div>
                      <p className="text-xs text-green-700 mb-4">
                        Plugin updates, hosting changes, and new scripts can silently break your compliance overnight. Sentry Watch monitors your site and alerts you the moment something drifts.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a href={LINKS.watch} target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-2">
                          <Shield className="w-4 h-4" />
                          Sentry Watch — $39/mo
                        </a>
                        <a href={LINKS.report} target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-2">
                          Full Audit Report — $149
                        </a>
                      </div>
                      <p className="text-[10px] text-green-600 mt-2 text-center">Watch includes drift alerts, automated re-scans, and monthly reports</p>
                    </div>

                    {/* Shield upsell — prominent */}
                    <a href={LINKS.shield} target="_blank" rel="noopener noreferrer"
                      className="block w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-600 text-white font-semibold py-3.5 px-4 rounded-xl text-center transition-all">
                      <span className="text-sm">Upgrade to Sentry Shield — $79/mo</span>
                      <span className="block text-[11px] text-slate-400 font-normal mt-0.5">Adds live dashboard, quarterly forensic reports &amp; annual certification seal</span>
                    </a>
                  </div>
                );
              }

              // ── TIER 2: Drift (50-79) ──
              if (score >= 50) {
                return (
                  <div className="mt-6">
                    <div className="mb-3">
                      <h4 className="font-bold text-slate-800 text-sm">You have {failCount} fixable issue{failCount !== 1 ? 's' : ''} — choose your path:</h4>
                    </div>
                    <div className="space-y-2.5">

                      {/* Option 1: Report Only */}
                      <a href={LINKS.report} target="_blank" rel="noopener noreferrer"
                        className="block border border-slate-200 hover:border-amber-300 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">📋</span>
                              <span className="font-bold text-slate-800 text-sm">Audit Report</span>
                            </div>
                            <p className="text-xs text-slate-500">Forensic analysis with findings, border map, and remediation roadmap</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-xl font-black text-slate-800">$149</div>
                            <div className="text-[10px] text-slate-400">one-time</div>
                          </div>
                        </div>
                      </a>

                      {/* Option 2: Safe Harbor — Recommended */}
                      <a href={LINKS.safeHarbor} target="_blank" rel="noopener noreferrer"
                        className="block border-2 border-orange-400 bg-orange-50/50 rounded-xl p-4 transition-all hover:shadow-lg relative cursor-pointer">
                        <div className="absolute -top-2.5 left-4 bg-orange-500 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          Most Popular
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">🔧</span>
                              <span className="font-bold text-slate-800 text-sm">Safe Harbor&trade;</span>
                            </div>
                            <p className="text-xs text-slate-500">Everything in the Audit Report <strong>plus</strong> ready-made policies, AI disclosures, staff training, evidence templates, and implementation blueprint</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-xl font-black text-orange-600">$249</div>
                            <div className="text-[10px] text-slate-400">one-time</div>
                          </div>
                        </div>
                      </a>

                      {/* Option 3: Safe Harbor + Monitoring */}
                      <a href={LINKS.watch} target="_blank" rel="noopener noreferrer"
                        className="block border border-slate-700 bg-slate-800 rounded-xl p-4 transition-all hover:bg-slate-700 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="w-4 h-4 text-green-400" />
                              <span className="font-bold text-white text-sm">Safe Harbor + Monitoring</span>
                            </div>
                            <p className="text-xs text-slate-400">Everything in Safe Harbor + Sentry Watch keeps you compliant with drift alerts and automated re-scans</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-xl font-black text-white">$249</div>
                            <div className="text-[10px] text-slate-400">+ $39/mo</div>
                          </div>
                        </div>
                      </a>

                    </div>
                  </div>
                );
              }

              // ── TIER 3: Violation (0-49) ──
              return (
                <div className="mt-6">
                  {/* Urgency banner */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-red-700">Active Compliance Exposure</span>
                      <span className="text-xs text-red-600 ml-1">
                        — {failCount} violation{failCount !== 1 ? 's' : ''} detected. Potential penalty up to ${(failCount * 50000).toLocaleString()}.
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-bold text-slate-800 text-sm">Choose your remediation path:</h4>
                  </div>
                  <div className="space-y-2.5">

                    {/* Option 1: Report Only */}
                    <a href={LINKS.report} target="_blank" rel="noopener noreferrer"
                      className="block border border-slate-200 hover:border-red-300 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">📋</span>
                            <span className="font-bold text-slate-800 text-sm">Audit Report Only</span>
                          </div>
                          <p className="text-xs text-slate-500">Forensic analysis with findings and remediation roadmap — bring it to your own developer</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-xl font-black text-slate-800">$149</div>
                          <div className="text-[10px] text-slate-400">one-time</div>
                        </div>
                      </div>
                    </a>

                    {/* Option 2: Safe Harbor */}
                    <a href={LINKS.safeHarbor} target="_blank" rel="noopener noreferrer"
                      className="block border border-slate-200 hover:border-orange-300 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">🔧</span>
                            <span className="font-bold text-slate-800 text-sm">Safe Harbor&trade;</span>
                          </div>
                          <p className="text-xs text-slate-500">Everything in the Audit Report plus ready-made policies, AI disclosures, evidence templates, and implementation blueprint</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-xl font-black text-slate-800">$249</div>
                          <div className="text-[10px] text-slate-400">one-time</div>
                        </div>
                      </div>
                    </a>

                    {/* Option 3: Safe Harbor + Shield — Recommended */}
                    <a href={LINKS.shield} target="_blank" rel="noopener noreferrer"
                      className="block border-2 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 transition-all hover:shadow-lg relative cursor-pointer">
                      <div className="absolute -top-2.5 left-4 bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Recommended for Your Score
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-red-600" />
                            <span className="font-bold text-slate-800 text-sm">Safe Harbor + Sentry Shield</span>
                          </div>
                          <p className="text-xs text-slate-500">Everything in Safe Harbor + continuous monitoring, quarterly reports, live dashboard, and annual certification</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-xl font-black text-red-700">$249</div>
                          <div className="text-[10px] text-slate-400">+ $79/mo</div>
                        </div>
                      </div>
                    </a>

                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskScanWidget;