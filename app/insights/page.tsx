'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { 
  BookOpen, Calendar, Clock, ArrowRight, ArrowLeft, Shield, Eye, AlertTriangle,
  Globe, Server, Bot, FileText, Scale, ChevronRight, MapPin, X,
  Users, Cloud, Plug, MessageSquare, ClipboardList, CalendarClock, FileCheck
} from 'lucide-react';

// ─── Supabase Client ────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── Dynamic Article Renderer ───────────────────────────────────────────────

function DynamicArticle({ html }: { html: string }) {
  return (
    <div 
      className="article-body prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}

// ─── Icon Map (for DB posts that store icon as string) ──────────────────────

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Globe, Shield, Eye, AlertTriangle, FileText, ClipboardList, FileCheck,
  Server, Bot, Users, Cloud, Plug, MessageSquare, CalendarClock, Scale, BookOpen,
};

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
  {
    id: 'sb-1118-med-spas',
    category: 'Med Spa Compliance',
    statute: 'SB 1118',
    title: 'SB 1118 for Med Spas: Why Aesthetics Practices Are at Higher Risk This Year',
    excerpt: 'Texas med spas have been growing fast — faster than most traditional healthcare sectors. But SB 1118 quietly raises the stakes for every aesthetics practice in the state. Here\'s why med spas are uniquely exposed.',
    author: 'KairoLogic Compliance Team',
    date: 'February 4, 2026',
    time: '9:30 AM CST',
    timestamp: '2026-02-04T09:30:00-06:00',
    readTime: '4 min read',
    icon: ClipboardList,
    accentColor: 'orange',
  },
  {
    id: 'sb-1118-sb-49-intersection',
    category: 'Regulatory Analysis',
    statute: 'SB 1118 + SB 49',
    title: 'Complaint Handling + Digital Records: How SB 1118 and SB 49 Intersect in Real Life',
    excerpt: 'Most Texas practices have heard of SB 1118 and SB 49 separately. But very few realize how these two laws interlock — and how a simple complaint can instantly become a digital-records audit.',
    author: 'KairoLogic Compliance Team',
    date: 'February 6, 2026',
    time: '2:15 PM CST',
    timestamp: '2026-02-06T14:15:00-06:00',
    readTime: '4 min read',
    icon: FileCheck,
    accentColor: 'gold',
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

function Article4() {
  return (
    <div className="article-body">
      <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
        Texas med spas have been growing fast — faster than most traditional healthcare sectors. But with that growth comes something far less glamorous: a surge in patient complaints and a brand-new law, <span className="text-orange font-bold">SB 1118</span>, that quietly raises the stakes for every aesthetics practice in the state.
      </p>
      <p className="text-gray-600 leading-relaxed mb-10">
        If you run or manage a med spa, this is the year to tighten up your complaint handling, documentation, and staff communication. SB 1118 isn&apos;t complicated, but it is unforgiving.
      </p>

      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Why SB 1118 Hits Med Spas Harder Than Traditional Clinics</h2>
      <p className="text-gray-700 leading-relaxed mb-6">Med spas operate in a perfect storm of risk:</p>

      <div className="space-y-4 mb-10">
        {[
          { num: '01', title: 'High-Expectation Patients', desc: 'Aesthetics patients often expect immediate, visible results. When outcomes vary — even slightly — complaints spike.' },
          { num: '02', title: 'Fast-Moving Staff + High Volume', desc: 'Front desk teams juggle phones, walk-ins, memberships, and upsells. One missed step in documenting a complaint can now trigger an SB 1118 violation.' },
          { num: '03', title: 'More "Gray Area" Services', desc: 'Injectables, lasers, and wellness add-ons create more opportunities for misunderstandings, dissatisfaction, or miscommunication.' },
          { num: '04', title: 'Social Media Amplifies Everything', desc: 'A single unhappy patient can escalate from a DM to a formal complaint in hours.' },
        ].map(item => (
          <div key={item.num} className="flex gap-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="text-3xl font-display font-black text-orange/20">{item.num}</div>
            <div>
              <div className="font-display font-bold text-navy mb-1">{item.title}</div>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-orange/5 border-l-4 border-orange rounded-r-xl p-6 mb-10">
        <p className="text-gray-700 leading-relaxed font-medium">
          SB 1118 doesn&apos;t care whether the issue was minor. It cares whether you <strong>logged it</strong>, <strong>responded correctly</strong>, and <strong>documented the entire process</strong>.
        </p>
      </div>

      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">A Realistic Scenario</h2>
      <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-8 mb-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
          <AlertTriangle size={192} className="text-gold" />
        </div>
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold mb-4">The Friday Botox Touch-Up That Became a Monday Morning Investigation</div>
          <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
            <p>A patient calls on Friday afternoon saying her Botox &ldquo;didn&apos;t take.&rdquo; The front desk promises a touch-up next week but <strong className="text-white">forgets to log the complaint</strong>.</p>
            <p>Over the weekend, the patient posts on social media, gets advice from friends, and files a formal complaint with the state.</p>
            <p>By Monday, the practice is asked to provide:</p>
            <div className="grid grid-cols-2 gap-2 my-4">
              {['Complaint log entry', 'Documentation of the call', 'Notes on how it was handled', 'Proof of follow-up'].map(item => (
                <div key={item} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <X size={14} className="text-red-400" />
                  <span className="text-xs">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-gold font-semibold">None of it exists. Under SB 1118, that&apos;s a compliance failure — even if the clinical care was perfect.</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">What SB 1118 Actually Requires</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-100 mb-10">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider">Requirement</th>
              <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider">What It Means for Med Spas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              ['Every complaint must be logged', 'No more "we\'ll just handle it verbally."'],
              ['Document your response', 'Who called back, when, and what was said.'],
              ['Track resolution steps', 'Touch-ups, refunds, follow-ups — everything.'],
              ['Maintain a complaint log', 'Must be organized, accessible, and complete.'],
              ['Be ready for audits', 'The state can request logs at any time.'],
            ].map(([req, meaning], i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-5 py-3 font-semibold text-navy">{req}</td>
                <td className="px-5 py-3 text-gray-600">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-navy rounded-2xl p-8 text-white">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold mb-3">Bottom Line</div>
        <p className="text-lg font-display font-bold leading-relaxed mb-3">
          SB 1118 isn&apos;t about punishing practices. It&apos;s about ensuring consistent, documented responses.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Aesthetics practices are at higher risk because they handle more complaints, more expectations, and more gray-area services than traditional clinics. The good news? With the right systems in place, compliance becomes simple — and you protect your practice from unnecessary investigations.
        </p>
      </div>
    </div>
  );
}

function Article5() {
  return (
    <div className="article-body">
      <p className="text-lg text-gray-700 leading-relaxed mb-8 font-medium">
        Most Texas practices have heard of <span className="text-orange font-bold">SB 1118</span> (patient-complaint handling) and <span className="text-gold-dark font-bold">SB 49</span> (digital-records and documentation requirements). But very few realize how these two laws <em>interlock</em> — and how a simple complaint can instantly become a digital-records audit.
      </p>
      <p className="text-gray-600 leading-relaxed mb-10">
        If you&apos;re a med spa, clinic, or aesthetics practice, this intersection is where real risk lives. Not because you&apos;re doing anything wrong, but because the <strong>workflow between &ldquo;patient complaint&rdquo; and &ldquo;digital documentation&rdquo; is often messy, rushed, or inconsistent</strong>.
      </p>

      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Two Laws, One Weak Link</h2>
      <div className="bg-gradient-to-br from-orange/5 to-gold/5 border-2 border-orange/10 rounded-2xl p-8 mb-10">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-orange/10">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange mb-3">SB 1118</div>
            <p className="text-gray-700 text-sm leading-relaxed">Cares <strong>that</strong> you logged the complaint and responded properly.</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gold/20">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark mb-3">SB 49</div>
            <p className="text-gray-700 text-sm leading-relaxed">Cares <strong>how</strong> you documented it, stored it, and proved it happened.</p>
          </div>
        </div>
        <div className="text-center mt-6 text-sm text-gray-600">
          <strong className="text-navy">One law triggers the other.</strong> A complaint (SB 1118) becomes a documentation event (SB 49).
          <br />If either side is weak, the whole chain breaks.
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">The Complaint That Became a Records Problem</h2>
      <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-8 mb-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
          <FileCheck size={192} className="text-gold" />
        </div>
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold mb-4">The Laser Burn Complaint That Exposed a Digital Records Gap</div>
          <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
            <p>A patient emails the practice saying she has redness after a laser treatment. The front desk replies quickly, offers a follow-up visit, and thinks the issue is resolved.</p>
            <p>But two things go wrong:</p>
            <div className="space-y-2 my-4">
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-red-400 font-bold text-sm mt-0.5">1.</span>
                <span className="text-sm">The complaint isn&apos;t logged in the official SB 1118 complaint log.</span>
              </div>
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-red-400 font-bold text-sm mt-0.5">2.</span>
                <span className="text-sm">The email thread isn&apos;t saved in the EMR or digital record system.</span>
              </div>
            </div>
            <p>A week later, the patient files a formal complaint with the state. Now the practice must produce the complaint log entry, the email communication, documentation of the follow-up, notes from the visit, and proof of resolution.</p>
            <p className="text-gold font-semibold">The clinical care wasn&apos;t the problem. The documentation was. Two violations — one under each law.</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Where the Two Laws Overlap</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-100 mb-10">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider">Requirement</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider">SB 1118</th>
              <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider">SB 49</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider">Why It Matters</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              ['Log every complaint', true, false, 'Missing logs trigger investigations'],
              ['Document your response', true, true, 'Both laws expect proof of action'],
              ['Store records correctly', false, true, 'Emails, texts, photos must be retained'],
              ['Track resolution steps', true, true, 'Both require a clear timeline'],
              ['Produce records on request', true, true, 'Audits can happen anytime'],
            ].map(([req, sb1118, sb49, why], i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-semibold text-navy">{req as string}</td>
                <td className="px-4 py-3 text-center">{sb1118 ? <span className="text-green-500 text-lg">✓</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-center">{sb49 ? <span className="text-green-500 text-lg">✓</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-600">{why as string}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-gray-700 leading-relaxed mb-6">
        The overlap is where most practices stumble — not because they don&apos;t care, but because complaints often happen <strong>outside the EMR</strong>: email, text, Instagram DMs, phone calls, walk-ins, or staff notes on sticky pads.
      </p>
      <div className="bg-orange/5 border-l-4 border-orange rounded-r-xl p-6 mb-10">
        <p className="text-gray-700 text-sm leading-relaxed">
          <strong>SB 1118 says:</strong> &ldquo;Log it.&rdquo;<br />
          <strong>SB 49 says:</strong> &ldquo;Store it properly.&rdquo;<br />
          <span className="text-navy font-bold">Your workflow needs to do both.</span>
        </p>
      </div>

      <h2 className="text-2xl md:text-3xl font-display font-bold text-navy mb-6">Why This Matters More in 2025</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h4 className="font-display font-bold text-navy mb-3 text-sm">Texas Regulators Are Watching For:</h4>
          <div className="space-y-2">
            {['Inconsistent complaint logs', 'Missing digital records', 'Informal communication channels', 'Staff who "handled it verbally"', 'Slow document production'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-600"><Eye size={12} className="text-orange flex-shrink-0" /> {item}</div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h4 className="font-display font-bold text-navy mb-3 text-sm">Med Spas See More Of:</h4>
          <div className="space-y-2">
            {['High-expectation patients', 'Cosmetic dissatisfaction complaints', 'Social-media-driven escalations', 'Staff turnover breaking habits', 'Volume overwhelming documentation'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-600"><AlertTriangle size={12} className="text-gold-dark flex-shrink-0" /> {item}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-navy rounded-2xl p-8 text-white">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold mb-3">Bottom Line</div>
        <p className="text-lg font-display font-bold leading-relaxed mb-3">
          You don&apos;t need a legal team. You need one clean workflow.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          Connect complaint intake → complaint logging → digital documentation → follow-up tracking → record storage. When these steps are unified, compliance becomes simple — and you protect your practice from unnecessary investigations.
        </p>
      </div>
    </div>
  );
}

const articleComponents: Record<string, React.FC> = {
  'sb-1188-patient-data': Article1,
  'hb-149-ai-transparency': Article2,
  'combined-threat-solution': Article3,
  'sb-1118-med-spas': Article4,
  'sb-1118-sb-49-intersection': Article5,
};

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function InsightsPage() {
  const [activeBlog, setActiveBlog] = useState<string | null>(null);
  const [dbPosts, setDbPosts] = useState<any[]>([]);

  // Fetch published posts from Supabase
  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('content_status', 'published')
          .order('published_at', { ascending: false });
        if (!error && data) setDbPosts(data);
      } catch (e) {
        console.error('Error fetching blog posts:', e);
      }
    }
    fetchPosts();
  }, []);

  // Convert DB posts to the same shape as hardcoded posts
  const dbPostsMapped = dbPosts
    .filter(p => !blogs.some(b => b.id === p.slug)) // skip duplicates of hardcoded
    .map(p => {
      const d = new Date(p.published_at);
      return {
        id: p.slug,
        category: p.category || 'Compliance',
        statute: p.statute || 'SB 1188',
        title: p.title,
        excerpt: p.excerpt || '',
        author: p.author || 'KairoLogic Compliance Team',
        date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
        timestamp: p.published_at,
        readTime: p.read_time || '5 min read',
        icon: iconMap[p.icon] || Shield,
        accentColor: p.accent_color || 'orange',
        dbContent: p.content_html, // flag: this is a DB post with HTML content
      };
    });

  // Merge: DB posts first (newest), then hardcoded
  const allPosts = [...dbPostsMapped, ...blogs];
  
  const activePost = allPosts.find(b => b.id === activeBlog);
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
              onClick={() => setActiveBlog(allPosts[0].id)}
              className="w-full text-left group"
            >
              <div className="bg-gradient-to-br from-navy to-navy-dark rounded-3xl p-8 md:p-12 relative overflow-hidden hover:shadow-2xl transition-shadow">
                <div className="absolute top-0 right-0 w-72 h-72 opacity-5">
                  <AlertTriangle size={288} className="text-gold" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-orange/20 text-orange text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Featured</span>
                    <span className="bg-white/10 text-gold text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{allPosts[0].statute}</span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-4 group-hover:text-gold transition-colors leading-tight">
                    {allPosts[0].title}
                  </h2>
                  <p className="text-gray-400 max-w-2xl mb-6 leading-relaxed">
                    {allPosts[0].excerpt}
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      <Calendar size={14} /> {allPosts[0].date}
                    </span>
                    <span className="flex items-center gap-2 text-gray-500">
                      <Clock size={14} /> {allPosts[0].time}
                    </span>
                    <span className="flex items-center gap-2 text-gray-500">
                      <BookOpen size={14} /> {allPosts[0].readTime}
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
              {allPosts.slice(1).map((post) => {
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
          {(activePost as any)?.dbContent 
            ? <DynamicArticle html={(activePost as any).dbContent} />
            : ArticleContent && <ArticleContent />
          }
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
                <div className="font-display font-bold text-navy">{activePost?.author || 'KairoLogic Compliance Team'}</div>
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
              const idx = allPosts.findIndex(b => b.id === activeBlog);
              const next = allPosts[(idx + 1) % allPosts.length];
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

