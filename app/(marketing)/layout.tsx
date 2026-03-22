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
        <Link href="/registry">See what&apos;s in your state &rarr;</Link>
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
              <li><Link href="/platform">Platform</Link></li>
              <li><Link href="/solutions">Solutions</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/registry">Registry</Link></li>
              <li><Link href="/insights">Insights</Link></li>
            </ul>

            <div className="m-nav-actions">
              <Link href="/dashboard/login" className="m-btn-ghost">Sign In</Link>
              <Link href="/contact" className="m-btn-primary">
                Get Started
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
              <h4>Platform</h4>
              <ul>
                <li><Link href="/platform">Provider Intelligence</Link></li>
                <li><Link href="/platform">Compliance Dashboard</Link></li>
                <li><Link href="/platform">Roster Monitoring</Link></li>
                <li><Link href="/registry">NPI Registry</Link></li>
                <li><Link href="/contact">API Access</Link></li>
              </ul>
            </div>
            <div className="m-footer-col">
              <h4>Solutions</h4>
              <ul>
                <li><Link href="/solutions">Medical Practices</Link></li>
                <li><Link href="/solutions">Health Systems</Link></li>
                <li><Link href="/solutions">CVO Organizations</Link></li>
                <li><Link href="/solutions">Health Plans</Link></li>
                <li><Link href="/solutions">Dental &amp; Specialty</Link></li>
              </ul>
            </div>
            <div className="m-footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="/insights">Insights &amp; Blog</Link></li>
                <li><Link href="/registry">Registry</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/contact">Contact</Link></li>
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
