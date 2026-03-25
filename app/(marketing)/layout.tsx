import Link from 'next/link';
import MarketingNav from '@/components/layout/MarketingNav';

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

      {/* Nav (client component with mobile menu) */}
      <MarketingNav />

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
                <li><Link href="/platform">Provider Monitoring</Link></li>
                <li><Link href="/platform">Compliance Tracking</Link></li>
                <li><Link href="/platform">Credentialing Workflows</Link></li>
                <li><Link href="/platform">Payer Directory Monitoring</Link></li>
              </ul>
            </div>
            <div className="m-footer-col">
              <h4>Solutions</h4>
              <ul>
                <li><Link href="/solutions#practices">Medical Groups &amp; Practices</Link></li>
                <li><Link href="/solutions#cvos">CVOs &amp; Credentialing Orgs</Link></li>
                <li><Link href="/solutions#health-systems">Health Systems &amp; Networks</Link></li>
              </ul>
            </div>
            <div className="m-footer-col">
              <h4>Resources</h4>
              <ul>
                <li><Link href="/compliance">State Compliance Guide</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div className="m-footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/support">Contact &amp; Support</Link></li>
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
