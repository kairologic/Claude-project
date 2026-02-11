'use client';

import Link from 'next/link';

export default function TopBanner() {
  return (
    <div className="bg-slate-800 text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gold">⚡</span>
          <span className="font-medium">Texas SB 1188 now requires healthcare websites to keep patient data in the US.</span>
          <span className="hidden sm:inline text-slate-400">Is your practice compliant?</span>
        </div>
        <Link href="/scan" className="flex-shrink-0">
          <span className="text-gold font-bold hover:text-gold-light transition-colors">
            Free check →
          </span>
        </Link>
      </div>
    </div>
  );
}
