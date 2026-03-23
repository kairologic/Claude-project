'use client';

import Link from 'next/link';
import { usePageCMS } from '@/hooks/useCMSContent';

export default function CompliancePage() {
  const { content: cms, isLoading } = usePageCMS('Compliance');

  // Helper to get content with fallback
  const c = (key: string, fallback: string) => cms[key] || fallback;

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-block bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-semibold mb-4">
            {c('hero_badge', 'STATUTORY VANGUARD')}
          </div>
          <h1 className="section-heading text-white mb-4">
            {c('hero_title', 'The Sentry Compliance Standard')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            {c('hero_subtitle', 'A comprehensive technical and legal framework designed specifically for the Texas healthcare ecosystem. We navigate the complexities of SB 1188 and HB 149 so you can focus on patient care.')}
          </p>
        </div>
      </section>

      {/* Texas Legislative Mandates */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-16">
            {c('mandates_title', 'Texas Legislative Mandates')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* SB 1188 */}
            <div className="card border-l-4 border-l-orange">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">📍</span>
                <div>
                  <div className="text-sm text-gold uppercase tracking-wider font-semibold">
                    {c('sb1188_label', 'Texas Senate Bill')}
                  </div>
                  <div className="text-2xl font-display font-bold text-navy">
                    {c('sb1188_number', 'SB 1188')}
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-display font-bold text-navy mb-4">
                {c('sb1188_title', 'Data Sovereignty & Residency Requirements')}
              </h3>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('sb1188_item_1_title', '📊 Sovereign Regions')}
                  </div>
                  <p>{c('sb1188_item_1_text', 'All PHI (Protected Health Information) must reside on servers physically located within US domestic boundaries. Offshore cloud storage and CDN edge caching outside the US are prohibited.')}</p>
                </div>
                
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('sb1188_item_2_title', '🔄 CDN & Edge Cache Analysis')}
                  </div>
                  <p>{c('sb1188_item_2_text', 'Content Delivery Networks must be configured to serve Texas patients exclusively from US-based edge nodes. European or Asian cache propagation triggers non-compliance.')}</p>
                </div>
                
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('sb1188_item_3_title', '📧 MX Record Pathing')}
                  </div>
                  <p>{c('sb1188_item_3_text', 'Email infrastructure (MX records) routing patient communications through foreign mail servers constitutes a violation.')}</p>
                </div>
                
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('sb1188_item_4_title', '⚖️ Sub-Processor Audit')}
                  </div>
                  <p>{c('sb1188_item_4_text', 'Third-party service providers (payment processors, analytics, chatbots) must demonstrate US-only data residency.')}</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="font-bold text-red-900 mb-1">
                  {c('sb1188_penalty_title', '⚠️ Penalty: Up to $250,000')}
                </div>
                <p className="text-sm text-red-800">
                  {c('sb1188_penalty_text', 'Per violation for offshore data storage of PHI')}
                </p>
              </div>
            </div>

            {/* HB 149 */}
            <div className="card border-l-4 border-l-navy">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🤖</span>
                <div>
                  <div className="text-sm text-gold uppercase tracking-wider font-semibold">
                    {c('hb149_label', 'Texas House Bill')}
                  </div>
                  <div className="text-2xl font-display font-bold text-navy">
                    {c('hb149_number', 'HB 149')}
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-display font-bold text-navy mb-4">
                {c('hb149_title', 'AI Transparency & Disclosure Requirements')}
              </h3>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('hb149_item_1_title', '📢 Conspicuous AI Disclosure Text')}
                  </div>
                  <p>{c('hb149_item_1_text', 'Any AI-powered tools (chatbots, scheduling assistants, symptom checkers) must display clear, prominent disclosure text in at least 14px font. "Fine print" disclaimers do not satisfy the legal standard.')}</p>
                </div>
                
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('hb149_item_2_title', '🎨 Dark Pattern Detection')}
                  </div>
                  <p>{c('hb149_item_2_text', 'UI techniques that obscure AI disclosures (low opacity, hidden z-index layers, micro-fonts) are explicitly prohibited and trigger penalties.')}</p>
                </div>
                
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('hb149_item_3_title', '🩺 Diagnostic AI Disclaimer')}
                  </div>
                  <p>{c('hb149_item_3_text', 'AI tools providing medical advice or diagnosis must include explicit disclaimers stating that final decisions require licensed practitioner review.')}</p>
                </div>
                
                <div>
                  <div className="font-semibold text-navy mb-1">
                    {c('hb149_item_4_title', '💬 Chatbot Notice Requirements')}
                  </div>
                  <p>{c('hb149_item_4_text', 'AI chatbots must disclose their non-human nature at the start of every patient interaction.')}</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="font-bold text-red-900 mb-1">
                  {c('hb149_penalty_title', '⚠️ Penalty: Up to $250,000')}
                </div>
                <p className="text-sm text-red-800">
                  {c('hb149_penalty_text', 'Per violation for undisclosed or deceptive AI implementations')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enforcement Timeline */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-display font-bold text-center mb-12">
            {c('timeline_title', 'Enforcement Timeline')}
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-32 text-right">
                  <div className="font-display font-bold text-2xl text-navy">
                    {c('timeline_1_date', 'Sept 2024')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {c('timeline_1_label', 'Laws Enacted')}
                  </div>
                </div>
                <div className="flex-shrink-0 pt-2">
                  <div className="w-4 h-4 bg-gold rounded-full"></div>
                  <div className="w-0.5 h-full bg-gold ml-1.5"></div>
                </div>
                <div className="pb-8">
                  <div className="card">
                    <p className="text-gray-700">
                      {c('timeline_1_text', 'SB 1188 and HB 149 signed into Texas law. Grace period begins.')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-32 text-right">
                  <div className="font-display font-bold text-2xl text-navy">
                    {c('timeline_2_date', 'Jan 2025')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {c('timeline_2_label', 'Enforcement Begins')}
                  </div>
                </div>
                <div className="flex-shrink-0 pt-2">
                  <div className="w-4 h-4 bg-orange rounded-full ring-4 ring-orange/20"></div>
                  <div className="w-0.5 h-full bg-orange ml-1.5"></div>
                </div>
                <div className="pb-8">
                  <div className="card border-2 border-orange">
                    <p className="text-gray-700 font-semibold">
                      {c('timeline_2_text', 'Active enforcement period begins. Penalties now apply for non-compliance.')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-32 text-right">
                  <div className="font-display font-bold text-2xl text-navy">
                    {c('timeline_3_date', 'Q1 2025')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {c('timeline_3_label', 'Audits Begin')}
                  </div>
                </div>
                <div className="flex-shrink-0 pt-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                </div>
                <div>
                  <div className="card">
                    <p className="text-gray-700">
                      {c('timeline_3_text', 'Texas Attorney General begins systematic compliance audits of healthcare providers.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-display font-bold text-navy mb-6">
            {c('cta_title', 'Understand Your Compliance Status')}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {c('cta_subtitle', 'Run a comprehensive Sentry Scan to identify potential violations across data sovereignty and AI transparency requirements.')}
          </p>
          <Link href="/scan">
            <button className="btn-primary text-lg">
              {c('cta_button', 'Run Compliance Scan')}
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}

