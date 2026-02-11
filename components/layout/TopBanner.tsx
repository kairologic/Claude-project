'use client';

import Link from 'next/link';

export default function TopBanner() {
  return (
    <div className="bg-red-700 text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <span className="font-semibold">New Texas law requires healthcare websites to keep patient data in the US.</span>
          <span className="hidden sm:inline text-red-200">Fines up to $50,000 per violation.</span>
        </div>
        <Link href="/scan" className="flex-shrink-0">
          <span className="text-white font-bold hover:text-red-200 transition-colors underline underline-offset-2">
            Check your site free →
          </span>
        </Link>
      </div>
    </div>
  );
}
