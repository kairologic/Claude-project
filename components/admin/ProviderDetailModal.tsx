/**
 * Enhanced Provider Detail Modal with Report Downloads
 * Shows complete provider info with technical fixes and download options
 * Version: 11.0.1 - Fixed for Registry type
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
  ExternalLink,
  Calendar,
  Mail,
  Phone,
  Globe
} from 'lucide-react';
import { Registry } from '@/lib/supabase';
import {
  downloadTextReport,
  downloadHTMLReport,
  downloadJSONReport
} from '@/services/reportService';

interface ProviderDetailModalProps {
  entry: Registry;
  onClose: () => void;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({ entry, onClose }) => {
  // Determine status based on widget_status
  const isVerified = entry.widget_status === 'active';
  const statusLabel = entry.widget_status === 'active' ? 'Verified' : 
                      entry.widget_status === 'warning' ? 'Warning' : 'Pending';

  // Format last scan date
  const lastScanDate = entry.updated_at 
    ? new Date(entry.updated_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Never';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#00234E] p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#C5A059]/20 rounded-2xl flex items-center justify-center">
              <Shield size={28} className="text-[#C5A059]" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">{entry.name}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-[#C5A059] font-mono">NPI: {entry.npi}</span>
                {entry.city && (
                  <>
                    <span className="text-[#C5A059]">•</span>
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
                  (entry.risk_score || 0) >= 67 ? 'text-green-500' :
                  (entry.risk_score || 0) >= 34 ? 'text-orange-500' :
                  'text-red-500'
                }`}>
                  {entry.risk_score || 0}
                  <span className="text-xl text-gray-400">/100</span>
                </div>
                <div className="text-xs font-bold text-gray-500">
                  {entry.risk_level || 'Not Scanned'}
                </div>
              </div>

              {/* Status Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Compliance Status
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {isVerified ? (
                    <CheckCircle className="text-green-500" size={32} />
                  ) : (
                    <AlertTriangle className="text-orange-500" size={32} />
                  )}
                  <span className="text-xl font-black text-[#00234E]">
                    {statusLabel}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-500">
                  Widget: {entry.widget_status || 'Not Set'}
                </div>
              </div>

              {/* Last Scan Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Last Updated
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-[#00234E]" size={24} />
                  <span className="text-lg font-black text-[#00234E]">
                    {lastScanDate}
                  </span>
                </div>
                {entry.scan_count !== undefined && (
                  <div className="text-xs font-bold text-gray-500">
                    {entry.scan_count} total scans
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info Section */}
          {(entry.email || entry.phone || entry.url) && (
            <div className="p-8 border-b border-gray-200">
              <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] mb-4">
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {entry.email && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <Mail className="text-[#00234E]" size={20} />
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Email</div>
                      <div className="text-sm font-bold text-[#00234E]">{entry.email}</div>
                    </div>
                  </div>
                )}
                {entry.phone && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <Phone className="text-[#00234E]" size={20} />
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Phone</div>
                      <div className="text-sm font-bold text-[#00234E]">{entry.phone}</div>
                    </div>
                  </div>
                )}
                {entry.url && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <Globe className="text-[#00234E]" size={20} />
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Website</div>
                      <a 
                        href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-[#C5A059] hover:underline flex items-center gap-1"
                      >
                        Visit <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Download Reports Section */}
          <div className="p-8 border-b border-gray-200">
            <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] mb-4 flex items-center gap-2">
              <Download size={16} />
              Download Reports
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => downloadTextReport(entry)}
                className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:bg-white hover:border-[#C5A059] hover:shadow-lg transition-all text-left group"
              >
                <FileText className="text-[#00234E] group-hover:text-[#C5A059] mb-2" size={24} />
                <div className="text-sm font-black text-[#00234E] mb-1">Text Report</div>
                <div className="text-[10px] text-gray-500">Plain text format (.txt)</div>
              </button>
              
              <button
                onClick={() => downloadHTMLReport(entry)}
                className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:bg-white hover:border-[#C5A059] hover:shadow-lg transition-all text-left group"
              >
                <Code2 className="text-[#00234E] group-hover:text-[#C5A059] mb-2" size={24} />
                <div className="text-sm font-black text-[#00234E] mb-1">HTML Report</div>
                <div className="text-[10px] text-gray-500">Styled web format (.html)</div>
              </button>
              
              <button
                onClick={() => downloadJSONReport(entry)}
                className="p-4 bg-slate-50 border border-gray-200 rounded-xl hover:bg-white hover:border-[#C5A059] hover:shadow-lg transition-all text-left group"
              >
                <Code2 className="text-[#00234E] group-hover:text-[#C5A059] mb-2" size={24} />
                <div className="text-sm font-black text-[#00234E] mb-1">JSON Report</div>
                <div className="text-[10px] text-gray-500">Data export (.json)</div>
              </button>
            </div>
          </div>

          {/* Status Info */}
          <div className="p-8">
            <h4 className="text-sm font-black uppercase tracking-widest text-[#00234E] mb-6 flex items-center gap-2">
              <Shield size={16} />
              Compliance Summary
            </h4>

            {isVerified ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                <h5 className="text-lg font-black text-green-700 mb-2 uppercase tracking-tight">
                  Compliance Verified
                </h5>
                <p className="text-sm text-green-600 font-medium">
                  This provider's infrastructure is aligned with Texas SB 1188 and HB 149 requirements.
                </p>
              </div>
            ) : (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-8 text-center">
                <AlertTriangle className="text-orange-500 mx-auto mb-4" size={48} />
                <h5 className="text-lg font-black text-orange-700 mb-2 uppercase tracking-tight">
                  Compliance Pending
                </h5>
                <p className="text-sm text-orange-600 font-medium">
                  This provider may have compliance issues that need attention. Run a scan for detailed analysis.
                </p>
              </div>
            )}

            {/* Subscription Info */}
            {entry.subscription_status && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Subscription</div>
                    <div className="text-sm font-black text-[#00234E] capitalize">{entry.subscription_status}</div>
                  </div>
                  {entry.is_paid !== undefined && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      entry.is_paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {entry.is_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-4 border-t border-gray-200 shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">
              ID: {entry.id}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#00234E] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
