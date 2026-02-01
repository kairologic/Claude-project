'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
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
            <Link 
              href="/compliance" 
              className="text-navy hover:text-gold transition-colors font-medium"
            >
              COMPLIANCE
            </Link>
            <Link 
              href="/services" 
              className="text-navy hover:text-gold transition-colors font-medium"
            >
              SERVICES
            </Link>
            <Link 
              href="/registry" 
              className="text-navy hover:text-gold transition-colors font-medium"
            >
              REGISTRY
            </Link>
            <Link 
              href="/insights" 
              className="text-navy hover:text-gold transition-colors font-medium"
            >
              INSIGHTS
            </Link>
            <Link 
              href="/contact" 
              className="text-navy hover:text-gold transition-colors font-medium"
            >
              CONTACT
            </Link>
            <Link href="/scan">
              <button className="btn-primary">
                RUN SENTRY SCAN
              </button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-navy"></span>
              <span className="w-full h-0.5 bg-navy"></span>
              <span className="w-full h-0.5 bg-navy"></span>
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              <Link href="/compliance" className="text-navy font-medium">COMPLIANCE</Link>
              <Link href="/services" className="text-navy font-medium">SERVICES</Link>
              <Link href="/registry" className="text-navy font-medium">REGISTRY</Link>
              <Link href="/insights" className="text-navy font-medium">INSIGHTS</Link>
              <Link href="/contact" className="text-navy font-medium">CONTACT</Link>
              <Link href="/scan">
                <button className="btn-primary w-full">RUN SENTRY SCAN</button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
