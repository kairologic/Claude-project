'use client';

import Link from 'next/link';
import { Shield, FileCheck, Building2, TrendingUp } from 'lucide-react';
import { usePageCMS, CMSText, CMSHtml } from '@/hooks/useCMSContent';

export default function HomePage() {
  const { content: cms, isLoading } = usePageCMS('Homepage');

  // Helper to get content with fallback
  const c = (key: string, fallback: string) => cms[key] || fallback;

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-navy via-navy-light to-navy-dark text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block bg-green-400/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-pulse">
              {c('hero_badge', '🟢 SOVEREIGN MODE: ATX-01 ACTIVE')}
            </div>
            <h1 
              className="text-6xl md:text-7xl font-display font-extrabold mb-6 leading-tight"
              dangerouslySetInnerHTML={{ 
                __html: c('hero_title', 'THE <span class="text-gold">SENTRY</span><br/>COMPLIANCE STANDARD') 
              }}
            />
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
              {c('hero_subtitle', 'Navigate SB 1188 and HB 149 with unwavering confidence. Your sovereign health data fortress.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/scan">
                <button className="btn-primary text-lg px-8 py-4">
                  {c('hero_cta_primary', 'RUN COMPLIANCE SCAN')}
                </button>
              </Link>
              <Link href="/registry">
                <button className="btn-outline text-lg px-8 py-4 bg-white/10 border-white hover:bg-white">
                  {c('hero_cta_secondary', 'VIEW TEXAS REGISTRY')}
                </button>
              </Link>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <div className="text-4xl font-display font-bold text-gold mb-2">
                {c('trust_stat_1_value', '480K+')}
              </div>
              <div className="text-sm text-gray-300">
                {c('trust_stat_1_label', 'Texas Providers Monitored')}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <div className="text-4xl font-display font-bold text-gold mb-2">
                {c('trust_stat_2_value', '100%')}
              </div>
              <div className="text-sm text-gray-300">
                {c('trust_stat_2_label', 'SB 1188 Compliant')}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
              <div className="text-4xl font-display font-bold text-gold mb-2">
                {c('trust_stat_3_value', '24/7')}
              </div>
              <div className="text-sm text-gray-300">
                {c('trust_stat_3_label', 'Real-Time Monitoring')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 
              className="section-heading"
              dangerouslySetInnerHTML={{ 
                __html: c('value_section_title', 'Why Choose <span class="text-gold">KairoLogic?</span>') 
              }}
            />
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {c('value_section_subtitle', 'The only platform built specifically for Texas healthcare compliance with sovereign data architecture.')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card text-center group hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange/10 rounded-full mb-4 group-hover:bg-orange/20 transition-colors">
                <Shield className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-display font-bold text-navy mb-3">
                {c('value_card_1_title', 'Sovereign Architecture')}
              </h3>
              <p className="text-gray-600">
                {c('value_card_1_description', 'Your PHI remains on domestic nodes. No foreign cloud dependencies. Pure Texas sovereignty.')}
              </p>
            </div>

            <div className="card text-center group hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange/10 rounded-full mb-4 group-hover:bg-orange/20 transition-colors">
                <FileCheck className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-display font-bold text-navy mb-3">
                {c('value_card_2_title', 'Legislative Guardian')}
              </h3>
              <p className="text-gray-600">
                {c('value_card_2_description', 'Real-time monitoring of SB 1188 and HB 149 compliance requirements and penalties.')}
              </p>
            </div>

            <div className="card text-center group hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange/10 rounded-full mb-4 group-hover:bg-orange/20 transition-colors">
                <Building2 className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-display font-bold text-navy mb-3">
                {c('value_card_3_title', 'Texas Registry')}
              </h3>
              <p className="text-gray-600">
                {c('value_card_3_description', 'Searchable directory of 480K+ Texas healthcare providers with compliance scoring.')}
              </p>
            </div>

            <div className="card text-center group hover:scale-105 transition-transform">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange/10 rounded-full mb-4 group-hover:bg-orange/20 transition-colors">
                <TrendingUp className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-display font-bold text-navy mb-3">
                {c('value_card_4_title', 'Risk Analytics')}
              </h3>
              <p className="text-gray-600">
                {c('value_card_4_description', 'Predictive compliance scoring and drift detection to prevent violations before they occur.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Legislative Notice */}
      <section className="py-16 bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-orange/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚠</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-display font-bold mb-4">
                {c('notice_title', 'Statutory Enforcement Period: ACTIVE')}
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed mb-4">
                {c('notice_text_1', 'Texas SB 1188 and HB 149 mandate that all covered entities processing protected health information (PHI) must ensure data sovereignty and maintain domestic infrastructure nodes.')}
              </p>
              <p 
                className="text-gray-300 text-lg leading-relaxed mb-6"
                dangerouslySetInnerHTML={{ 
                  __html: c('notice_text_2', 'Non-compliance carries civil penalties up to <span class="text-gold font-bold">$50,000 per violation</span>, with potential criminal prosecution for willful violations.') 
                }}
              />
              <Link href="/compliance">
                <button className="btn-primary">
                  {c('notice_cta', 'VIEW COMPLIANCE REQUIREMENTS')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-orange to-orange-dark text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            {c('cta_title', 'Ready to Secure Your Compliance?')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {c('cta_subtitle', 'Run a free compliance scan or explore our registry of Texas healthcare providers.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/scan">
              <button className="bg-white text-orange font-semibold px-8 py-4 rounded-lg text-lg hover:bg-gray-100 transition-all duration-200 shadow-xl">
                {c('cta_button_1', 'FREE COMPLIANCE SCAN')}
              </button>
            </Link>
            <Link href="/services">
              <button className="bg-navy text-white font-semibold px-8 py-4 rounded-lg text-lg hover:bg-navy-light transition-all duration-200">
                {c('cta_button_2', 'VIEW SERVICE TIERS')}
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
