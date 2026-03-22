'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    practiceName: '',
    providerCount: '',
    subject: 'Demo Request',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to send message');
      setSubmitted(true);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again or email us directly at info@kairologic.net');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="m-section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <div className="m-container" style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#10003;</div>
          <h2 style={{ marginBottom: '12px' }}>We&apos;ll be in touch</h2>
          <p style={{ color: 'var(--m-gray-600)', fontSize: '16px', lineHeight: 1.7 }}>
            Thank you for your interest in KairoLogic. Our team will review your inquiry and
            respond within one business day. For urgent matters, call us at{' '}
            <a href="tel:+15124022237" style={{ color: 'var(--m-gold)', fontWeight: 600 }}>(512) 402-2237</a>.
          </p>
          <Link href="/" className="m-btn-primary m-gold" style={{ marginTop: '24px', display: 'inline-flex' }}>
            Back to Homepage
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="m-section" style={{ paddingTop: '48px', paddingBottom: '0' }}>
        <div className="m-container">
          <div className="m-contact-layout">
            {/* Left Column — Info */}
            <div className="m-contact-info">
              <span className="m-tag m-tag-green">Get Started</span>
              <h1 style={{ fontSize: '36px', lineHeight: 1.2, marginTop: '12px' }}>
                Let&apos;s talk about your<br /><em>provider data.</em>
              </h1>
              <p style={{ color: 'var(--m-gray-600)', fontSize: '16px', lineHeight: 1.7, marginTop: '16px' }}>
                Whether you&apos;re a solo practice or a multi-state health system, we&apos;ll
                show you exactly how KairoLogic can surface data integrity issues before they
                escalate.
              </p>

              <div className="m-contact-details">
                <div className="m-contact-detail-item">
                  <div className="m-contact-detail-icon">&#128231;</div>
                  <div>
                    <div className="m-contact-detail-label">Email</div>
                    <a href="mailto:info@kairologic.net" style={{ color: 'var(--m-gold)', fontWeight: 600 }}>info@kairologic.net</a>
                  </div>
                </div>
                <div className="m-contact-detail-item">
                  <div className="m-contact-detail-icon">&#128222;</div>
                  <div>
                    <div className="m-contact-detail-label">Phone</div>
                    <a href="tel:+15124022237" style={{ color: 'var(--m-gold)', fontWeight: 600 }}>(512) 402-2237</a>
                  </div>
                </div>
                <div className="m-contact-detail-item">
                  <div className="m-contact-detail-icon">&#128205;</div>
                  <div>
                    <div className="m-contact-detail-label">Location</div>
                    <span style={{ color: 'var(--m-gray-600)' }}>Austin, Texas</span>
                  </div>
                </div>
              </div>

              <div className="m-contact-trust">
                <div className="m-contact-trust-item">
                  <span className="m-contact-check">&#10003;</span>
                  No credit card required
                </div>
                <div className="m-contact-trust-item">
                  <span className="m-contact-check">&#10003;</span>
                  HIPAA-aligned infrastructure
                </div>
                <div className="m-contact-trust-item">
                  <span className="m-contact-check">&#10003;</span>
                  Free scan included with every demo
                </div>
              </div>
            </div>

            {/* Right Column — Form */}
            <div className="m-contact-form-card">
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Request a Demo</h3>
              <p style={{ fontSize: '13px', color: 'var(--m-gray-400)', marginBottom: '20px' }}>
                Fill out the form below and we&apos;ll reach out within one business day.
              </p>
              <form onSubmit={handleSubmit} className="m-contact-form">
                <div className="m-form-row">
                  <div className="m-form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Dr. Jane Smith"
                    />
                  </div>
                  <div className="m-form-group">
                    <label>Work Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@practice.com"
                    />
                  </div>
                </div>
                <div className="m-form-row">
                  <div className="m-form-group">
                    <label>Organization Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.practiceName}
                      onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
                      placeholder="Austin Regional Medical"
                    />
                  </div>
                  <div className="m-form-group">
                    <label>Number of Providers</label>
                    <select
                      value={formData.providerCount}
                      onChange={(e) => setFormData({ ...formData, providerCount: e.target.value })}
                    >
                      <option value="">Select range</option>
                      <option value="1-5">1–5 providers</option>
                      <option value="6-15">6–15 providers</option>
                      <option value="16-40">16–40 providers</option>
                      <option value="40+">40+ providers</option>
                    </select>
                  </div>
                </div>
                <div className="m-form-group">
                  <label>What are you looking for?</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  >
                    <option value="Demo Request">Schedule a Demo</option>
                    <option value="Founders Rate">Apply for Founders Rate ($99/mo)</option>
                    <option value="Enterprise Inquiry">Enterprise / Custom Pricing</option>
                    <option value="Partnership">Partnership Opportunity</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>
                <div className="m-form-group">
                  <label>Message (optional)</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your current provider data challenges..."
                  />
                </div>
                <button type="submit" className="m-btn-primary m-gold" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Sending...' : 'Request Demo'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <div className="m-cta-band" style={{ marginTop: '64px' }}>
        <div className="m-container">
          <div className="m-cta-inner">
            <h2>Prefer a quick look first?</h2>
            <p>Run a free scan on any Texas or California provider — see results in under 30 seconds, no signup required.</p>
            <div className="m-cta-actions">
              <Link href="/scan" className="m-btn-primary m-gold">
                Run a Free Scan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
