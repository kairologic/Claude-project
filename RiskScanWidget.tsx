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
  onScanComplete?: (results: any) => void;
}

const RiskScanWidget: React.FC<RiskScanWidgetProps> = ({ 
  initialNPI = '', 
  initialURL = '', 
  onScanComplete 
}) => {
  const [npi, setNpi] = useState(initialNPI);
  const [url, setUrl] = useState(initialURL);
  const [scanning, setScanning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<any>(null);
  const [scanLog, setScanLog] = useState<Array<{message: string, type: string, timestamp: number}>>([]);

  const addLog = (message: string, type: string = 'info') => {
    setScanLog(prev => [...prev, { message, type, timestamp: Date.now() }]);
  };

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
        risk_score: scanResults.riskScore,
        risk_level: scanResults.riskLevel,
        risk_meter_level: scanResults.riskMeterLevel,
        overall_compliance_status: scanResults.complianceStatus,
        last_scan_timestamp: new Date().toISOString(),
        widget_status: scanResults.riskScore >= 75 ? 'active' : 'warning',
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

      // If no rows were updated (NPI not in registry), INSERT a new record
      if (patchedRows === 0) {
        addLog('No existing entry found, creating new provider record...', 'info');
        response = await fetch(
          `${SUPABASE_URL}/rest/v1/registry`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(registryData)
          }
        );
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
      try {
        const storedData = sessionStorage.getItem('scanData');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          providerName = parsed.name || '';
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
      }
      setResults({ ...scanResults, reportId });
      
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
              Provider NPI
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
              Website URL
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
                className={`mb-1 ${
                  log.type === 'error' ? 'text-red-600' :
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
                <div className={`text-4xl font-bold ${
                  results.riskScore >= 67 ? 'text-green-600' :
                  results.riskScore >= 34 ? 'text-amber-600' :
                  'text-red-600'
                }`}>{results.riskScore}%</div>
                <div className={`text-sm font-semibold px-3 py-0.5 rounded-full inline-block mt-1 ${
                  results.riskMeterLevel === 'Sovereign' ? 'bg-green-100 text-green-700' :
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
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              catScore.level === 'Sovereign' ? 'bg-green-200 text-green-800' :
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

            {/* Top Issues with PHI Risk */}
            {results.topIssues && results.topIssues.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Priority Issues:</h4>
                {results.topIssues.map((issue: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 mb-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      issue.severity === 'critical' ? 'bg-red-500' :
                      issue.severity === 'high' ? 'bg-orange-500' :
                      issue.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                    }`} />
                    <span className="font-medium">{issue.id}:</span> {issue.name}
                    {issue.phiRisk === 'direct' && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">PHI Risk</span>
                    )}
                    {issue.severity === 'critical' && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs">Fine Risk</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data Border Map */}
          {results.dataBorderMap && results.dataBorderMap.length > 0 && (
            <div className="mb-6 p-5 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-800">Data Border Map</h3>
                <span className="text-xs text-slate-400 ml-2">Where your data touches</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.dataBorderMap.map((node: any, idx: number) => {
                  const isUS = node.isSovereign;
                  const riskBg = node.phiRisk === 'direct' && !isUS ? 'bg-red-50 border-red-200' :
                    node.phiRisk === 'indirect' && !isUS ? 'bg-amber-50 border-amber-200' :
                    isUS ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200';
                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${riskBg} text-sm`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{isUS ? '🇺🇸' : '🌍'}</span>
                          <span className="font-medium text-slate-800 truncate max-w-[180px]" title={node.domain}>
                            {node.domain.length > 28 ? node.domain.substring(0, 28) + '...' : node.domain}
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          node.type === 'primary' ? 'bg-blue-100 text-blue-700' :
                          node.type === 'mail' ? 'bg-purple-100 text-purple-700' :
                          node.type === 'cdn' ? 'bg-sky-100 text-sky-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>{node.type}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {node.city}, {node.country}
                        {node.ip && <span className="text-slate-400 ml-1">({node.ip})</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {node.phiRisk === 'direct' && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">PHI Handler</span>}
                        {node.phiRisk === 'indirect' && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Tracking/Analytics</span>}
                        {node.phiRisk === 'none' && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Static Asset</span>}
                        {node.purpose && <span className="text-xs text-slate-400 ml-1">{node.purpose}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Border Summary */}
              {(() => {
                const foreign = results.dataBorderMap.filter((n: any) => !n.isSovereign);
                const foreignPHI = foreign.filter((n: any) => n.phiRisk === 'direct');
                const total = results.dataBorderMap.length;
                return (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-3">
                    <span>{total} endpoint{total !== 1 ? 's' : ''} mapped</span>
                    <span className="text-green-600">🇺🇸 {total - foreign.length} US</span>
                    {foreign.length > 0 && <span className="text-amber-600">🌍 {foreign.length} foreign</span>}
                    {foreignPHI.length > 0 && <span className="text-red-600 font-medium">⚠ {foreignPHI.length} foreign PHI handler{foreignPHI.length > 1 ? 's' : ''}</span>}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Detailed Findings */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Detailed Findings</h3>
            <div className="space-y-3">
              {[
                { prefix: 'DR-', label: 'Data Sovereignty & Residency', catKey: 'data_sovereignty' },
                { prefix: 'AI-', label: 'AI Transparency & Disclosure', catKey: 'ai_transparency' },
                { prefix: 'ER-', label: 'EHR System Integrity & Parental Access', catKey: 'clinical_integrity' }
              ].map((category, catIdx: number) => {
                const categoryFindings = results.findings.filter((f: any) => f.id.startsWith(category.prefix));
                const catScore = results.categoryScores?.[category.catKey];

                return (
                  <div key={catIdx} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category.label)}
                        <h4 className="font-semibold text-slate-800">{category.label}</h4>
                      </div>
                      {catScore && (
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                          catScore.percentage >= 67 ? 'bg-green-100 text-green-700' :
                          catScore.percentage >= 34 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{catScore.percentage}%</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {categoryFindings.map((finding: any, idx: number) => (
                        <div key={idx} className={`flex items-start gap-3 p-3 rounded ${
                          finding.status === 'pass' ? 'bg-green-50/50' :
                          finding.status === 'fail' ? 'bg-red-50/50' :
                          finding.status === 'warn' ? 'bg-amber-50/50' : 'bg-slate-50'
                        }`}>
                          {finding.status === 'pass' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : finding.status === 'warn' ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-slate-800">{finding.id}: {finding.name}</span>
                              {/* Severity Badge */}
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                finding.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                finding.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                finding.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                finding.severity === 'info' ? 'bg-blue-100 text-blue-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>{finding.severity}</span>
                              {/* PHI Risk Badge */}
                              {finding.phiRisk === 'direct' && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">PHI Direct</span>
                              )}
                              {finding.phiRisk === 'indirect' && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200">PHI Indirect</span>
                              )}
                              {/* Page Context Badge */}
                              {finding.pageContext && finding.status !== 'pass' && (
                                <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                  {finding.pageContext.replace(/_/g, ' ')} page
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">{finding.detail}</div>
                            <div className="text-xs text-slate-400 mt-1 italic">{finding.clause}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskScanWidget;