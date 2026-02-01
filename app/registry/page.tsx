'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

type ProviderRow = {
  id: string;
  npi: string;
  name: string;
  city?: string;
  zip?: string;
  risk_score?: number;
  risk_level?: string;
  status_label?: string;
  last_scan_timestamp?: string;
  updated_at?: string;
  is_featured?: boolean;
};

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function statusBadge(score: number | undefined, label: string | undefined) {
  const s = score ?? 0;
  const displayLabel = label || (s >= 75 ? 'Sovereign' : s >= 50 ? 'Substantial Compliance' : s >= 25 ? 'Critical Drift' : 'Violation');
  const colors = s >= 75 ? 'bg-green-100 text-green-800' : s >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors}`}>
      {displayLabel}
    </span>
  );
}

export default function RegistryPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      const { data, error, count } = await supabase
        .from('registry')
        .select('id,npi,name,city,zip,risk_score,risk_level,status_label,last_scan_timestamp,updated_at,is_featured', { count: 'exact' })
        .eq('is_featured', true)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProviders(data || []);
      setTotalCount(count || 0);
      setSearched(false);
    } catch (error) {
      console.error('Error loading registry:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      loadProviders();
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const supabase = getSupabase();

      // Search across all registry (not just featured) for NPI/name/city/zip
      const { data, error } = await supabase
        .from('registry')
        .select('id,npi,name,city,zip,risk_score,risk_level,status_label,last_scan_timestamp,updated_at,is_featured')
        .or(`name.ilike.%${term}%,city.ilike.%${term}%,npi.ilike.%${term}%,zip.ilike.%${term}%`)
        .order('risk_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-block bg-green-400/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            &#x1F7E2; SOVEREIGN MODE: ATX-01 ACTIVE
          </div>
          <h1 className="text-5xl font-display font-bold mb-4">
            TEXAS <span className="text-gold">registry.</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            Authoritative index of healthcare entities anchored to domestic nodes per SB 1188.
          </p>
        </div>
      </section>

      {/* Enforcement Notice */}
      <section className="py-8 bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <span className="text-orange text-2xl">&#x26A0;</span>
            <div>
              <h3 className="font-display font-bold text-lg mb-2">Statutory Enforcement Period: ACTIVE</h3>
              <p className="text-gray-300">
                Entities listed with &apos;Warning&apos; status have a mandatory window to anchor PHI to sovereign domestic nodes.
                The ledger currently monitors <span className="text-gold font-bold">{totalCount.toLocaleString()}</span> unique identifiers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Registry Table */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Bar */}
          <div className="mb-12">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by NPI, Practice Name, City, or Zipcode..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-navy focus:ring-2 focus:ring-navy/20 outline-none transition-all bg-white shadow-sm"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-navy border-t-transparent rounded-full mx-auto mb-4"></div>
              <div className="text-gray-600">Loading registry...</div>
            </div>
          ) : providers.length === 0 ? (
            /* Not Found - Prompt to Scan */
            <div className="text-center py-16">
              <div className="max-w-lg mx-auto bg-amber-50 border-2 border-amber-200 rounded-2xl p-10">
                <div className="text-5xl mb-4">&#x1F50D;</div>
                <h3 className="text-2xl font-display font-bold text-navy mb-3">
                  Practice Not in Current Metro Sample
                </h3>
                <p className="text-gray-600 mb-8">
                  {searched
                    ? `No records found matching "${searchTerm}". Run a Sentry Scan to generate your Forensic Record and be added to the registry.`
                    : 'No featured providers found. Run a Sentry Scan to generate your Forensic Record.'}
                </p>
                <Link href="/scan">
                  <button className="bg-orange hover:bg-orange-dark text-white font-bold px-8 py-4 rounded-lg text-lg transition-colors">
                    Run a Sentry Scan
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            /* Registry Table */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-navy text-white">
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider">Practice Name</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider">City</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider">Sovereignty Status</th>
                      <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider">Last Audit</th>
                      <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {providers.map((provider) => (
                      <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-navy">{provider.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">NPI: {provider.npi}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {provider.city || '---'}
                        </td>
                        <td className="px-6 py-4">
                          {statusBadge(provider.risk_score, provider.status_label)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {timeAgo(provider.last_scan_timestamp || provider.updated_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/scan/results?npi=${provider.npi}&mode=verified`}
                            className="inline-flex items-center gap-1 bg-navy text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gold hover:text-navy transition-colors"
                          >
                            View Audit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {providers.length >= 50 && (
                <div className="text-center py-4 text-sm text-gray-400 border-t border-gray-100">
                  Showing first 50 results. Refine your search for more specific results.
                </div>
              )}
            </div>
          )}

          {/* CTA below table */}
          {providers.length > 0 && (
            <div className="text-center mt-12">
              <p className="text-gray-600 mb-4">
                Don&apos;t see your practice? Generate your compliance record now.
              </p>
              <Link href="/scan">
                <button className="bg-orange hover:bg-orange-dark text-white font-bold px-8 py-3 rounded-lg transition-colors">
                  RUN SENTRY SCAN
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
