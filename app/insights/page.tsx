'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Calendar, Clock, ArrowRight, ArrowLeft, Shield, Eye, AlertTriangle,
  Globe, Server, Bot, FileText, Scale, ChevronRight, MapPin, X,
  Users, Cloud, Plug, MessageSquare, ClipboardList, CalendarClock, FileCheck
} from 'lucide-react';

// ─── Blog Data ───────────────────────────────────────────────────────────────

const blogs = [
  {
    id: 'sb-1188-patient-data',
    category: 'Data Sovereignty',
    statute: 'SB 1188',
    title: 'Texas SB 1188: Is Your Patient Data Leaving the Country (and Costing You $250,000)?',
    excerpt: 'Texas SB 1188 is the quietest, most expensive law most providers haven\'t heard of. If your patient data leaves the United States — even indirectly — you could face $250,000 per violation.',
    author: 'KairoLogic Compliance Team',
    date: 'January 28, 2026',
    time: '8:15 AM CST',
    timestamp: '2026-01-28T08:15:00-06:00',
    readTime: '6 min read',
    icon: Globe,
    accentColor: 'orange',
  },
  {
    id: 'hb-149-ai-transparency',
    category: 'AI Transparency',
    statute: 'HB 149',
    title: 'Texas HB 149 & AI: Is Your Website Hiding What Patients Need to Know?',
    excerpt: 'Texas HB 149 is reshaping how healthcare websites must communicate — especially if you use AI, chatbots, or automated decision tools. This law isn\'t about cybersecurity. It\'s about transparency.',
    author: 'KairoLogic Compliance Team',
    date: 'January 29, 2026',
    time: '2:30 PM CST',
    timestamp: '2026-01-29T14:30:00-06:00',
    readTime: '5 min read',
    icon: Eye,
    accentColor: 'gold',
  },
  {
    id: 'combined-threat-solution',
    category: 'Compliance Strategy',
    statute: 'SB 1188 + HB 149',
    title: 'Why Your AI & VAs Are a $250,000 Texas Compliance Risk (and How to Fix It Fast)',
    excerpt: 'Texas providers are facing a perfect storm: AI tools + offshore virtual assistants + new Texas laws = massive liability. SB 1188 and HB 149 overlap in a way most practices haven\'t realized.',
    author: 'KairoLogic Compliance Team',
    date: 'January 30, 2026',
    time: '11:00 AM CST',
    timestamp: '2026-01-30T11:00:00-06:00',
    readTime: '7 min read',
    icon: AlertTriangle,
    accentColor: 'orange',
  },
];

// ─── Article Content Components ──────────────────────────────────────────────

function Article1() {
  return (
    <div className="article-body">
      <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
        Texas SB 1188 is the quietest, most expensive law most providers haven&apos;t heard of. It doesn&apos;t care how big your practice is. It doesn&apos;t care whether you meant to violate it. If your patient data leaves the United States — even indirectly — you could face <span className="text-orange font-bold">$250,000 per violation</span>.
      </p>
      <p className="text-gray-600 leading-relaxed mb-10">
        And here&apos;s the twist: Most practices have no idea their data is already crossing borders.
      </p>

      {/* Why SB 1188 Exists */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Why SB 1188 Exists</h2>
      <p className="text-gray-700 leading-relaxed mb-6">
        Texas lawmakers want to prevent patient data from being accessed, stored, or processed in countries considered &quot;foreign adversaries.&quot; That includes:
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        {['China', 'Russia', 'Iran', 'North Korea', 'Cuba', 'Venezuela (Maduro regime)'].map(c => (
          <div key={c} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <MapPin size={14} className="text-red-500 shrink-0" />
            <span className="text-sm font-semibold text-red-800">{c}</span>
          </div>
        ))}
      </div>
      <p className="text-gray-700 leading-relaxed mb-10">
        If any part of your workflow touches these regions, you&apos;re exposed.
      </p>

      {/* How Practices Accidentally Violate */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">How Practices Accidentally Violate SB 1188</h2>
      <p className="text-gray-700 leading-relaxed mb-6">
        You don&apos;t need to &quot;send&quot; data overseas. It can happen through:
      </p>
      <div className="space-y-4 mb-10">
        {[
          { icon: Users, source: 'Virtual Assistants (VAs)', how: 'Offshore staff accessing PHI', why: 'You may not know where subcontractors are located' },
          { icon: Bot, source: 'AI Tools', how: 'Models trained or hosted abroad', why: 'Vendors rarely disclose data routing' },
          { icon: Cloud, source: 'Cloud Apps', how: 'Backups stored internationally', why: '"Global redundancy" often includes foreign servers' },
          { icon: Plug, source: 'Plugins & Integrations', how: 'Hidden API calls', why: 'No visibility into third-party data flow' },
        ].map((r, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-orange/10 p-3 rounded-xl shrink-0">
                <r.icon size={20} className="text-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-navy mb-1">{r.source}</div>
                <div className="text-sm text-gray-700 mb-1"><span className="font-semibold text-navy">How it violates:</span> {r.how}</div>
                <div className="text-sm text-gray-500"><span className="font-semibold text-gray-600">Hard to detect because:</span> {r.why}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning Callout */}
      <div className="bg-gradient-to-br from-orange/5 to-red-50 border-2 border-orange/20 rounded-2xl p-8 mb-10">
        <div className="flex items-start gap-4">
          <div className="bg-orange/10 p-3 rounded-full shrink-0">
            <AlertTriangle size={24} className="text-orange" />
          </div>
          <div>
            <div className="font-display font-bold text-navy text-lg mb-2">The $250,000 Question</div>
            <p className="text-gray-700 leading-relaxed italic">
              &quot;Does patient data ever leave the United States?&quot;
            </p>
            <p className="text-gray-600 text-sm mt-2">
              If you can&apos;t prove the answer is &quot;no,&quot; you&apos;re exposed. None of the typical vendor assurances — &quot;We&apos;re HIPAA compliant,&quot; &quot;We don&apos;t store your data,&quot; &quot;We use secure servers&quot; — answer this question.
            </p>
          </div>
        </div>
      </div>

      {/* The Fix */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">The Fix: Automated Vendor &amp; Data Flow Scanning</h2>
      <p className="text-gray-700 leading-relaxed mb-6">Modern compliance tools can now:</p>
      <div className="grid md:grid-cols-2 gap-3 mb-10">
        {['Detect offshore access', 'Identify foreign data routing', 'Flag risky vendors', 'Provide SB 1188-ready documentation'].map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-5 py-4">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-sm font-semibold text-green-900">{f}</span>
          </div>
        ))}
      </div>

      {/* Bottom Line */}
      <div className="bg-navy rounded-2xl p-8 text-white">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold mb-3">Bottom Line</div>
        <p className="text-lg font-display font-bold leading-relaxed mb-3">
          SB 1188 isn&apos;t a theoretical risk. It&apos;s a $250,000 mistake waiting to happen.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          And the practices most at risk are the ones who think, &quot;Not me. My data is safe.&quot;
        </p>
      </div>
    </div>
  );
}

function Article2() {
  return (
    <div className="article-body">
      <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
        Texas HB 149 is reshaping how healthcare websites must communicate — especially if you use AI, chatbots, or automated decision tools. This law isn&apos;t about cybersecurity. It&apos;s about <span className="text-gold-dark font-bold">transparency</span> — and the penalties for getting it wrong are real.
      </p>

      {/* What HB 149 Requires */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">What HB 149 Requires</h2>
      <p className="text-gray-700 leading-relaxed mb-6">
        If your website uses AI in any way that influences patient decisions, you must clearly disclose:
      </p>
      <div className="space-y-3 mb-6">
        {[
          'That AI is being used',
          'What the AI does',
          'How it affects the patient',
          'How the patient can opt out or reach a human',
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-3 bg-gold/5 border border-gold/20 rounded-xl px-5 py-4">
            <div className="w-7 h-7 bg-gold rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold">{i + 1}</div>
            <span className="text-sm font-semibold text-navy">{r}</span>
          </div>
        ))}
      </div>
      <p className="text-gray-600 leading-relaxed mb-10">
        Most practices don&apos;t do this. Many don&apos;t even know they&apos;re required to.
      </p>

      {/* Where Practices Are Failing */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Where Practices Are Failing</h2>
      <p className="text-gray-700 leading-relaxed mb-6">Here are the most common HB 149 violations:</p>
      <div className="space-y-4 mb-10">
        {[
          { icon: MessageSquare, feature: 'AI Chatbots', violation: 'No disclosure of automated responses', example: '"Ask our assistant!" with no transparency' },
          { icon: ClipboardList, feature: 'Symptom Checkers', violation: 'Automated triage without explanation', example: 'Tools that suggest care levels' },
          { icon: CalendarClock, feature: 'Scheduling Tools', violation: 'AI-based routing', example: '"Next available appointment" powered by algorithms' },
          { icon: FileCheck, feature: 'Intake Forms', violation: 'Automated risk scoring', example: 'No notice that AI is evaluating answers' },
        ].map((r, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4 p-6">
              <div className="bg-gold/10 p-3 rounded-xl shrink-0">
                <r.icon size={20} className="text-gold-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-navy mb-2">{r.feature}</div>
                <div className="text-sm text-gray-700 mb-1"><span className="font-semibold text-red-600">Violation:</span> {r.violation}</div>
                <div className="text-sm text-gray-500 italic">&quot;{r.example}&quot;</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Why This Matters */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Why This Matters</h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        Patients must know when they&apos;re interacting with AI — not a human. Texas lawmakers want to prevent:
      </p>
      <div className="grid md:grid-cols-3 gap-3 mb-10">
        {['Misleading automation', 'Hidden decision-making', 'AI-driven medical guidance without transparency'].map((t, i) => (
          <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <X size={18} className="text-red-500 mx-auto mb-2" />
            <span className="text-sm font-semibold text-red-800">{t}</span>
          </div>
        ))}
      </div>

      {/* The Fix */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">The Fix: Clear, Plain-Language AI Notices</h2>
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 mb-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-green-700 mb-3">Compliant Disclosure Example</div>
        <p className="text-green-900 font-display font-bold text-lg leading-relaxed italic">
          &quot;This tool uses AI to assist with scheduling and recommendations. You may request human assistance at any time.&quot;
        </p>
        <p className="text-green-700 text-sm mt-3">Simple. Clear. Legal.</p>
      </div>

      {/* Bottom Line */}
      <div className="bg-navy rounded-2xl p-8 text-white">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold mb-3">Bottom Line</div>
        <p className="text-lg font-display font-bold leading-relaxed mb-3">
          HB 149 isn&apos;t anti-AI. It&apos;s pro-transparency.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          If your website uses AI — even behind the scenes — you need to tell patients. And if you don&apos;t know whether your tools use AI… that&apos;s the first problem to solve.
        </p>
      </div>
    </div>
  );
}

function Article3() {
  return (
    <div className="article-body">
      <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
        Texas providers are facing a perfect storm: AI tools + offshore virtual assistants + new Texas laws = <span className="text-orange font-bold">massive liability</span>. SB 1188 and HB 149 overlap in a way most practices haven&apos;t realized — and the combination creates a compliance gap big enough to drive a lawsuit through.
      </p>

      {/* The Hidden Risk Triangle */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">The Hidden Risk Triangle</h2>
      <p className="text-gray-700 leading-relaxed mb-6">Your practice is exposed if you use:</p>
      
      {/* Triangle Visual */}
      <div className="relative bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-8 md:p-12 mb-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
          <AlertTriangle size={192} className="text-gold" />
        </div>
        <div className="grid md:grid-cols-3 gap-6 relative z-10">
          {[
            { label: 'Offshore VAs', risk: 'PHI accessed outside the U.S.', law: 'SB 1188', icon: Users },
            { label: 'AI Tools', risk: 'Undisclosed automated decision-making', law: 'HB 149', icon: Bot },
            { label: 'Cloud Vendors', risk: 'Unknown data routing', law: 'SB 1188', icon: Cloud },
          ].map((t, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
              <t.icon size={28} className="text-gold mx-auto mb-3" />
              <div className="text-white font-display font-bold mb-2">{t.label}</div>
              <div className="text-gray-400 text-sm mb-3">{t.risk}</div>
              <div className="inline-block bg-orange/20 text-orange text-xs font-bold px-3 py-1 rounded-full">{t.law}</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8 relative z-10">
          <div className="inline-block bg-orange/20 border border-orange/30 rounded-xl px-6 py-3">
            <span className="text-orange font-display font-bold text-lg">$250,000 Risk Per Violation</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm text-center mt-4 relative z-10">Most practices use all three.</p>
      </div>

      {/* Why This Matters Now */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Why This Matters Now</h2>
      <p className="text-gray-700 leading-relaxed mb-4">
        Texas regulators are tightening enforcement. Plaintiff attorneys are watching. And patients are becoming more aware of their rights.
      </p>
      <div className="bg-gradient-to-br from-red-50 to-orange/5 border-2 border-red-100 rounded-2xl p-8 mb-10">
        <div className="flex items-start gap-4">
          <div className="bg-red-100 p-3 rounded-full shrink-0">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <div>
            <div className="font-display font-bold text-navy text-lg mb-2">The Biggest Misconception</div>
            <p className="text-gray-700 leading-relaxed italic mb-2">
              &quot;My vendor handles compliance.&quot;
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Vendors handle <em>their</em> compliance. <strong>You&apos;re responsible for yours.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* The Fastest Fix */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">The Fastest Fix: Automated Compliance Scanning</h2>
      <p className="text-gray-700 leading-relaxed mb-6">Modern tools can now:</p>
      <div className="space-y-3 mb-10">
        {[
          'Detect offshore access in real time',
          'Identify AI tools on your website',
          'Flag missing HB 149 disclosures',
          'Map data flows for SB 1188',
          'Generate audit-ready reports',
        ].map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-5 py-4">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-sm font-semibold text-green-900">{f}</span>
          </div>
        ))}
      </div>

      {/* Bottom Line */}
      <div className="bg-navy rounded-2xl p-8 text-white">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold mb-3">Bottom Line</div>
        <p className="text-lg font-display font-bold leading-relaxed mb-3">
          AI and VAs aren&apos;t the problem. Blind spots are.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Texas has made it clear: If you use AI or offshore labor, you must prove your patient data is protected and your website is transparent. The practices that act now will stay compliant. The ones that don&apos;t will pay for it — literally.
        </p>
      </div>
    </div>
  );
}

const articleComponents: Record<string, React.FC> = {
  'sb-1188-patient-data': Article1,
  'hb-149-ai-transparency': Article2,
  'combined-threat-solution': Article3,
};

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeBlog, setActiveBlog] = useState<string | null>(null);
  
  const activePost = blogs.find(b => b.id === activeBlog);
  const ArticleContent = activeBlog ? articleComponents[activeBlog] : null;

  // ── Blog List View ──
  if (!activeBlog) {
    return (
      <div>
        {/* Hero */}
        <section className="bg-navy text-white py-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.03]">
            <BookOpen size={384} />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="inline-block bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-semibold mb-4">
              SENTRY INTELLIGENCE
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Insights
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl">
              Compliance analysis, legislative intelligence, and technical guidance for Texas healthcare providers navigating SB 1188 and HB 149.
            </p>
          </div>
        </section>

        {/* Featured Post */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setActiveBlog(blogs[2].id)}
              className="w-full text-left group"
            >
              <div className="bg-gradient-to-br from-navy to-navy-dark rounded-3xl p-8 md:p-12 relative overflow-hidden hover:shadow-2xl transition-shadow">
                <div className="absolute top-0 right-0 w-72 h-72 opacity-5">
                  <AlertTriangle size={288} className="text-gold" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-orange/20 text-orange text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Featured</span>
                    <span className="bg-white/10 text-gold text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{blogs[2].statute}</span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-4 group-hover:text-gold transition-colors leading-tight">
                    {blogs[2].title}
                  </h2>
                  <p className="text-gray-400 max-w-2xl mb-6 leading-relaxed">
                    {blogs[2].excerpt}
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      <Calendar size={14} /> {blogs[2].date}
                    </span>
                    <span className="flex items-center gap-2 text-gray-500">
                      <Clock size={14} /> {blogs[2].time}
                    </span>
                    <span className="flex items-center gap-2 text-gray-500">
                      <BookOpen size={14} /> {blogs[2].readTime}
                    </span>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-gold font-bold text-sm uppercase tracking-wider group-hover:gap-3 transition-all">
                    Read Analysis <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {blogs.slice(0, 2).map((post) => {
                const Icon = post.icon;
                return (
                  <button
                    key={post.id}
                    onClick={() => setActiveBlog(post.id)}
                    className="text-left group"
                  >
                    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                      {/* Card Header */}
                      <div className={`p-6 ${post.accentColor === 'orange' ? 'bg-gradient-to-r from-orange/5 to-transparent border-b-2 border-orange/20' : 'bg-gradient-to-r from-gold/5 to-transparent border-b-2 border-gold/20'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className={post.accentColor === 'orange' ? 'text-orange' : 'text-gold-dark'} />
                            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-500">{post.category}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${post.accentColor === 'orange' ? 'bg-orange/10 text-orange' : 'bg-gold/10 text-gold-dark'}`}>
                            {post.statute}
                          </span>
                        </div>
                        <h3 className="text-xl font-display font-bold text-navy group-hover:text-gold-dark transition-colors leading-tight">
                          {post.title}
                        </h3>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 flex-1 flex flex-col">
                        <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {post.date}</span>
                            <span className="flex items-center gap-1"><Clock size={11} /> {post.time}</span>
                          </div>
                          <div className="flex items-center gap-1 text-navy font-bold text-xs uppercase tracking-wider group-hover:text-gold-dark group-hover:gap-2 transition-all">
                            Read <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    </article>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-gray-50 to-gold/5 border-2 border-gold/20 rounded-3xl p-8 md:p-12 text-center">
              <Shield size={40} className="text-gold mx-auto mb-4" />
              <h3 className="text-2xl md:text-3xl font-display font-bold text-navy mb-4">
                Don&apos;t Wait for a Violation Notice
              </h3>
              <p className="text-gray-600 max-w-xl mx-auto mb-8">
                Run a free compliance scan to see where your practice stands with SB 1188 and HB 149 — in under 60 seconds.
              </p>
              <Link href="/scan" className="inline-flex items-center gap-2 bg-navy text-white px-8 py-4 rounded-xl font-display font-bold text-sm uppercase tracking-wider hover:bg-gold hover:text-navy transition-all shadow-lg">
                <Shield size={16} /> Run Free Compliance Scan
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── Article Detail View ──
  return (
    <div>
      {/* Article Header */}
      <section className="bg-navy text-white py-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.03]">
          {activePost && <activePost.icon size={288} />}
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <button
            onClick={() => setActiveBlog(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-gold transition-colors text-sm font-semibold mb-6"
          >
            <ArrowLeft size={16} /> Back to Insights
          </button>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${activePost?.accentColor === 'orange' ? 'bg-orange/20 text-orange' : 'bg-gold/20 text-gold'}`}>
              {activePost?.category}
            </span>
            <span className="bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              {activePost?.statute}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight mb-6">
            {activePost?.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-2"><FileText size={14} /> {activePost?.author}</span>
            <span className="flex items-center gap-2"><Calendar size={14} /> {activePost?.date}</span>
            <span className="flex items-center gap-2"><Clock size={14} /> {activePost?.time}</span>
            <span className="flex items-center gap-2"><BookOpen size={14} /> {activePost?.readTime}</span>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {ArticleContent && <ArticleContent />}
        </div>
      </section>

      {/* Article Footer */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Author */}
          <div className="border-t border-gray-200 pt-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-navy rounded-full flex items-center justify-center">
                <Shield size={20} className="text-gold" />
              </div>
              <div>
                <div className="font-display font-bold text-navy">KairoLogic Compliance Team</div>
                <div className="text-sm text-gray-500">Statutory Vanguard Division &bull; Austin, Texas</div>
              </div>
            </div>
          </div>

          {/* Scan CTA */}
          <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-8 text-center text-white">
            <h3 className="font-display font-bold text-xl mb-3">Is your practice compliant?</h3>
            <p className="text-gray-400 text-sm mb-6">Run a free Sentry scan to find out in under 60 seconds.</p>
            <Link href="/scan" className="inline-flex items-center gap-2 bg-gold text-navy px-6 py-3 rounded-xl font-display font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all">
              <Shield size={16} /> Run Free Scan
            </Link>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setActiveBlog(null)}
              className="flex items-center gap-2 text-navy font-bold text-sm hover:text-gold transition-colors"
            >
              <ArrowLeft size={16} /> All Insights
            </button>
            {(() => {
              const idx = blogs.findIndex(b => b.id === activeBlog);
              const next = blogs[(idx + 1) % blogs.length];
              return (
                <button
                  onClick={() => setActiveBlog(next.id)}
                  className="flex items-center gap-2 text-navy font-bold text-sm hover:text-gold transition-colors"
                >
                  Next Article <ArrowRight size={16} />
                </button>
              );
            })()}
          </div>
        </div>
      </section>
    </div>
  );
}
