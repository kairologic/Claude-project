import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-gold text-2xl font-bold">🛡</span>
              </div>
              <div>
                <div className="font-display font-bold text-xl">
                  KAIRO<span className="text-gold">LOGIC</span>
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">
                  Statutory Vanguard
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              A comprehensive technical and legal framework designed specifically for the Texas healthcare ecosystem.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-bold text-gold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/compliance" className="text-gray-400 hover:text-white transition-colors">Compliance</Link></li>
              <li><Link href="/services" className="text-gray-400 hover:text-white transition-colors">Services</Link></li>
              <li><Link href="/registry" className="text-gray-400 hover:text-white transition-colors">Registry</Link></li>
              <li><Link href="/insights" className="text-gray-400 hover:text-white transition-colors">Insights</Link></li>
              <li><Link href="/scan" className="text-gray-400 hover:text-white transition-colors">Run Scan</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-display font-bold text-gold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/compliance" className="text-gray-400 hover:text-white transition-colors">Compliance Standards</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-bold text-gold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:compliance@kairologic.net" className="hover:text-white transition-colors">
                  compliance@kairologic.net
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+15124022237" className="hover:text-white transition-colors">
                  (512) 402-2237
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>🌐</span>
                <span>Austin, TX // ATX-01 Node</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>BY ACCESSING THIS TERMINAL, YOU AGREE TO THE KAIROLOGIC DATA SOVEREIGNTY PROTOCOLS.</p>
          <p className="mt-2">UNAUTHORIZED ACCESS IS A VIOLATION OF TEXAS SB 1188 COMPLIANCE STANDARDS.</p>
          <p className="mt-4">© {new Date().getFullYear()} KairoLogic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

