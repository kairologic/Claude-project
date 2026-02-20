'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
            <Image 
              src="/logo.svg" 
              alt="KairoLogic" 
              width={180} 
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/compliance" className="text-navy hover:text-gold transition-colors font-medium">
              COMPLIANCE
            </Link>
            <Link href="/services" className="text-navy hover:text-gold transition-colors font-medium">
              SERVICES
            </Link>
            <Link href="/registry" className="text-navy hover:text-gold transition-colors font-medium">
              REGISTRY
            </Link>
            <Link href="/insights" className="text-navy hover:text-gold transition-colors font-medium">
              INSIGHTS
            </Link>
            <Link href="/contact" className="text-navy hover:text-gold transition-colors font-medium">
              CONTACT
            </Link>
            <Link href="/scan">
              <button className="btn-primary">
                RUN SENTRY SCAN
              </button>
            </Link>
          </div>

          {/* Mobile menu button — animates to X */}
          <button
            className="md:hidden p-2 relative w-10 h-10 flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className={`absolute w-6 h-0.5 bg-navy transition-all duration-300 ${mobileMenuOpen ? 'rotate-45' : '-translate-y-2'}`}></span>
            <span className={`absolute w-6 h-0.5 bg-navy transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
            <span className={`absolute w-6 h-0.5 bg-navy transition-all duration-300 ${mobileMenuOpen ? '-rotate-45' : 'translate-y-2'}`}></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu — full screen overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-20 z-40 bg-white animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col px-6 py-6 gap-1">
            <Link href="/compliance" onClick={closeMenu} className="text-navy font-medium py-3 border-b border-gray-100 hover:text-gold transition-colors">
              COMPLIANCE
            </Link>
            <Link href="/services" onClick={closeMenu} className="text-navy font-medium py-3 border-b border-gray-100 hover:text-gold transition-colors">
              SERVICES
            </Link>
            <Link href="/registry" onClick={closeMenu} className="text-navy font-medium py-3 border-b border-gray-100 hover:text-gold transition-colors">
              REGISTRY
            </Link>
            <Link href="/insights" onClick={closeMenu} className="text-navy font-medium py-3 border-b border-gray-100 hover:text-gold transition-colors">
              INSIGHTS
            </Link>
            <Link href="/contact" onClick={closeMenu} className="text-navy font-medium py-3 border-b border-gray-100 hover:text-gold transition-colors">
              CONTACT
            </Link>
            <Link href="/scan" onClick={closeMenu} className="mt-4">
              <button className="btn-primary w-full">RUN SENTRY SCAN</button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
