import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-navy text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gold rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-orange rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-block bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-semibold mb-6">
              STATUTORY VANGUARD
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              The Sentry Compliance Standard
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              A comprehensive technical and legal framework designed specifically for the Texas healthcare ecosystem. We navigate the complexities of SB 1188 and HB 149 so you can focus on patient care.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/scan">
                <button className="btn-primary text-lg px-8 py-4">
                  Run Compliance Scan
                </button>
              </Link>
              <Link href="/services">
                <button className="bg-white text-navy hover:bg-gray-100 font-semibold px-8 py-4 rounded-lg transition-all duration-200">
                  View Services
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sovereign Mandate Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-navy text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                🟢 SENTRY MODE ATX-01: SYNCHRONIZED
              </div>
              
              <h2 className="text-4xl md:text-6xl font-display font-bold text-navy mb-6">
                SOVEREIGN <span className="text-gold">mandate.</span>
              </h2>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                SB 1188 and HB 149 are now law. Texas practices are now liable for up to $250k in penalties for offshore data storage and undisclosed AI use. Verify your compliance status in 60 seconds.
              </p>
              
              <Link href="/compliance">
                <button className="btn-outline">
                  Learn About Mandates
                </button>
              </Link>
            </div>
            
            <div className="bg-navy rounded-2xl p-8 text-white">
              <div className="mb-6">
                <div className="text-sm text-gold uppercase tracking-wider mb-2">FORENSIC LOGIC</div>
                <div className="text-4xl font-display font-bold">VANGUARD_X</div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400">🛡</span>
                    <span className="font-semibold">RESIDENCY DRIFT</span>
                  </div>
                  <span className="bg-green-400/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                    SECURE
                  </span>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400">🔒</span>
                    <span className="font-semibold">SOVEREIGN BRIDGE</span>
                  </div>
                  <span className="bg-green-400/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                    ACTIVE
                  </span>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">🔄</span>
                    <span className="font-semibold">DELTA PULSE</span>
                  </div>
                  <span className="bg-blue-400/20 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold">
                    SYNCING
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Texas Registry Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block bg-navy text-gold px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🟢 SOVEREIGN MODE: ATX-01 ACTIVE
            </div>
            
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">
              TEXAS <span className="text-gold">registry.</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Authoritative index of healthcare entities anchored to domestic nodes per SB 1188.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-5xl font-display font-bold text-navy mb-2">481,277</div>
              <div className="text-gold uppercase tracking-wider font-semibold mb-2">Total Harvested Records</div>
              <div className="text-sm text-gray-600">🟢 LIVE INGEST VERIFICATION</div>
            </div>
            
            <div className="card text-center">
              <div className="text-5xl font-display font-bold text-navy mb-2">100%</div>
              <div className="text-gold uppercase tracking-wider font-semibold mb-2">Sovereign Standing</div>
              <div className="text-sm text-gray-600">TEXAS SB 1188 CERTIFIED</div>
            </div>
          </div>
          
          <div className="mt-12 bg-navy rounded-2xl p-8 text-white max-w-4xl mx-auto">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-orange text-3xl">⚠</span>
              <div>
                <h3 className="font-display font-bold text-xl mb-2">Statutory Enforcement Period: ACTIVE</h3>
                <p className="text-gray-300">
                  Entities listed with 'Warning' status have a mandatory window to anchor PHI to sovereign domestic nodes. 
                  The ledger currently monitors <span className="text-gold font-bold">481,277</span> unique identifiers.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <Link href="/registry">
                <button className="bg-white text-navy hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-all duration-200">
                  Search Registry
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-orange text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Ready to Verify Your Compliance?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Run a comprehensive compliance scan in 60 seconds. Understand your risk exposure and receive actionable remediation guidance.
          </p>
          <Link href="/scan">
            <button className="bg-white text-orange hover:bg-gray-100 font-semibold px-8 py-4 rounded-lg transition-all duration-200 text-lg">
              Run Sentry Scan Now
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
