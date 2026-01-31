'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ConsultationPage() {
  useEffect(() => {
    // Load Fillout widget script
    const script = document.createElement('script');
    script.src = 'https://server.fillout.com/embed/v1/';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-navy-dark text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-orange/20 text-orange px-4 py-2 rounded-full text-sm font-semibold mb-6">
            📅 PRIORITY SCHEDULING AVAILABLE
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">
            Schedule Your Technical Consultation
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            90-minute deep-dive session with our compliance specialists to create your custom remediation roadmap.
          </p>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-navy text-center mb-12">
            What to Expect in Your Consultation
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-display font-bold text-navy mb-3">
                Compliance Analysis
              </h3>
              <p className="text-gray-600">
                We'll review your scan results in detail and prioritize violations by statutory risk and implementation complexity.
              </p>
            </div>

            <div className="card text-center">
              <div className="text-4xl mb-4">🛠</div>
              <h3 className="text-xl font-display font-bold text-navy mb-3">
                Technical Roadmap
              </h3>
              <p className="text-gray-600">
                Get a custom remediation plan with specific steps, timelines, and technical requirements for your infrastructure.
              </p>
            </div>

            <div className="card text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-display font-bold text-navy mb-3">
                Expert Q&A
              </h3>
              <p className="text-gray-600">
                Direct access to our compliance team to address your specific questions and concerns about implementation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fillout Embed */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card">
            <h2 className="text-2xl font-display font-bold text-navy mb-6 text-center">
              Select Your Preferred Time
            </h2>
            
            {/* Fillout inline widget */}
            <div 
              data-fillout-id="kairologic-consultation"
              data-fillout-embed-type="standard"
              data-fillout-inherit-parameters
              data-fillout-dynamic-resize
              style={{ minWidth: '320px', minHeight: '700px', width: '100%' }}
            ></div>
          </div>

          {/* Alternative: Contact Form */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Can't find a suitable time? We offer flexible scheduling for urgent compliance needs.
            </p>
            <Link href="/contact">
              <button className="btn-secondary">
                Request Custom Schedule
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Technical Consultation Package ($3,000)
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>Complete PDF report with all compliance findings</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>90-minute live video consultation</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>Custom remediation timeline</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>Infrastructure-specific guidance (AWS, GCP, Azure)</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>Priority-ranked action items</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>Q&A with compliance specialists</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>Code examples and implementation templates</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold text-xl">✓</span>
                <span>30-day email support post-consultation</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
