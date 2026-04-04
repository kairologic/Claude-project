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
                  Provider Data Intelligence
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Provider data intelligence for the modern healthcare organization. Monitoring
              integrity, compliance, and drift across 1.8M+ U.S. providers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-bold text-gold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/platform" className="text-gray-400 hover:text-white transition-colors">
                  Platform
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Solutions
                </Link>
              </li>
              <li>
                <Link
                  href="/compliance"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  State Coverage
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Resources
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-display font-bold text-gold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/compliance"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Compliance Standards
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-bold text-gold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:info@kairologic.net" className="hover:text-white transition-colors">
                  info@kairologic.net
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
                <span>Austin, TX</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            {' · '}
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            {' · '}
            <a href="mailto:info@kairologic.net" className="hover:text-white transition-colors">
              info@kairologic.net
            </a>
          </p>
          <p className="mt-4">© {new Date().getFullYear()} KairoLogic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
