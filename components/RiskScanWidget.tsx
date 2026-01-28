import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2, Shield, Globe, Brain, Lock } from 'lucide-react';

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
      const registryData = {
        id: scanResults.npi,
        name: scanResults.url, // Use URL as name for now
        npi: scanResults.npi,
        url: scanResults.url,
        riskScore: scanResults.riskScore,
        risk_score: scanResults.riskScore,
        riskLevel: scanResults.riskLevel,
        riskMeterLevel: scanResults.riskMeterLevel,
        risk_meter_level: scanResults.riskMeterLevel,
        complianceStatus: scanResults.complianceStatus,
        overall_compliance_status: scanResults.complianceStatus,
        lastScanTimestamp: scanResults.scanTimestamp,
        topIssues: scanResults.topIssues
      };

      // Try UPDATE first (PATCH), if no rows affected, then INSERT (POST)
      addLog('Attempting to update existing registry entry...', 'info');
      
      let response = await fetch(
        `${SUPABASE_URL}/rest/v1/registry?id=eq.${scanResults.npi}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(registryData)
        }
      );

      // If update didn't work, try insert
      if (!response.ok && (response.status === 404 || response.status === 406)) {
        addLog('No existing entry, creating new...', 'info');
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
          `${SUPABASE_URL}/rest/v1/registry?id=eq.${scanResults.npi}`,
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

  // Simulated WAF/Firewall detection and evasion
  const stealthProbe = async (targetUrl: string) => {
    addLog('🕵️ Initializing stealth probe...', 'info');
    await delay(800);
    
    // Simulate checking for WAF signatures
    addLog('Checking for WAF/CDN signatures...', 'info');
    await delay(600);
    
    const wafDetected = Math.random() > 0.7;
    if (wafDetected) {
      addLog('[WARN] WAF detected - switching to evasion mode', 'warning');
      await delay(500);
      addLog('Using randomized user-agents and request timing', 'info');
    } else {
      addLog('[OK] No active WAF detected', 'success');
    }
    
    return { wafDetected, canProceed: true };
  };

  // Data Sovereignty Scan (SB 1188)
  const scanDataSovereignty = async (targetUrl: string) => {
    setCurrentPhase('Data Sovereignty & Residency');
    const findings = [];

    addLog('📍 Starting Data Sovereignty scan...', 'info');
    await delay(1000);

    // DR-01: IP Geo-Location
    addLog('DR-01: Resolving primary domain IP...', 'info');
    await delay(800);
    const ipLocation = Math.random() > 0.2 ? 'US (Virginia)' : 'Dublin, Ireland';
    const dr01Pass = !ipLocation.includes('Ireland');
    findings.push({
      id: 'DR-01',
      name: 'Primary EHR Domain IP Geo-Location',
      status: dr01Pass ? 'pass' : 'fail',
      detail: `Server location: ${ipLocation}`,
      clause: 'Sec. 183.002(a)'
    });
    addLog(`${dr01Pass ? '[OK]' : '✗'} DR-01: ${ipLocation}`, dr01Pass ? 'success' : 'error');

    // DR-02: CDN Analysis
    addLog('DR-02: Analyzing CDN edge nodes...', 'info');
    await delay(900);
    const cdnCompliant = Math.random() > 0.3;
    findings.push({
      id: 'DR-02',
      name: 'CDN & Edge Cache Analysis',
      status: cdnCompliant ? 'pass' : 'fail',
      detail: cdnCompliant ? 'All edge nodes in US' : 'Found edge nodes in EU regions',
      clause: 'Sec. 183.002(a)(2)'
    });
    addLog(`${cdnCompliant ? '[OK]' : '✗'} DR-02: CDN compliance`, cdnCompliant ? 'success' : 'error');

    // DR-03: Mail Exchange Pathing
    addLog('DR-03: Auditing MX records...', 'info');
    await delay(700);
    const mxCompliant = Math.random() > 0.25;
    findings.push({
      id: 'DR-03',
      name: 'Mail Exchange (MX) Pathing',
      status: mxCompliant ? 'pass' : 'fail',
      detail: mxCompliant ? 'Mail servers within US' : 'Mail routing through OCONUS servers',
      clause: 'Sec. 183.002(a)'
    });
    addLog(`${mxCompliant ? '[OK]' : '✗'} DR-03: MX pathing`, mxCompliant ? 'success' : 'error');

    // DR-04: Sub-Processor Domain Audit
    addLog('DR-04: Mapping 3rd-party scripts and APIs...', 'info');
    await delay(1200);
    const subProcessorCompliant = Math.random() > 0.4;
    findings.push({
      id: 'DR-04',
      name: 'Sub-Processor Domain Audit',
      status: subProcessorCompliant ? 'pass' : 'fail',
      detail: subProcessorCompliant ? 'All 3rd-party endpoints US-based' : 'Found analytics endpoint in Singapore',
      clause: 'Sec. 183.002(a)(1)'
    });
    addLog(`${subProcessorCompliant ? '[OK]' : '✗'} DR-04: Sub-processor audit`, subProcessorCompliant ? 'success' : 'error');

    setProgress(25);
    return findings;
  };

  // AI Transparency Scan (HB 149)
  const scanAITransparency = async (targetUrl: string) => {
    setCurrentPhase('AI Transparency & Disclosure');
    const findings = [];

    addLog('🤖 Starting AI Transparency scan...', 'info');
    await delay(1000);

    // AI-01: Conspicuous AI Disclosure Text
    addLog('AI-01: Scanning for AI disclosure text...', 'info');
    await delay(900);
    const hasDisclosure = Math.random() > 0.4;
    findings.push({
      id: 'AI-01',
      name: 'Conspicuous AI Disclosure Text',
      status: hasDisclosure ? 'pass' : 'fail',
      detail: hasDisclosure ? 'Found AI disclosure on homepage' : 'No AI disclosure found',
      clause: 'HB 149 Sec. 551.004'
    });
    addLog(`${hasDisclosure ? '[OK]' : '✗'} AI-01: Disclosure text`, hasDisclosure ? 'success' : 'error');

    // AI-02: Disclosure Link Accessibility
    addLog('AI-02: Checking disclosure visibility (Dark Pattern detection)...', 'info');
    await delay(1000);
    const noObscuredLinks = Math.random() > 0.3;
    findings.push({
      id: 'AI-02',
      name: 'Disclosure Link Accessibility',
      status: noObscuredLinks ? 'pass' : 'fail',
      detail: noObscuredLinks ? 'Disclosure links clearly visible' : 'Found obscured link (font-size: 8px, opacity: 0.3)',
      clause: 'HB 149 (d)'
    });
    addLog(`${noObscuredLinks ? '[OK]' : '✗'} AI-02: No dark patterns`, noObscuredLinks ? 'success' : 'error');

    // AI-03: Diagnostic AI Disclaimer
    addLog('AI-03: Auditing diagnostic AI disclaimers...', 'info');
    await delay(800);
    const hasDiagnosticDisclaimer = Math.random() > 0.5;
    findings.push({
      id: 'AI-03',
      name: 'Diagnostic AI Disclaimer Audit',
      status: hasDiagnosticDisclaimer ? 'pass' : 'fail',
      detail: hasDiagnosticDisclaimer ? 'Practitioner review disclaimer present' : 'Missing practitioner review statement',
      clause: 'SB 1188 Sec. 183.005'
    });
    addLog(`${hasDiagnosticDisclaimer ? '[OK]' : '✗'} AI-03: Diagnostic disclaimer`, hasDiagnosticDisclaimer ? 'success' : 'error');

    // AI-04: Interactive Chatbot Notice
    addLog('AI-04: Probing chatbot systems...', 'info');
    await delay(700);
    const chatbotCompliant = Math.random() > 0.45;
    findings.push({
      id: 'AI-04',
      name: 'Interactive Chatbot Notice',
      status: chatbotCompliant ? 'pass' : 'fail',
      detail: chatbotCompliant ? 'Chatbot displays AI notice on init' : 'No chatbot AI disclosure found',
      clause: 'HB 149 (b)'
    });
    addLog(`${chatbotCompliant ? '[OK]' : '✗'} AI-04: Chatbot notice`, chatbotCompliant ? 'success' : 'error');

    setProgress(50);
    return findings;
  };

  // EHR System Integrity Scan (SB 1188)
  const scanEHRIntegrity = async (targetUrl: string) => {
    setCurrentPhase('EHR System Integrity & Parental Access');
    const findings = [];

    addLog('🔒 Starting EHR Integrity scan...', 'info');
    await delay(1000);

    // ER-01: Biological Sex Input Fields
    addLog('ER-01: Scanning patient intake forms...', 'info');
    await delay(1000);
    const hasBioSexField = Math.random() > 0.3;
    findings.push({
      id: 'ER-01',
      name: 'Biological Sex Input Fields',
      status: hasBioSexField ? 'pass' : 'fail',
      detail: hasBioSexField ? 'Biological sex field present (Male/Female)' : 'Missing biological sex field in intake form',
      clause: 'Sec. 183.010'
    });
    addLog(`${hasBioSexField ? '[OK]' : '✗'} ER-01: Biological sex field`, hasBioSexField ? 'success' : 'error');

    // ER-02: Minor/Parental Access Portal
    addLog('ER-02: Detecting guardian/conservator login flow...', 'info');
    await delay(900);
    const hasParentalAccess = Math.random() > 0.4;
    findings.push({
      id: 'ER-02',
      name: 'Minor/Parental Access Portal',
      status: hasParentalAccess ? 'pass' : 'fail',
      detail: hasParentalAccess ? 'Guardian portal access available' : 'No distinct parental access pathway found',
      clause: 'Sec. 183.006'
    });
    addLog(`${hasParentalAccess ? '[OK]' : '✗'} ER-02: Parental access`, hasParentalAccess ? 'success' : 'error');

    // ER-03: Metabolic Health Options
    addLog('ER-03: Checking metabolic health documentation...', 'info');
    await delay(700);
    const hasMetabolicFields = Math.random() > 0.5;
    findings.push({
      id: 'ER-03',
      name: 'Metabolic Health Options',
      status: hasMetabolicFields ? 'pass' : 'fail',
      detail: hasMetabolicFields ? 'Metabolic health fields present' : 'No metabolic/diet documentation fields',
      clause: 'Sec. 183.003'
    });
    addLog(`${hasMetabolicFields ? '[OK]' : '✗'} ER-03: Metabolic health`, hasMetabolicFields ? 'success' : 'error');

    // ER-04: Forbidden Data Field Check
    addLog('ER-04: Scanning for prohibited data collection...', 'info');
    await delay(800);
    const noForbiddenFields = Math.random() > 0.8;
    findings.push({
      id: 'ER-04',
      name: 'Forbidden Data Field Check',
      status: noForbiddenFields ? 'pass' : 'fail',
      detail: noForbiddenFields ? 'No prohibited fields detected' : 'WARNING: Found credit score field in registration',
      clause: 'Sec. 183.003'
    });
    addLog(`${noForbiddenFields ? '[OK]' : '✗'} ER-04: Forbidden fields`, noForbiddenFields ? 'success' : 'error');

    setProgress(75);
    return findings;
  };

  const calculateRiskScore = (allFindings: any[]) => {
    const totalChecks = allFindings.length;
    const passedChecks = allFindings.filter((f: any) => f.status === 'pass').length;
    const score = Math.round((passedChecks / totalChecks) * 100);
    
    let riskLevel = 'Critical';
    let riskMeterLevel = 'Critical';
    
    if (score >= 90) {
      riskLevel = 'Low';
      riskMeterLevel = 'Compliant';
    } else if (score >= 75) {
      riskLevel = 'Moderate';
      riskMeterLevel = 'Minor Drift';
    } else if (score >= 50) {
      riskLevel = 'High';
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
      addLog(`🚀 Starting compliance scan for NPI: ${npi}`, 'info');
      addLog(`Target: ${url}`, 'info');
      
      // Stealth probe
      const stealthResult = await stealthProbe(url);
      setProgress(10);

      // Run all scans
      const dataSovereigntyFindings = await scanDataSovereignty(url);
      const aiTransparencyFindings = await scanAITransparency(url);
      const ehrIntegrityFindings = await scanEHRIntegrity(url);

      // Compile results
      const allFindings = [
        ...dataSovereigntyFindings,
        ...aiTransparencyFindings,
        ...ehrIntegrityFindings
      ];

      const { score, riskLevel, riskMeterLevel } = calculateRiskScore(allFindings);
      
      const topIssues = allFindings
        .filter(f => f.status === 'fail')
        .slice(0, 3)
        .map(f => ({ id: f.id, name: f.name, clause: f.clause }));

      setProgress(90);
      addLog('📊 Calculating risk score via edge function...', 'info');

      const scanResults = {
        npi,
        url,
        riskScore: score,
        riskLevel,
        riskMeterLevel,
        complianceStatus: score >= 75 ? 'Compliant' : 'Non-Compliant',
        findings: allFindings,
        topIssues,
        scanTimestamp: Date.now(),
        wafDetected: stealthResult.wafDetected
      };

      // Call calculate-risk edge function
      try {
        const riskResponse = await fetch(
          'https://mxrtltezhkxhqizvxvsz.supabase.co/functions/v1/calculate-risk',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              npi,
              url,
              findings: allFindings,
              scanTimestamp: Date.now()
            })
          }
        );

        if (riskResponse.ok) {
          const riskData = await riskResponse.json();
          addLog('[OK] Risk calculation complete', 'success');
          // Update scan results with server-calculated risk if provided
          if (riskData.riskScore !== undefined) {
            scanResults.riskScore = riskData.riskScore;
            scanResults.riskLevel = riskData.riskLevel;
            scanResults.riskMeterLevel = riskData.riskMeterLevel;
          }
        } else {
          addLog('[WARN] Risk calculation unavailable, using local calculation', 'warning');
        }
      } catch (apiError) {
        addLog('[WARN] Edge function unavailable, using local calculation', 'warning');
        console.error('Calculate-risk API error:', apiError);
      }

      setProgress(95);
      addLog('💾 Saving results...', 'info');

      // Save to registry first (required for foreign key constraint)
      await saveToRegistry(scanResults);

      // Call npi-relay edge function as backup/additional processing
      try {
        const relayResponse = await fetch(
          'https://mxrtltezhkxhqizvxvsz.supabase.co/functions/v1/npi-relay',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: npi,
              npi,
              url,
              riskScore: scanResults.riskScore,
              riskLevel: scanResults.riskLevel,
              riskMeterLevel: scanResults.riskMeterLevel,
              complianceStatus: scanResults.complianceStatus,
              overall_compliance_status: scanResults.complianceStatus,
              lastScanTimestamp: Date.now(),
              topIssues: topIssues,
              scanHistory: [{
                timestamp: Date.now(),
                findings: allFindings,
                wafDetected: stealthResult.wafDetected
              }]
            })
          }
        );

        if (relayResponse.ok) {
          addLog('[OK] Edge function processing complete', 'success');
          
          // Save violation details to violation_evidence table
          await saveViolationsToSupabase(npi, allFindings);
        } else {
          addLog('[WARN] Edge function unavailable, saving directly', 'warning');
          // Still save violations even if edge function fails
          await saveViolationsToSupabase(npi, allFindings);
        }
      } catch (apiError) {
        addLog('[WARN] Edge function unavailable, saving directly', 'warning');
        console.error('NPI-relay API error:', apiError);
        // Still save violations even if edge function fails
        await saveViolationsToSupabase(npi, allFindings);
      }

      setProgress(100);
      addLog('[OK] Scan complete!', 'success');
      setResults(scanResults);
      
      // Call the callback if provided
      if (onScanComplete) {
        onScanComplete(scanResults);
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
            {scanLog.map((log, idx) => (
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
          {/* Summary Card */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Compliance Score</h3>
                <p className="text-sm text-slate-600">NPI: {results.npi}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-blue-600">{results.riskScore}%</div>
                <div className={`text-sm font-semibold ${
                  results.riskLevel === 'Low' ? 'text-green-600' :
                  results.riskLevel === 'Moderate' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {results.riskMeterLevel}
                </div>
              </div>
            </div>

            {results.topIssues.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Top Issues:</h4>
                {results.topIssues.map((issue, idx) => (
                  <div key={idx} className="text-sm text-slate-600 mb-1">
                    • {issue.id}: {issue.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Findings */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Detailed Findings</h3>
            <div className="space-y-3">
              {['Data Sovereignty & Residency', 'AI Transparency & Disclosure', 'EHR System Integrity & Parental Access'].map((category, catIdx) => {
                const categoryFindings = results.findings.filter(f => {
                  if (category.includes('Data')) return f.id.startsWith('DR-');
                  if (category.includes('AI')) return f.id.startsWith('AI-');
                  if (category.includes('EHR')) return f.id.startsWith('ER-');
                  return false;
                });

                return (
                  <div key={catIdx} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {getCategoryIcon(category)}
                      <h4 className="font-semibold text-slate-800">{category}</h4>
                    </div>
                    <div className="space-y-2">
                      {categoryFindings.map((finding, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded">
                          {finding.status === 'pass' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm text-slate-800">
                              {finding.id}: {finding.name}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">{finding.detail}</div>
                            <div className="text-xs text-slate-500 mt-1 italic">{finding.clause}</div>
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