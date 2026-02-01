'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// Supabase config
const SUPABASE_URL = 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cnRsdGV6aGt4aHFpenZ4dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzI1ODAsImV4cCI6MjA4NDM0ODU4MH0.pkPlFyHsMOKJKcxuw_eoV5EKkrXG09Vx_0MIDgHn7aw';

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    npi: '',
    url: '',
    email: '',
  });
  const [npiStatus, setNpiStatus] = useState<'idle' | 'checking' | 'found' | 'not_found' | 'invalid'>('idle');
  const [npiError, setNpiError] = useState<string>('');
  const [existingProvider, setExistingProvider] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill NPI from URL parameter (e.g., from widget link)
  useEffect(() => {
    if (!initialized) {
      const npiParam = searchParams.get('npi');
      if (npiParam && /^\d{10}$/.test(npiParam)) {
        setFormData(prev => ({ ...prev, npi: npiParam }));
        // Trigger validation for the pre-filled NPI
        validateNPI(npiParam);
      }
      setInitialized(true);
    }
  }, [searchParams, initialized]);

  // Validate NPI format and check against registry
  const validateNPI = async (npiValue: string) => {
    // Reset states
    setNpiError('');
    setExistingProvider(null);
    
    // Check format first (must be exactly 10 digits)
    if (npiValue.length === 0) {
      setNpiStatus('idle');
      return;
    }
    
    if (!/^\d+$/.test(npiValue)) {
      setNpiStatus('invalid');
      setNpiError('NPI must contain only numbers');
      return;
    }
    
    if (npiValue.length < 10) {
      setNpiStatus('idle');
      return; // Still typing
    }
    
    if (npiValue.length > 10) {
      setNpiStatus('invalid');
      setNpiError('NPI must be exactly 10 digits');
      return;
    }
    
    // NPI is 10 digits - check against registry
    setNpiStatus('checking');
    
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/registry?npi=eq.${npiValue}&select=id,npi,name,url,city,state`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        setNpiStatus('found');
        setExistingProvider(data[0]);
        // Auto-fill name if empty
        if (!formData.name && data[0].name) {
          setFormData(prev => ({ ...prev, name: data[0].name }));
        }
        // Auto-fill URL if exists and field is empty
        if (!formData.url && data[0].url) {
          setFormData(prev => ({ ...prev, url: data[0].url }));
        }
      } else {
        setNpiStatus('not_found');
        setNpiError('NPI not found in Texas registry. Please verify the number.');
      }
    } catch (error) {
      console.error('NPI validation error:', error);
      setNpiStatus('idle'); // Allow to proceed on error
    }
  };

  // Handle NPI input change
  const handleNPIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10); // Only digits, max 10
    setFormData({ ...formData, npi: value });
    
    // Debounce the validation
    if (value.length === 10) {
      validateNPI(value);
    } else {
      setNpiStatus('idle');
      setNpiError('');
      setExistingProvider(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    if (formData.npi.length !== 10) {
      setNpiError('Please enter a valid 10-digit NPI');
      return;
    }
    
    // Store data and navigate to results
    sessionStorage.setItem('scanData', JSON.stringify({
      ...formData,
      existingProvider // Include existing provider data if found
    }));
    router.push(`/scan/results?npi=${formData.npi}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-orange/20 text-orange px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🔍 COMPLIANCE VERIFICATION
          </div>
          <h1 className="text-5xl font-display font-bold mb-4">
            Run Sentry Scan
          </h1>
          <p className="text-xl text-gray-300">
            Verify your compliance status in 60 seconds. Identify violations across SB 1188 and HB 149 requirements.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card">
            <h2 className="text-2xl font-display font-bold text-navy mb-6">
              Provider Information
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* NPI Field - First for validation */}
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  NPI Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.npi}
                    onChange={handleNPIChange}
                    className={`input-field pr-10 ${
                      npiStatus === 'invalid' || npiStatus === 'not_found' 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                        : npiStatus === 'found' 
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-200'
                        : ''
                    }`}
                    placeholder="Enter 10-digit NPI"
                    maxLength={10}
                    inputMode="numeric"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {npiStatus === 'checking' && (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    )}
                    {npiStatus === 'found' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {(npiStatus === 'invalid' || npiStatus === 'not_found') && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                {npiStatus === 'found' && existingProvider && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Found: {existingProvider.name} {existingProvider.city && `(${existingProvider.city}, TX)`}
                  </p>
                )}
                {npiError && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {npiError}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formData.npi.length}/10 digits
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  Provider Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., August Dental Inc"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  onPaste={(e) => {
                    // Handle paste event
                    const pastedText = e.clipboardData.getData('text');
                    if (pastedText) {
                      e.preventDefault();
                      // Clean up URL if needed
                      let cleanUrl = pastedText.trim();
                      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                        cleanUrl = 'https://' + cleanUrl;
                      }
                      setFormData({ ...formData, url: cleanUrl });
                    }
                  }}
                  className="input-field"
                  placeholder="https://yourpractice.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the full URL including https://
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="your@email.com"
                />
                <p className="text-sm text-gray-600 mt-1">
                  We'll send your scan results to this address
                </p>
              </div>

              <button 
                type="submit" 
                className="btn-primary w-full text-lg"
                disabled={npiStatus === 'checking' || npiStatus === 'invalid'}
              >
                {npiStatus === 'checking' ? 'Validating NPI...' : 'Start Compliance Scan'}
              </button>
              
              {npiStatus === 'not_found' && (
                <p className="text-sm text-amber-600 text-center">
                  ⚠️ NPI not in registry - scan will add this provider
                </p>
              )}
            </form>
          </div>

          {/* What We Check */}
          <div className="mt-12">
            <h3 className="text-xl font-display font-bold text-navy mb-6 text-center">
              What We Check
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">📍</div>
                <div className="font-semibold text-navy mb-1">Data Sovereignty (SB 1188)</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• IP geo-location</li>
                  <li>• CDN & edge cache</li>
                  <li>• MX record pathing</li>
                  <li>• Sub-processor audit</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-semibold text-navy mb-1">AI Transparency (HB 149)</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• AI disclosure text</li>
                  <li>• Dark pattern detection</li>
                  <li>• Diagnostic AI disclaimers</li>
                  <li>• Chatbot notices</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">📋</div>
                <div className="font-semibold text-navy mb-1">EHR Integrity</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Biological sex fields</li>
                  <li>• Parental access portal</li>
                  <li>• Metabolic health tracking</li>
                  <li>• Forbidden data fields</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl mb-2">⚖️</div>
                <div className="font-semibold text-navy mb-1">What You Get</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Risk score & level</li>
                  <li>• Critical violations</li>
                  <li>• Email summary</li>
                  <li>• Remediation options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-navy" /></div>}>
      <ScanPageContent />
    </Suspense>
  );
}
