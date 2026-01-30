'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase, Registry } from '@/lib/supabase';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Package, 
  LogOut,
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  Scan,
  Edit,
  BarChart3,
  Shield
} from 'lucide-react';

// Import the new admin components
import { AssetsTab } from '@/components/admin/AssetsTab';
import { PageContentTab } from '@/components/admin/PageContentTab';
import { ProviderDetailModal } from '@/components/admin/ProviderDetailModal';

type TabType = 'dashboard' | 'registry' | 'content' | 'assets';

export default function AdminDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [providers, setProviders] = useState<Registry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Registry | null>(null);
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    warning: 0,
    inactive: 0
  });

  useEffect(() => {
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
      
      const { data: providerData, error: providerError } = await supabase
        .from('registry')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (providerError) throw providerError;
      setProviders(providerData || []);

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

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.npi.includes(searchTerm) ||
    (p.city && p.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!authenticated) {
    return null;
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'registry' as TabType, label: 'Registry', icon: <Users size={18} /> },
    { id: 'content' as TabType, label: 'Page Content', icon: <FileText size={18} /> },
    { id: 'assets' as TabType, label: 'Assets', icon: <Package size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#00234E] text-white px-6 py-3 rounded-xl shadow-xl font-medium">
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#00234E] text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#C5A059]/20 rounded-xl flex items-center justify-center">
                <Shield className="text-[#C5A059]" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">
                  KairoLogic Admin
                </h1>
                <p className="text-xs text-[#C5A059] font-bold uppercase tracking-widest">
                  Sentry Control Center
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                  <Eye size={16} />
                  View Site
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-bold text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-[#C5A059] text-[#C5A059]'
                      : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-4xl font-black text-[#00234E] mb-1">
                  {stats.total.toLocaleString()}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Total Providers
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-2xl shadow-sm border border-green-100">
                <div className="text-4xl font-black text-green-600 mb-1">
                  {stats.active.toLocaleString()}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-green-600">
                  Active Widgets
                </div>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-2xl shadow-sm border border-orange-100">
                <div className="text-4xl font-black text-orange-500 mb-1">
                  {stats.warning.toLocaleString()}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-orange-500">
                  Warning Status
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="text-4xl font-black text-gray-400 mb-1">
                  {stats.inactive.toLocaleString()}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Inactive
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-black uppercase tracking-tight text-[#00234E] mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setActiveTab('registry')}
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-left"
                >
                  <Users className="text-[#00234E] mb-2" size={24} />
                  <div className="text-sm font-bold text-[#00234E]">Manage Registry</div>
                  <div className="text-xs text-gray-500">View all providers</div>
                </button>
                <button 
                  onClick={() => setActiveTab('content')}
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-left"
                >
                  <FileText className="text-[#00234E] mb-2" size={24} />
                  <div className="text-sm font-bold text-[#00234E]">Edit Content</div>
                  <div className="text-xs text-gray-500">Update page text</div>
                </button>
                <button 
                  onClick={() => setActiveTab('assets')}
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-left"
                >
                  <Package className="text-[#00234E] mb-2" size={24} />
                  <div className="text-sm font-bold text-[#00234E]">Manage Assets</div>
                  <div className="text-xs text-gray-500">Code snippets & images</div>
                </button>
                <button className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-left opacity-50 cursor-not-allowed">
                  <BarChart3 className="text-[#00234E] mb-2" size={24} />
                  <div className="text-sm font-bold text-[#00234E]">View Analytics</div>
                  <div className="text-xs text-gray-500">Coming soon</div>
                </button>
              </div>
            </div>

            {/* Recent Providers */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black uppercase tracking-tight text-[#00234E]">
                  Recent Providers
                </h2>
                <button 
                  onClick={() => setActiveTab('registry')}
                  className="text-sm font-bold text-[#C5A059] hover:text-[#00234E] transition-colors"
                >
                  View All →
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {providers.slice(0, 5).map(provider => (
                    <div 
                      key={provider.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <div>
                        <div className="font-bold text-[#00234E]">{provider.name}</div>
                        <div className="text-xs text-gray-500">NPI: {provider.npi}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        provider.widget_status === 'active' 
                          ? 'bg-green-100 text-green-700'
                          : provider.widget_status === 'warning'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {provider.widget_status || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Registry Tab */}
        {activeTab === 'registry' && (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, NPI, or city..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-3 bg-[#00234E] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all">
                  <Plus size={18} />
                  Add Provider
                </button>
                <button className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
                  <Upload size={18} />
                  Import
                </button>
                <button className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>

            {/* Provider Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading providers...</div>
              ) : filteredProviders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No providers found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-500">Name</th>
                        <th className="text-left py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-500">NPI</th>
                        <th className="text-left py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-500">City</th>
                        <th className="text-left py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-500">Status</th>
                        <th className="text-left py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-500">Risk Score</th>
                        <th className="text-left py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProviders.map(provider => (
                        <tr key={provider.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-[#00234E]">{provider.name}</div>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600 font-mono">{provider.npi}</td>
                          <td className="py-4 px-6 text-sm text-gray-600">{provider.city || '—'}</td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              provider.widget_status === 'active' 
                                ? 'bg-green-100 text-green-700'
                                : provider.widget_status === 'warning'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {provider.widget_status || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {provider.risk_score !== null && provider.risk_score !== undefined ? (
                              <span className={`font-bold ${
                                provider.risk_score >= 70 ? 'text-green-600' :
                                provider.risk_score >= 40 ? 'text-orange-500' :
                                'text-red-500'
                              }`}>
                                {provider.risk_score}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setSelectedProvider(provider)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye size={18} />
                              </button>
                              <button className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Scan">
                                <Scan size={18} />
                              </button>
                              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                                <Edit size={18} />
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
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <PageContentTab showNotification={showNotification} />
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <AssetsTab showNotification={showNotification} />
        )}
      </main>

      {/* Provider Detail Modal */}
      {selectedProvider && (
        <ProviderDetailModal 
          entry={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
}
