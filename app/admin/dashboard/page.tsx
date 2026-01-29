'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    warning: 0,
    inactive: 0
  });

  useEffect(() => {
    // Check authentication
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setAuthenticated(true);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const supabase = getSupabase();
      
      // Load providers
      const { data: providerData, error: providerError } = await supabase
        .from('registry')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (providerError) throw providerError;
      setProviders(providerData || []);

      // Calculate stats
      const { count: totalCount } = await supabase
        .from('registry')
        .select('*', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from('registry')
        .select('*', { count: 'exact', head: true })
        .eq('widget_status', 'active');

      const { count: warningCount } = await supabase
        .from('registry')
        .select('*', { count: 'exact', head: true })
        .eq('widget_status', 'warning');

      const { count: inactiveCount } = await supabase
        .from('registry')
        .select('*', { count: 'exact', head: true })
        .eq('widget_status', 'hidden');

      setStats({
        total: totalCount || 0,
        active: activeCount || 0,
        warning: warningCount || 0,
        inactive: inactiveCount || 0
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    router.push('/admin');
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-display font-bold mb-1">
                SENTRY CONTROL CENTER
              </h1>
              <p className="text-gray-400">Registry & Compliance Management</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="btn-secondary text-sm">
                  View Public Site
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Dashboard */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-navy mb-1">
                {stats.total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">
                Total Providers
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-green-600 mb-1">
                {stats.active.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">
                Active Widgets
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-orange mb-1">
                {stats.warning.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">
                Warning Status
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-gray-400 mb-1">
                {stats.inactive.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wider">
                Inactive
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button className="btn-primary">
              + Add New Provider
            </button>
            <button className="btn-secondary">
              Bulk Import CSV
            </button>
            <button className="btn-outline">
              Export Data
            </button>
          </div>

          {/* Provider Table */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-bold text-navy">
                Provider Registry
              </h2>
              <input
                type="text"
                placeholder="Search providers..."
                className="input-field max-w-xs"
              />
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-600">
                Loading providers...
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No providers found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        NPI
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        City
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Risk Score
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider) => (
                      <tr key={provider.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-navy">
                            {provider.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {provider.npi}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {provider.city || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            provider.widget_status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : provider.widget_status === 'warning'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {provider.widget_status || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {provider.risk_score !== null ? (
                            <span className="font-bold text-navy">
                              {provider.risk_score}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
                              View
                            </button>
                            <button className="text-orange hover:text-orange-dark font-semibold text-sm">
                              Scan
                            </button>
                            <button className="text-gray-600 hover:text-gray-800 font-semibold text-sm">
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
