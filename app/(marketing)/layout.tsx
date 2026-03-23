import Link from 'next/link';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoMark = () => (
  <div className="m-logo-mark">
    <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z" stroke="#D4A017" strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="9" r="2.5" fill="#D4A017"/>
    </svg>
  </div>
);

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-page">
      {/* Announcement Bar */}
      <div className="m-announce-bar">
        <span className="m-announce-dot"></span>
        Now live in Texas &amp; California — 1.8M+ provider records indexed.
        <Link href="/compliance">See state coverage &rarr;</Link>
      </div>

      {/* Nav */}
      <nav className="m-nav">
        <div className="m-container">
          <div className="m-nav-inner">
            <Link href="/" className="m-logo">
              <LogoMark />
              <span className="m-logo-text">
                <span className="kairo">Kairo</span>
                <span className="logic">Logic</span>
              </span>
            </Link>

            <ul className="m-nav-links">
              <li><Link href="/product">Product</Link></li>
              <li><Link href="/compliance">Compliance</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/demo">Demo</Link></li>
            </ul>

            <div className="m-nav-actions">
              <Link href="/dashboard/login" className="m-btn-ghost">Sign In</Link>
              <Link href="/contact" className="m-btn-primary">
                Get Free Trial
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="m-footer">
        <div className="m-container">
          <div className="m-footer-grid">
            <div className="m-footer-brand">
              <Link href="/" className="m-logo">
                <LogoMark />
                <span className="m-logo-text">
                  <span style={{ color: 'white' }}>Kairo</span>
                  <span className="logic">Logic</span>
                </span>
              </Link>
              <p>Provider data intelligence for the modern healthcare organization. Monitoring integrity, compliance, and drift across 1.8M+ U.S. providers.</p>
            </div>
            <div className="m-footer-col">
              <h4>Product</h4>
              <ul>
                <li><Link href="/product">Provider Intelligence</Link></li>
                <li><Link href="/product">Compliance Monitoring</Link></li>
                <li><Link href="/product">Credentialing Automation</Link></li>
                <li><Link href="/demo">Product Demo</Link></li>
                <li><Link href="/contact">API Access</Link></li>
              </ul>
            </div>
            <div className="m-footer-col">
              <h4>Resources</h4>
              <ul>
                <li><Link href="/compliance">State Compliance</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/insights">Insights &amp; Blog</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div className="m-footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="/contact">Get Started</Link></li>
                <li><Link href="/demo">Watch a Demo</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="m-footer-bottom">
            <span>&copy; 2026 KairoLogic. All rights reserved. Austin, TX.</span>
            <span>
              <Link href="/privacy">Privacy</Link> &middot;{' '}
              <Link href="/terms">Terms</Link> &middot;{' '}
              <a href="mailto:info@kairologic.net">info@kairologic.net</a> &middot;{' '}
              <a href="tel:+15124022237">(512) 402-2237</a>
            </span>
          </div>
          <div className="m-compliance-note">
            HIPAA-aligned infrastructure &middot; SOC 2 Type II in progress &middot; Provider data sourced from CMS NPPES, state medical boards, and public payer directories
          </div>
        </div>
      </footer>
    </div>
  );
}
