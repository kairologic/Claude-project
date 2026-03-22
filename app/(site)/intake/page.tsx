'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function IntakePage() {
  useEffect(() => {
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
      <section className="bg-navy text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-orange/20 text-orange px-4 py-2 rounded-full text-sm font-semibold mb-6">
            STEP 1 OF 2
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Sovereignty Audit Intake
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Complete your practice profile so our Sentry Engine can perform a comprehensive forensic analysis of your digital infrastructure.
          </p>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="py-8 bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <span className="text-sm font-semibold text-navy">Discovery Intake</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <span className="text-sm text-gray-500">Schedule Briefing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Fillout Embed */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div
              data-fillout-id="5Gd7USTge3us"
              data-fillout-embed-type="standard"
              data-fillout-inherit-parameters
              data-fillout-dynamic-resize
              style={{ minWidth: '320px', minHeight: '700px', width: '100%' }}
            ></div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-3">
              Already completed your intake?
            </p>
            <Link href="https://schedule.fillout.com/t/927Gv1zpdpus" target="_blank">
              <button className="bg-navy text-white font-semibold px-6 py-3 rounded-lg hover:bg-gold hover:text-navy transition-colors">
                Skip to Schedule Briefing
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

