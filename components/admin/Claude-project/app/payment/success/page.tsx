'use client';

import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-navy p-6 text-center border-b-4 border-orange">
          <div className="text-2xl font-bold tracking-tighter text-white uppercase font-display">
            KAIRO<span className="text-orange">LOGIC</span>
          </div>
          <p className="text-blue-200 text-[10px] uppercase tracking-[0.2em] mt-1 font-semibold">
            Transaction Verified
          </p>
        </div>

        {/* Body */}
        <div className="p-10 md:p-14 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-navy mb-4 font-display">Payment Successful</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Your transaction has been processed and your account status has been updated.
            The KairoLogic Sentry engine is now prioritizing your assets.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 text-left">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Next Steps
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center text-sm text-navy">
                <svg className="w-4 h-4 mr-3 text-orange flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                Check your email for a formal receipt and access links.
              </li>
              <li className="flex items-center text-sm text-navy">
                <svg className="w-4 h-4 mr-3 text-orange flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                Your Forensic Audit Report is being finalized for download.
              </li>
            </ul>
          </div>

          <Link href="/">
            <button className="bg-navy text-white font-bold py-4 px-10 rounded-lg shadow-lg hover:bg-gold hover:text-navy transition-all">
              Return to KairoLogic
            </button>
          </Link>

          <p className="text-gray-400 text-xs mt-6">
            Questions? Call (512) 402-2237 or email compliance@kairologic.com
          </p>
        </div>
      </div>
    </div>
  );
}
