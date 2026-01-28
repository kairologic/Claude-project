'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RegistryPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const supabase = getSupabase();
      const { data, error, count } = await supabase
        .from('registry')
        .select('*', { count: 'exact' })
        .eq('is_visible', true)
        .order('name')
        .limit(50);

      if (error) throw error;
      setProviders(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading registry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term) {
      loadProviders();
      return;
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('registry')
        .select('*')
        .eq('is_visible', true)
        .or(`name.ilike.%${term}%,city.ilike.%${term}%,npi.ilike.%${term}%`)
        .limit(50);

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-block bg-green-400/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🟢 SOVEREIGN MODE: ATX-01 ACTIVE
          </div>
          <h1 className="text-5xl font-display font-bold mb-4">
            TEXAS <span className="text-gold">registry.</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            Authoritative index of healthcare entities anchored to domestic nodes per SB 1188.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-5xl font-display font-bold text-navy mb-2">
                {totalCount.toLocaleString()}
              </div>
              <div className="text-gold uppercase tracking-wider font-semibold mb-2">
                Total Harvested Records
              </div>
              <div className="text-sm text-gray-600">🟢 LIVE INGEST VERIFICATION</div>
            </div>
            
            <div className="card text-center">
              <div className="text-5xl font-display font-bold text-navy mb-2">100%</div>
              <div className="text-gold uppercase tracking-wider font-semibold mb-2">
                Sovereign Standing
              </div>
              <div className="text-sm text-gray-600">TEXAS SB 1188 CERTIFIED</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enforcement Notice */}
      <section className="py-8 bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <span className="text-orange text-2xl">⚠</span>
            <div>
              <h3 className="font-display font-bold text-lg mb-2">
                Statutory Enforcement Period: ACTIVE
              </h3>
              <p className="text-gray-300">
                Entities listed with 'Warning' status have a mandatory window to anchor PHI to sovereign domestic nodes. 
                The ledger currently monitors <span className="text-gold font-bold">{totalCount.toLocaleString()}</span> unique identifiers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Registry */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Bar */}
          <div className="mb-12">
            <div className="max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Find by Name, City, or NPI..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-field text-lg"
              />
              <div className="text-center mt-4">
                <Link href="/scan">
                  <button className="btn-primary">
                    RUN SENTRY SCAN
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading registry...</div>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-600">No providers found</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {providers.map((provider) => (
                <div key={provider.id} className="card hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-display font-bold text-navy mb-2">
                        {provider.name}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-semibold">NPI:</span> {provider.npi}
                        </div>
                        {provider.city && (
                          <div>
                            <span className="font-semibold">City:</span> {provider.city}
                          </div>
                        )}
                        {provider.zip && (
                          <div>
                            <span className="font-semibold">Zip:</span> {provider.zip}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {provider.risk_score !== null && (
                      <div className="text-right ml-4">
                        <div className="text-3xl font-display font-bold text-navy">
                          {provider.risk_score}%
                        </div>
                        <div className="text-sm text-gray-600">Compliance Score</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
