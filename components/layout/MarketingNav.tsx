'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
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
            <li><Link href="/resources">Resources</Link></li>
          </ul>

          <div className="m-nav-actions">
            <Link href="/sign-in" className="m-btn-ghost">Sign In</Link>
            <Link href="/contact" className="m-btn-primary">
              Get Free Trial
              <ArrowIcon />
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            className="m-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <span className={`m-hamburger-line ${mobileOpen ? 'm-open' : ''}`}></span>
            <span className={`m-hamburger-line ${mobileOpen ? 'm-open' : ''}`}></span>
            <span className={`m-hamburger-line ${mobileOpen ? 'm-open' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="m-mobile-menu">
          <div className="m-mobile-menu-inner">
            <Link href="/platform" onClick={() => setMobileOpen(false)} className="m-mobile-link">Platform</Link>
            <Link href="/solutions" onClick={() => setMobileOpen(false)} className="m-mobile-link">Solutions</Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="m-mobile-link">Pricing</Link>
            <Link href="/resources" onClick={() => setMobileOpen(false)} className="m-mobile-link">Resources</Link>
            <Link href="/blog" onClick={() => setMobileOpen(false)} className="m-mobile-link">Blog</Link>
            <Link href="/compliance" onClick={() => setMobileOpen(false)} className="m-mobile-link">State Coverage</Link>
            <div className="m-mobile-actions">
              <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="m-btn-ghost" style={{ width: '100%', textAlign: 'center' }}>Sign In</Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="m-btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>
                Get Free Trial
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
