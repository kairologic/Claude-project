/**
 * Enhanced Provider Detail Modal with Report Downloads
 * Shows complete provider info with technical fixes and download options
 * Version: 11.0.0
 */

import React from 'react';
import {
  X,
  Download,
  FileText,
  Code2,
  AlertTriangle,
  CheckCircle,
  Shield,
  Zap,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { RegistryEntry } from '../../types';
import {
  downloadTextReport,
  downloadHTMLReport,
  downloadJSONReport
} from '../../services/reportService';

interface ProviderDetailModalProps {
  entry: RegistryEntry;
  onClose: () => void;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({ entry, onClose }) => {
  const hasIssues = entry.topIssues && entry.topIssues.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-navy p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gold/20 rounded-2xl flex items-center justify-center">
              <Shield size={28} className="text-gold" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">{entry.name}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gold font-mono">NPI: {entry.npi}</span>
                {entry.city && (
                  <>
                    <span className="text-gold">•</span>
                    <span className="text-xs text-gray-400">{entry.city}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-grow">
          {/* Compliance Score Section */}
          <div className="p-8 bg-slate-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Health Score
                </div>
                <div className={`text-5xl font-black mb-2 ${
                  entry.riskScore >= 67 ? 'text-green-500' :
                  entry.riskScore >= 34 ? 'text-orange' :
                  'text-red-500'
                }`}>
                  {entry.riskScore || 0}
                  <span className="text-xl text-gray-400">/100</span>
                </div>
                <div className="text-xs font-bold text-gray-500">
                  {entry.riskMeterLevel || 'Drift'}
                </div>
              </div>

              {/* Status Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Compliance Status
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {entry.complianceStatus === 'Verified' ? (
                    <CheckCircle className="text-green-500" size={32} />
                  ) : (
                    <AlertTriangle className="text-orange" size={32} />
                  )}
                  <span className="text-xl font-black text-navy">
                    {entry.complianceStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Last Scan Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Last Scan
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-navy" size={24} />
                  <span className="text-lg font-black text-navy">
                    {entry.lastScanDate || 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Download Reports Section */}
          <div className="p-8 border-b border-gray-200">
            <h4 className="text-sm font-black uppercase tracking-widest text-navy mb-4 flex items-center gap-2">
              <Download size={16} />
              Download Reports
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => downloadTextReport(entry)}
                className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:bg-white hover:border-gold hover:shadow-lg transition-all text-left group"
              >
                <FileText className="text-navy group-hover:text-gold mb-2" size={24} />
                <div className="text-sm font-black text-navy mb-1">Text Report</div>
                <div className="text-[10px] text-gray-500">Plain text format (.txt)</div>
              </button>
              
              <button
                onClick={() => downloadHTMLReport(entry)}
                className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:bg-white hover:border-gold hover:shadow-lg transition-all text-left group"
              >
                <Code2 className="text-navy group-hover:text-gold mb-2" size={24} />
                <div className="text-sm font-black text-navy mb-1">HTML Report</div>
                <div className="text-[10px] text-gray-500">Styled web format (.html)</div>
              </button>
              
              <button
                onClick={() => downloadJSONReport(entry)}
                className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:bg-white hover:border-gold hover:shadow-lg transition-all text-left group"
              >
                <Code2 className="text-navy group-hover:text-gold mb-2" size={24} />
                <div className="text-sm font-black text-navy mb-1">JSON Report</div>
                <div className="text-[10px] text-gray-500">Data export (.json)</div>
              </button>
            </div>
          </div>

          {/* Issues Section */}
          <div className="p-8">
            <h4 className="text-sm font-black uppercase tracking-widest text-navy mb-6 flex items-center gap-2">
              <AlertTriangle size={16} />
              Detected Issues & Technical Fixes
            </h4>

            {!hasIssues ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-12 text-center">
                <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                <h5 className="text-lg font-black text-green-700 mb-2 uppercase tracking-tight">
                  No Compliance Issues Detected
                </h5>
                <p className="text-sm text-green-600 font-medium">
                  Your practice infrastructure is aligned with Texas SB 1188 and HB 149 requirements.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {entry.topIssues.map((issue, index) => (
                  <div
                    key={index}
                    className="bg-white border-2 border-gray-200 rounded-[2.5rem] p-6 hover:border-gold hover:shadow-lg transition-all"
                  >
                    {/* Issue Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-black text-navy/40">
                            ISSUE #{index + 1}
                          </span>
                          {issue.remediationPriority && (
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              issue.remediationPriority === 'CRITICAL'
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : issue.remediationPriority === 'HIGH'
                                ? 'bg-orange/10 text-orange border border-orange/30'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            }`}>
                              {issue.remediationPriority}
                            </span>
                          )}
                        </div>
                        <h5 className="text-lg font-black text-navy uppercase tracking-tight">
                          {issue.title}
                        </h5>
                      </div>
                    </div>

                    {/* Metadata */}
                    {(issue.statuteReference || issue.scope) && (
                      <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500">
                        {issue.statuteReference && (
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="text-navy/40" />
                            <span className="font-bold">{issue.statuteReference}</span>
                          </div>
                        )}
                        {issue.scope && (
                          <div className="flex items-center gap-2">
                            <Code2 size={14} className="text-navy/40" />
                            <span className="font-mono">{issue.scope}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Problem Description */}
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-2">
                        Problem
                      </div>
                      <p className="text-sm text-red-900 font-medium leading-relaxed">
                        {issue.description}
                      </p>
                    </div>

                    {/* Technical Fix */}
                    {issue.technicalFix && (
                      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={14} className="text-emerald-600" />
                          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Recommended Fix
                          </div>
                        </div>
                        <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                          {issue.technicalFix}
                        </p>
                      </div>
                    )}

                    {/* Evidence Link */}
                    {issue.evidence_link && (
                      <div className="mt-4">
                        <a
                          href={issue.evidence_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-navy hover:text-gold transition-colors"
                        >
                          <ExternalLink size={12} />
                          View Evidence
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact Information */}
          {entry.email && (
            <div className="p-8 bg-slate-50 border-t border-gray-200">
              <h4 className="text-sm font-black uppercase tracking-widest text-navy mb-4">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entry.email && (
                  <div className="bg-white p-4 rounded-xl">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      Email
                    </div>
                    <div className="text-sm font-bold text-navy">{entry.email}</div>
                  </div>
                )}
                {entry.phone && (
                  <div className="bg-white p-4 rounded-xl">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      Phone
                    </div>
                    <div className="text-sm font-bold text-navy">{entry.phone}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-400 font-mono">
            ID: {entry.id}
          </div>
          <button
            onClick={onClose}
            className="bg-navy text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gold hover:text-navy transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderDetailModal;
