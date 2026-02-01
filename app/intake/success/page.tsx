'use client';

import Link from 'next/link';

export default function IntakeSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-navy p-8 text-center border-b-4 border-orange">
          <div className="text-3xl font-bold tracking-tighter text-white uppercase font-display">
            KAIRO<span className="text-orange">LOGIC</span>
          </div>
          <p className="text-blue-200 text-xs uppercase tracking-[0.2em] mt-2 font-semibold">
            Sovereignty Audit &amp; Compliance
          </p>
        </div>

        {/* Body */}
        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-navy mb-3 font-display">
              Audit Intake Successfully Logged
            </h1>
            <p className="text-gray-600 max-w-lg mx-auto leading-relaxed">
              Thank you. Our Sentry Engine has completed the preliminary scan of your digital border.
              A summary has been dispatched to your email.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 border-t border-b py-8 border-gray-100">
            {/* Next Steps */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange mb-4">
                Immediate Next Steps
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start text-sm">
                  <span className="font-mono text-navy font-bold mr-3">01.</span>
                  <p>
                    <span className="font-semibold">Review your Inbox:</span> Your Executive Risk Summary
                    should arrive in 2-3 minutes.
                  </p>
                </li>
                <li className="flex items-start text-sm">
                  <span className="font-mono text-navy font-bold mr-3">02.</span>
                  <p>
                    <span className="font-semibold">Schedule Your Briefing:</span> Book a 15-minute session
                    with our compliance engineering desk.
                  </p>
                </li>
                <li className="flex items-start text-sm">
                  <span className="font-mono text-navy font-bold mr-3">03.</span>
                  <p>
                    <span className="font-semibold">Statutory Shield:</span> Finalize your Remediation Roadmap
                    to protect against the $250k penalty risk.
                  </p>
                </li>
              </ul>
            </div>

            {/* Schedule CTA */}
            <div className="flex flex-col justify-center">
              <div className="bg-navy rounded-2xl p-6 text-center">
                <h3 className="text-white font-display font-bold text-lg mb-2">
                  Step 2: Schedule Your Briefing
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Statutory Risk Briefing (Value: $250 &mdash; Waived for NPI holders)
                </p>
                <a
                  href="https://schedule.fillout.com/t/927Gv1zpdpus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-orange hover:bg-orange-dark text-white font-bold px-8 py-3 rounded-lg transition-colors w-full"
                >
                  SCHEDULE BRIEFING
                </a>
                <p className="text-gray-500 text-xs mt-3">
                  Or call (512) 402-2237 for immediate assistance
                </p>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-navy font-semibold hover:text-orange transition-colors">
              Return to KairoLogic Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
