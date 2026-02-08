'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, FileText, FileSpreadsheet, Download, RefreshCw,
  CheckCircle, Clock, AlertTriangle, Loader2, Shield, ChevronRight,
  ChevronDown, ExternalLink, HardDrive, Package, FileCheck
} from 'lucide-react';

// ════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════

interface AssetFile {
  id: string;
  name: string;
  filename: string;
  type: 'pdf' | 'xlsx';
  description: string;
  version: string;
  pages?: string;
  icon: React.ReactNode;
}

interface AssetFolder {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  assets: AssetFile[];
}

interface AssetStatus {
  exists: boolean;
  sizeKB?: number;
  modified?: string;
  url?: string;
}

// ════════════════════════════════════════════════
// Asset Registry
// ════════════════════════════════════════════════

const ASSET_FOLDERS: AssetFolder[] = [
  {
    id: 'safe-harbor',
    name: 'Safe Harbor™ Policy Bundle',
    description: 'Complete compliance documentation package for Texas SB 1188 + HB 149',
    icon: <Shield size={18} />,
    color: 'from-navy to-navy-dark',
    assets: [
      {
        id: 'sb1188-policy-pack',
        name: 'SB 1188 Data Sovereignty Policy Pack',
        filename: 'SB1188_Data_Sovereignty_Policy_Pack.pdf',
        type: 'pdf',
        description: '12 policy sections + 3 appendices. Covers data residency, vendor due diligence, AI transparency, employee obligations, incident response, and audit procedures.',
        version: 'v1.0 — Feb 2026',
        pages: '20+ pages',
        icon: <FileCheck size={16} className="text-navy" />,
      },
      {
        id: 'implementation-guide',
        name: 'Safe Harbor Implementation Guide',
        filename: 'Safe_Harbor_Implementation_Guide.pdf',
        type: 'pdf',
        description: '6-phase step-by-step implementation workflow with checklists. Covers policy customization, AI disclosure deployment, vendor hardening, staff training, and registry verification.',
        version: 'v1.0 — Feb 2026',
        pages: '15+ pages',
        icon: <FileText size={16} className="text-blue-600" />,
      },
      {
        id: 'ai-disclosure-kit',
        name: 'AI Disclosure Kit',
        filename: 'AI_Disclosure_Kit.pdf',
        type: 'pdf',
        description: '8 copy-ready assets: website footer notice, patient consent form, privacy policy section, phone scripts, staff guidelines, social media template, waiting room signage, vendor verification email.',
        version: 'v1.0 — Feb 2026',
        pages: '12+ pages',
        icon: <FileText size={16} className="text-amber-600" />,
      },
      {
        id: 'staff-training-guide',
        name: 'Staff Training Guide',
        filename: 'Staff_Training_Guide.pdf',
        type: 'pdf',
        description: '7 training modules: data sovereignty rules, prohibited tools, AI transparency, vendor checks, leak reporting, real-world scenarios, quick reference card. Includes staff attestation form.',
        version: 'v1.0 — Feb 2026',
        pages: '15+ pages',
        icon: <FileText size={16} className="text-green-600" />,
      },
      {
        id: 'compliance-roadmap',
        name: '30-Day Compliance Roadmap',
        filename: 'Compliance_Roadmap.pdf',
        type: 'pdf',
        description: '4-phase roadmap from Pre-Audited to Verified Sovereign. Full checklists with owner, deliverable, and checkbox columns. Includes ongoing quarterly maintenance schedule.',
        version: 'v1.0 — Feb 2026',
        pages: '10+ pages',
        icon: <FileText size={16} className="text-purple-600" />,
      },
      {
        id: 'evidence-ledger',
        name: 'Forensic Evidence Ledger',
        filename: 'Evidence_Ledger.xlsx',
        type: 'xlsx',
        description: '5-tab workbook: Digital Supply Chain Inventory, Technical Residency Signals, Regulatory & Cure Notice Log, Quarterly Audit Trail, Instructions & Reference. Pre-formatted with data validations and formulas.',
        version: 'v1.0 — Feb 2026',
        icon: <FileSpreadsheet size={16} className="text-emerald-600" />,
      },
    ],
  },
];

// ════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════

interface AssetsTabProps {
  showNotification: (msg: string, type?: string) => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({ showNotification }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['safe-harbor']));
  const [assetStatuses, setAssetStatuses] = useState<Record<string, AssetStatus>>({});
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [regenerateAll, setRegenerateAll] = useState(false);

  // Load asset statuses on mount
  const loadStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/generate-asset', {
        headers: { 'Authorization': 'Bearer admin' },
      });
      if (res.ok) {
        const data = await res.json();
        const statusMap: Record<string, AssetStatus> = {};
        for (const asset of data.assets) {
          statusMap[asset.id] = {
            exists: asset.exists,
            sizeKB: asset.stats?.sizeKB,
            modified: asset.stats?.modified,
            url: asset.url,
          };
        }
        setAssetStatuses(statusMap);
      }
    } catch (e) {
      console.error('Failed to load asset statuses:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  // Regenerate a single asset
  const handleRegenerate = async (assetId: string) => {
    setRegenerating(assetId);
    try {
      const res = await fetch('/api/admin/generate-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
        body: JSON.stringify({ assetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      
      showNotification(`✅ ${data.file} regenerated (${data.sizeKB} KB)`, 'success');
      // Update status
      setAssetStatuses(prev => ({
        ...prev,
        [assetId]: {
          exists: true,
          sizeKB: data.sizeKB,
          modified: data.generatedAt,
          url: data.url,
        },
      }));
    } catch (e: any) {
      showNotification(`❌ Failed to regenerate: ${e.message}`, 'error');
    } finally {
      setRegenerating(null);
    }
  };

  // Regenerate all assets in a folder
  const handleRegenerateAll = async (folder: AssetFolder) => {
    setRegenerateAll(true);
    let success = 0;
    let failed = 0;

    for (const asset of folder.assets) {
      setRegenerating(asset.id);
      try {
        const res = await fetch('/api/admin/generate-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin' },
          body: JSON.stringify({ assetId: asset.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setAssetStatuses(prev => ({
          ...prev,
          [asset.id]: {
            exists: true,
            sizeKB: data.sizeKB,
            modified: data.generatedAt,
            url: data.url,
          },
        }));
        success++;
      } catch {
        failed++;
      }
      setRegenerating(null);
    }

    setRegenerateAll(false);
    showNotification(
      `Bundle regeneration complete: ${success} succeeded${failed > 0 ? `, ${failed} failed` : ''}`,
      failed > 0 ? 'warning' : 'success'
    );
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  };

  // Counts
  const totalAssets = ASSET_FOLDERS.reduce((sum, f) => sum + f.assets.length, 0);
  const existingAssets = Object.values(assetStatuses).filter(s => s.exists).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <Package size={20} /> Asset Manager
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage, preview, and regenerate Safe Harbor™ compliance documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Assets</div>
            <div className="text-sm font-bold text-navy">{existingAssets} / {totalAssets} generated</div>
          </div>
          <button
            onClick={() => loadStatuses()}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-navy rounded-lg transition-colors"
            title="Refresh status"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Folders */}
      {ASSET_FOLDERS.map(folder => {
        const isExpanded = expandedFolders.has(folder.id);
        const folderAssetCount = folder.assets.length;
        const folderExisting = folder.assets.filter(a => assetStatuses[a.id]?.exists).length;

        return (
          <div key={folder.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Folder Header */}
            <button
              onClick={() => toggleFolder(folder.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${folder.color} rounded-xl flex items-center justify-center text-white`}>
                  {folder.icon}
                </div>
                <div className="text-left">
                  <div className="font-bold text-navy text-sm flex items-center gap-2">
                    {folder.name}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold-dark">
                      {folderAssetCount} files
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{folder.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Status badge */}
                {folderExisting === folderAssetCount ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle size={12} /> All Generated
                  </span>
                ) : folderExisting > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <Clock size={12} /> {folderExisting}/{folderAssetCount}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                    <AlertTriangle size={12} /> Not Generated
                  </span>
                )}
                {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-slate-100">
                {/* Folder Actions */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    {folder.id === 'safe-harbor' ? 'Safe Harbor™ Bundle Documents' : 'Documents'}
                  </div>
                  <button
                    onClick={() => handleRegenerateAll(folder)}
                    disabled={regenerateAll || regenerating !== null}
                    className="flex items-center gap-1.5 bg-navy hover:bg-navy-light text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40"
                  >
                    {regenerateAll ? (
                      <><Loader2 size={13} className="animate-spin" /> Regenerating All...</>
                    ) : (
                      <><RefreshCw size={13} /> Update &amp; Regenerate All</>
                    )}
                  </button>
                </div>

                {/* Asset List */}
                <div className="divide-y divide-slate-100">
                  {folder.assets.map(asset => {
                    const status = assetStatuses[asset.id];
                    const isRegen = regenerating === asset.id;

                    return (
                      <div
                        key={asset.id}
                        className={`flex items-start gap-4 p-4 transition-all ${
                          isRegen ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            asset.type === 'xlsx' ? 'bg-emerald-50' : 'bg-slate-50'
                          }`}>
                            {asset.icon}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-bold text-navy text-sm">{asset.name}</h4>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              asset.type === 'xlsx' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-red-50 text-red-600'
                            }`}>
                              {asset.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{asset.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            <span>{asset.version}</span>
                            {asset.pages && <span>• {asset.pages}</span>}
                            {status?.exists && (
                              <>
                                <span>• {status.sizeKB} KB</span>
                                {status.modified && (
                                  <span>• Last generated: {new Date(status.modified).toLocaleString()}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                          {/* Download */}
                          {status?.exists && status.url && (
                            <a
                              href={status.url}
                              download={asset.filename}
                              className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              <Download size={13} /> Download
                            </a>
                          )}

                          {/* Regenerate */}
                          <button
                            onClick={() => handleRegenerate(asset.id)}
                            disabled={isRegen || regenerateAll}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40 ${
                              status?.exists
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                                : 'bg-navy hover:bg-navy-light text-white'
                            }`}
                          >
                            {isRegen ? (
                              <><Loader2 size={13} className="animate-spin" /> Generating...</>
                            ) : status?.exists ? (
                              <><RefreshCw size={13} /> Regenerate</>
                            ) : (
                              <><RefreshCw size={13} /> Generate</>
                            )}
                          </button>

                          {/* Status indicator */}
                          {status?.exists ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-gradient-to-r from-navy/5 to-transparent border-t border-slate-100">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <HardDrive size={11} />
                    <span>Files stored in <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px] font-mono">/public/assets/safe-harbor/</code></span>
                    <span>•</span>
                    <span>Generated server-side via Python (ReportLab + openpyxl)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Info Box */}
      <div className="bg-gradient-to-r from-navy/5 to-gold/5 border border-navy/10 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-navy flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-navy text-sm">About Safe Harbor™ Bundle Generation</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Each document is generated server-side using branded Python templates with the KairoLogic navy/gold design system. 
              Click <strong>Regenerate</strong> to rebuild individual files, or <strong>Update &amp; Regenerate All</strong> to rebuild the entire bundle. 
              Generated files are served from <code className="bg-white px-1 py-0.5 rounded text-[9px] font-mono">/assets/safe-harbor/</code> and can be 
              linked in Stripe post-purchase delivery emails. Generator scripts are in <code className="bg-white px-1 py-0.5 rounded text-[9px] font-mono">/scripts/safe-harbor/</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

