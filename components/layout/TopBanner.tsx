'use client';

export default function TopBanner() {
  return (
    <div className="bg-navy text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-orange">⚠</span>
          <span className="font-semibold">TX SB 1188 ENFORCEMENT PERIOD ACTIVE • VERIFIED SOVEREIGNTY REQUIRED</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gold">📊</span>
            <span>ATX-01 HEARTBEAT: 12MS</span>
          </div>
          <button className="text-gold hover:text-gold-light transition-colors">
            Maximize Command Center
          </button>
        </div>
      </div>
    </div>
  );
}

