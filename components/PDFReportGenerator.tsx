import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader2, AlertCircle, CheckCircle, XCircle, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Supabase Configuration - Update these with your actual values
const SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

interface PDFReportGeneratorProps {
  npi?: string;
  registryId?: string;
  autoLoad?: boolean;
}

const PDFReportGenerator: React.FC<PDFReportGeneratorProps> = ({ npi, registryId, autoLoad = false }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [registryData, setRegistryData] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoLoad && (npi || registryId)) {
      loadReportData();
    }
  }, [npi, registryId, autoLoad]);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const id = registryId || npi;
      
      // Fetch registry data
      const registryResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/registry?id=eq.${id}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!registryResponse.ok) {
        throw new Error('Failed to fetch registry data');
      }

      const registryResult = await registryResponse.json();
      
      if (registryResult.length === 0) {
        throw new Error('No registry entry found for this NPI');
      }

      setRegistryData(registryResult[0]);

      // Fetch violations
      const violationsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/violation_evidence?registry_id=eq.${id}&select=*&order=captured_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!violationsResponse.ok) {
        throw new Error('Failed to fetch violations');
      }

      const violationsResult = await violationsResponse.json();
      setViolations(violationsResult);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!registryData) {
      await loadReportData();
      if (!registryData) return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace = 20) => {
        if (yPos + requiredSpace > 270) {
          doc.addPage();
          yPos = 20;
          return true;
        }
        return false;
      };

      // Title Page
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Texas Healthcare Compliance Report', 105, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('SB1188 & HB149 Compliance Assessment', 105, yPos, { align: 'center' });
      
      yPos += 20;
      doc.setFontSize(10);
      doc.text(`Practice Name: ${registryData.name || 'N/A'}`, 20, yPos);
      yPos += 7;
      doc.text(`NPI: ${registryData.npi || 'N/A'}`, 20, yPos);
      yPos += 7;
      doc.text(`Website: ${registryData.url || 'N/A'}`, 20, yPos);
      yPos += 7;
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, yPos);
      yPos += 7;
      doc.text(`Scan Date: ${registryData.lastScanDate || new Date(registryData.lastScanTimestamp).toLocaleDateString()}`, 20, yPos);

      // Executive Summary
      yPos += 20;
      checkPageBreak(40);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      // Compliance Score Box
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.rect(20, yPos, 170, 30);
      
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Compliance Score:', 30, yPos);
      
      const score = registryData.riskScore || registryData.risk_score || 0;
      const scoreColor = score >= 75 ? [34, 197, 94] as [number, number, number] : score >= 50 ? [251, 191, 36] as [number, number, number] : [239, 68, 68] as [number, number, number];
      doc.setTextColor(...scoreColor);
      doc.setFontSize(20);
      doc.text(`${score}%`, 90, yPos);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Risk Level: ${registryData.riskLevel || registryData.risk_meter_level || 'Unknown'}`, 120, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${registryData.complianceStatus || registryData.overall_compliance_status || 'Unknown'}`, 30, yPos);
      doc.text(`Violations Found: ${violations.length}`, 120, yPos);

      yPos += 15;
      doc.setFontSize(10);
      const summaryText = violations.length === 0 
        ? 'Congratulations! Your practice is fully compliant with Texas SB1188 and HB149 requirements.'
        : `This report identifies ${violations.length} compliance violation${violations.length > 1 ? 's' : ''} that require remediation to meet Texas healthcare data sovereignty and AI transparency requirements.`;
      
      const splitSummary = doc.splitTextToSize(summaryText, 170);
      doc.text(splitSummary, 20, yPos);
      yPos += splitSummary.length * 5 + 10;

      // Violations Section
      if (violations.length > 0) {
        checkPageBreak(40);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Compliance Violations & Technical Remediation', 20, yPos);
        yPos += 10;

        // Group violations by category
        const categories = {
          'Data Sovereignty & Residency': violations.filter(v => v.violation_id.startsWith('DR-')),
          'AI Transparency & Disclosure': violations.filter(v => v.violation_id.startsWith('AI-')),
          'EHR System Integrity': violations.filter(v => v.violation_id.startsWith('ER-'))
        };

        Object.entries(categories).forEach(([category, categoryViolations]) => {
          if (categoryViolations.length === 0) return;

          checkPageBreak(30);
          
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 102, 204);
          doc.text(category, 20, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 8;

          categoryViolations.forEach((violation, idx) => {
            checkPageBreak(70);

            // Violation Header
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(239, 68, 68);
            doc.rect(20, yPos - 4, 5, 5, 'F');
            doc.text(`${violation.violation_id}: ${violation.violation_name}`, 28, yPos);
            yPos += 6;

            // Priority and Complexity badges
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            // Priority badge
            const priorityColor = violation.fix_priority === 'Critical' ? [220, 38, 38] as [number, number, number] : 
                                  violation.fix_priority === 'High' ? [234, 88, 12] as [number, number, number] : [202, 138, 4] as [number, number, number];
            doc.setFillColor(...priorityColor);
            doc.roundedRect(28, yPos - 3, 20, 4, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(violation.fix_priority, 30, yPos);
            
            // Complexity badge
            doc.setTextColor(0, 0, 0);
            doc.setFillColor(226, 232, 240);
            doc.roundedRect(50, yPos - 3, 25, 4, 1, 1, 'F');
            doc.text(`${violation.fix_complexity} Fix`, 52, yPos);
            
            yPos += 6;
            doc.setTextColor(71, 85, 105);
            doc.setFont('helvetica', 'italic');
            doc.text(`Legal Clause: ${violation.violation_clause}`, 28, yPos);
            yPos += 6;

            // Technical Finding
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Technical Finding:', 28, yPos);
            yPos += 5;
            
            doc.setFont('helvetica', 'normal');
            const findingText = doc.splitTextToSize(violation.technical_finding, 160);
            doc.text(findingText, 28, yPos);
            yPos += findingText.length * 4 + 5;

            checkPageBreak(40);

            // Recommended Fix
            doc.setFont('helvetica', 'bold');
            doc.text('Recommended Technical Fix:', 28, yPos);
            yPos += 5;
            
            doc.setFont('helvetica', 'normal');
            const fixText = doc.splitTextToSize(violation.recommended_fix, 160);
            doc.text(fixText, 28, yPos);
            yPos += fixText.length * 4 + 8;

            // Separator line
            if (idx < categoryViolations.length - 1) {
              doc.setDrawColor(226, 232, 240);
              doc.line(20, yPos, 190, yPos);
              yPos += 8;
            }
          });

          yPos += 5;
        });
      }

      // Compliance Roadmap
      if (violations.length > 0) {
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 102, 204);
        doc.text('Compliance Roadmap', 20, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const roadmapText = 'Follow this prioritized remediation plan to achieve full compliance:';
        doc.text(roadmapText, 20, yPos);
        yPos += 8;

        // Sort by priority
        const priorityOrder: Record<string, number> = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
        const sortedViolations = [...violations].sort((a: any, b: any) => 
          (priorityOrder[a.fix_priority] || 999) - (priorityOrder[b.fix_priority] || 999)
        );

        sortedViolations.forEach((violation, idx) => {
          checkPageBreak(15);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}. ${violation.violation_id}: ${violation.violation_name}`, 25, yPos);
          yPos += 5;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Priority: ${violation.fix_priority} | Complexity: ${violation.fix_complexity}`, 30, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 8;
        });
      }

      // Footer on all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `KairoLogic Compliance Report | Page ${i} of ${pageCount} | Generated ${new Date().toLocaleDateString()}`,
          105,
          285,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `Texas_Compliance_Report_${registryData.npi}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to generate PDF: ' + errorMessage);
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Compliance Report Generator</h2>
          <p className="text-sm text-slate-600">Generate detailed PDF reports with technical remediation guidance</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {!registryData && !loading && (
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">No data loaded. Please provide an NPI or Registry ID.</p>
          <button
            onClick={loadReportData}
            disabled={!npi && !registryId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Load Report Data
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading report data...</p>
        </div>
      )}

      {registryData && !loading && (
        <div>
          {/* Report Preview */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-slate-800 mb-4">Report Summary</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-slate-600">Practice:</span>
                <div className="font-semibold">{registryData.name || 'N/A'}</div>
              </div>
              <div>
                <span className="text-slate-600">NPI:</span>
                <div className="font-semibold">{registryData.npi || 'N/A'}</div>
              </div>
              <div>
                <span className="text-slate-600">Compliance Score:</span>
                <div className={`font-semibold ${
                  (registryData.riskScore || registryData.risk_score || 0) >= 75 ? 'text-green-600' :
                  (registryData.riskScore || registryData.risk_score || 0) >= 50 ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {registryData.riskScore || registryData.risk_score || 0}%
                </div>
              </div>
              <div>
                <span className="text-slate-600">Violations:</span>
                <div className="font-semibold">{violations.length}</div>
              </div>
            </div>

            {violations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Violations by Priority:</h4>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-red-600 font-semibold">
                      {violations.filter(v => v.fix_priority === 'Critical').length}
                    </span> Critical
                  </div>
                  <div>
                    <span className="text-orange-600 font-semibold">
                      {violations.filter(v => v.fix_priority === 'High').length}
                    </span> High
                  </div>
                  <div>
                    <span className="text-amber-600 font-semibold">
                      {violations.filter(v => v.fix_priority === 'Medium').length}
                    </span> Medium
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generate PDF Button */}
          <button
            onClick={generatePDF}
            disabled={generating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download Compliance Report PDF
              </>
            )}
          </button>

          {/* Violations List Preview */}
          {violations.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold text-slate-800 mb-3">Report Will Include:</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {violations.map((violation, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-800">
                        {violation.violation_id}: {violation.violation_name}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          violation.fix_priority === 'Critical' ? 'bg-red-100 text-red-800' :
                          violation.fix_priority === 'High' ? 'bg-orange-100 text-orange-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {violation.fix_priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {violation.fix_complexity} Complexity
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFReportGenerator;

