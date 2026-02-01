/**
 * KairoLogic Enhanced Report Service
 * Generate compliance reports with technical fixes and CTAs
 * Version: 11.0.0-FIXED
 */

import { Registry } from '@/lib/supabase';

export interface ReportData {
  provider: {
    name: string;
    npi: string;
    city?: string;
    url?: string;
  };
  score: number;
  riskLevel: 'High' | 'Moderate' | 'Low';
  statusLabel: string;
  issues: Array<{
    title: string;
    description: string;
    technicalFix?: string;
    scope?: string;
    remediationPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    statuteReference?: string;
    evidence_link?: string;
  }>;
  scanDate: string;
  reportId: string;
}

/**
 * Generate a formatted text report with technical fixes
 */
export const generateTextReport = (data: ReportData): string => {
  const separator = '═'.repeat(70);
  const thinSeparator = '─'.repeat(70);
  
  let report = `
${separator}
  KAIROLOGIC COMPLIANCE REPORT
  Statutory ID: ${data.reportId}
${separator}

PRACTICE INFORMATION
${thinSeparator}
  Practice Name:    ${data.provider.name}
  NPI:             ${data.provider.npi}
  ${data.provider.city ? `City:            ${data.provider.city}` : ''}
  ${data.provider.url ? `Website:         ${data.provider.url}` : ''}
  
COMPLIANCE SCORE
${thinSeparator}
  Health Score:     ${data.score}/100
  Risk Level:       ${data.riskLevel}
  Status:           ${data.statusLabel}
  Scan Date:        ${data.scanDate}

${separator}
DETECTED STATUTORY DRIFT ISSUES
${separator}
`;

  if (data.issues.length === 0) {
    report += `
✓ No compliance issues detected
  Your practice infrastructure is aligned with Texas SB 1188 and HB 149 requirements.
`;
  } else {
    data.issues.forEach((issue, index) => {
      report += `
ISSUE #${index + 1}: ${issue.title}
${thinSeparator}
Priority:         ${issue.remediationPriority || 'MEDIUM'}
${issue.statuteReference ? `Statute:          ${issue.statuteReference}` : ''}
${issue.scope ? `Scope:            ${issue.scope}` : ''}

PROBLEM:
${issue.description}

${issue.technicalFix ? `✅ RECOMMENDED FIX:
${issue.technicalFix}
` : ''}
${thinSeparator}
`;
    });
  }

  report += `
${separator}
NEXT STEPS
${separator}

To achieve full compliance:

1. SCHEDULE CONSULTATION
   Contact KairoLogic to discuss remediation strategies
   Email: support@kairologic.com
   
2. IMPLEMENT TECHNICAL FIXES
   Follow the recommended fixes outlined above for each issue
   
3. ACTIVATE MONITORING
   Purchase Sentry Shield for ongoing compliance monitoring
   Pricing: $299/month for continuous surveillance
   
4. VERIFY & CERTIFY
   Complete final attestation to achieve Verified Sovereign status

${separator}
KairoLogic Compliance Vanguard | ATX-01 Anchor Node
Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST
${separator}
`;

  return report;
};

/**
 * Generate an HTML report for web display
 */
export const generateHTMLReport = (data: ReportData): string => {
  const issuesHTML = data.issues.map((issue, index) => `
    <div class="issue-card">
      <div class="issue-header">
        <h3>Issue #${index + 1}: ${issue.title}</h3>
        <span class="priority-badge priority-${issue.remediationPriority?.toLowerCase() || 'medium'}">
          ${issue.remediationPriority || 'MEDIUM'}
        </span>
      </div>
      
      ${issue.statuteReference ? `<div class="statute"><strong>Statute:</strong> ${issue.statuteReference}</div>` : ''}
      ${issue.scope ? `<div class="scope"><strong>Scope:</strong> ${issue.scope}</div>` : ''}
      
      <div class="problem-section">
        <h4>Problem:</h4>
        <p>${issue.description}</p>
      </div>
      
      ${issue.technicalFix ? `
      <div class="fix-section">
        <h4>✅ Recommended Fix:</h4>
        <p>${issue.technicalFix}</p>
      </div>
      ` : ''}
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Report - ${data.provider.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 35, 78, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #00234E, #003d7a);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .report-id {
      color: #C5A059;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .info-section {
      padding: 40px;
      border-bottom: 2px solid #f1f5f9;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    .info-item {
      background: #f8fafc;
      padding: 16px;
      border-radius: 12px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }
    .score-section {
      padding: 40px;
      background: linear-gradient(135deg, #f8fafc, #ffffff);
      border-bottom: 2px solid #f1f5f9;
    }
    .score-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: white;
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 35, 78, 0.05);
    }
    .score-value {
      font-size: 72px;
      font-weight: 900;
      color: ${data.score >= 67 ? '#10b981' : data.score >= 34 ? '#f59e0b' : '#ef4444'};
    }
    .score-label {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: ${data.score >= 67 ? '#10b981' : data.score >= 34 ? '#f59e0b' : '#ef4444'};
      color: white;
    }
    .issues-section {
      padding: 40px;
    }
    .section-title {
      font-size: 24px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #00234E;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #C5A059;
    }
    .issue-card {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 24px;
    }
    .issue-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 16px;
    }
    .issue-header h3 {
      font-size: 18px;
      font-weight: 900;
      color: #1e293b;
    }
    .priority-badge {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .priority-critical { background: #fee2e2; color: #dc2626; }
    .priority-high { background: #ffedd5; color: #ea580c; }
    .priority-medium { background: #fef3c7; color: #d97706; }
    .statute, .scope {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .problem-section {
      background: #fef2f2;
      padding: 20px;
      border-radius: 12px;
      margin: 16px 0;
      border-left: 4px solid #ef4444;
    }
    .problem-section h4 {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #dc2626;
      margin-bottom: 8px;
    }
    .problem-section p {
      color: #7f1d1d;
      font-size: 14px;
    }
    .fix-section {
      background: #ecfdf5;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #10b981;
    }
    .fix-section h4 {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #059669;
      margin-bottom: 8px;
    }
    .fix-section p {
      color: #064e3b;
      font-size: 14px;
      font-weight: 500;
    }
    .cta-section {
      background: linear-gradient(135deg, #00234E, #003d7a);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .cta-section h2 {
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 16px;
    }
    .cta-section p {
      font-size: 16px;
      color: #C5A059;
      margin-bottom: 32px;
    }
    .cta-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-decoration: none;
      transition: all 0.3s;
    }
    .cta-primary {
      background: #C5A059;
      color: #00234E;
    }
    .cta-primary:hover {
      background: #d4b168;
      transform: translateY(-2px);
    }
    .cta-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    .cta-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
    .footer {
      padding: 30px 40px;
      background: #f8fafc;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .cta-section { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Compliance Report</h1>
      <div class="report-id">Statutory ID: ${data.reportId}</div>
    </div>
    
    <div class="info-section">
      <h2 class="section-title">Practice Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Practice Name</div>
          <div class="info-value">${data.provider.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">NPI</div>
          <div class="info-value">${data.provider.npi}</div>
        </div>
        ${data.provider.city ? `
        <div class="info-item">
          <div class="info-label">City</div>
          <div class="info-value">${data.provider.city}</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">Scan Date</div>
          <div class="info-value">${data.scanDate}</div>
        </div>
      </div>
    </div>
    
    <div class="score-section">
      <h2 class="section-title">Compliance Score</h2>
      <div class="score-card">
        <div>
          <div class="score-value">${data.score}<span style="font-size: 36px; color: #64748b;">/100</span></div>
          <div class="score-label">Health Score</div>
        </div>
        <div style="text-align: right;">
          <div class="status-badge">${data.statusLabel}</div>
          <div class="score-label" style="margin-top: 8px;">Risk: ${data.riskLevel}</div>
        </div>
      </div>
    </div>
    
    <div class="issues-section">
      <h2 class="section-title">Detected Statutory Drift</h2>
      ${data.issues.length === 0 ? `
        <div class="issue-card">
          <div style="text-align: center; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
            <h3 style="color: #10b981; margin-bottom: 8px;">No Compliance Issues Detected</h3>
            <p style="color: #64748b;">Your practice infrastructure is aligned with Texas SB 1188 and HB 149 requirements.</p>
          </div>
        </div>
      ` : issuesHTML}
    </div>
    
    <div class="cta-section">
      <h2>Ready to Achieve Full Compliance?</h2>
      <p>Contact KairoLogic to implement these technical fixes and secure your Verified Sovereign status.</p>
      <div class="cta-buttons">
        <a href="https://kairologic.com/contact" class="cta-button cta-primary">Schedule Consultation</a>
        <a href="https://kairologic.com/services" class="cta-button cta-secondary">View Services</a>
      </div>
    </div>
    
    <div class="footer">
      KairoLogic Compliance Vanguard | ATX-01 Anchor Node<br>
      Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Generate JSON report for API/data export
 */
export const generateJSONReport = (data: ReportData): string => {
  const report = {
    reportId: data.reportId,
    generatedAt: new Date().toISOString(),
    provider: data.provider,
    compliance: {
      score: data.score,
      riskLevel: data.riskLevel,
      status: data.statusLabel,
      scanDate: data.scanDate
    },
    issues: data.issues.map(issue => ({
      title: issue.title,
      description: issue.description,
      technicalFix: issue.technicalFix,
      priority: issue.remediationPriority,
      statute: issue.statuteReference,
      scope: issue.scope,
      evidenceLink: issue.evidence_link
    })),
    nextSteps: [
      'Schedule a consultation with KairoLogic',
      'Implement recommended technical fixes',
      'Purchase Sentry Shield for ongoing monitoring',
      'Complete final attestation for Verified status'
    ],
    contact: {
      email: 'support@kairologic.com',
      website: 'https://kairologic.com'
    }
  };

  return JSON.stringify(report, null, 2);
};

/**
 * Download report file
 */
export const downloadReport = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generate and download text report
 */
export const downloadTextReport = (entry: Registry) => {
  const reportData: ReportData = {
    provider: {
      name: entry.name,
      npi: entry.npi,
      city: entry.city,
      url: entry.url
    },
    score: entry.risk_score || 0,
    riskLevel: (entry.risk_level as 'High' | 'Moderate' | 'Low') || 'Moderate',
    statusLabel: entry.widget_status === 'active' ? 'Verified' : 'Pending',
    issues: [],
    scanDate: entry.updated_at || new Date().toISOString().split('T')[0],
    reportId: `KL-${Math.floor(Math.random() * 900000) + 100000}-TX`
  };

  const content = generateTextReport(reportData);
  const filename = `${entry.name.replace(/\s+/g, '_')}_Compliance_Report.txt`;
  downloadReport(content, filename, 'text/plain');
};

/**
 * Generate and download HTML report
 */
export const downloadHTMLReport = (entry: Registry) => {
  const reportData: ReportData = {
    provider: {
      name: entry.name,
      npi: entry.npi,
      city: entry.city,
      url: entry.url
    },
    score: entry.risk_score || 0,
    riskLevel: (entry.risk_level as 'High' | 'Moderate' | 'Low') || 'Moderate',
    statusLabel: entry.widget_status === 'active' ? 'Verified' : 'Pending',
    issues: [],
    scanDate: entry.updated_at || new Date().toISOString().split('T')[0],
    reportId: `KL-${Math.floor(Math.random() * 900000) + 100000}-TX`
  };

  const content = generateHTMLReport(reportData);
  const filename = `${entry.name.replace(/\s+/g, '_')}_Compliance_Report.html`;
  downloadReport(content, filename, 'text/html');
};

/**
 * Generate and download JSON report
 */
export const downloadJSONReport = (entry: Registry) => {
  const reportData: ReportData = {
    provider: {
      name: entry.name,
      npi: entry.npi,
      city: entry.city,
      url: entry.url
    },
    score: entry.risk_score || 0,
    riskLevel: (entry.risk_level as 'High' | 'Moderate' | 'Low') || 'Moderate',
    statusLabel: entry.widget_status === 'active' ? 'Verified' : 'Pending',
    issues: [],
    scanDate: entry.updated_at || new Date().toISOString().split('T')[0],
    reportId: `KL-${Math.floor(Math.random() * 900000) + 100000}-TX`
  };

  const content = generateJSONReport(reportData);
  const filename = `${entry.name.replace(/\s+/g, '_')}_Compliance_Report.json`;
  downloadReport(content, filename, 'application/json');
};
