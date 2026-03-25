'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [supportData, setSupportData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: supportData.name,
          email: supportData.email,
          subject: 'Support Request',
          message: supportData.message,
        }),
      });

      if (!response.ok) throw new Error('Failed to send');
      setSupportSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again or email us at info@kairologic.net');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <section className="m-contact-support" style={{ paddingTop: '120px' }}>
      <div className="m-container">
        <div className="m-contact-support-inner">
          <h2>Get in touch with our team</h2>
          <p className="m-subtitle">
            Our friendly team is here to help. Send us a message and we&apos;ll get back to you within 24 hours.
          </p>

          {supportSubmitted ? (
            <div style={{
              background: 'var(--m-white)',
              border: '1px solid var(--m-gray-200)',
              borderRadius: '14px',
              padding: '32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#10003;</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--m-navy)', marginBottom: '8px' }}>
                Message sent!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--m-gray-600)', lineHeight: 1.6 }}>
                Thanks for reaching out. We&apos;ll get back to you at <strong>{supportData.email}</strong> within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSupportSubmit} className="m-contact-form">
              <div className="m-form-row">
                <div>
                  <label>Your name *</label>
                  <input
                    type="text"
                    required
                    value={supportData.name}
                    onChange={(e) => setSupportData({ ...supportData, name: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label>Email address *</label>
                  <input
                    type="email"
                    required
                    value={supportData.email}
                    onChange={(e) => setSupportData({ ...supportData, email: e.target.value })}
                    placeholder="jane@practice.com"
                  />
                </div>
              </div>

              <div>
                <label>How can we help? *</label>
                <textarea
                  required
                  value={supportData.message}
                  onChange={(e) => setSupportData({ ...supportData, message: e.target.value })}
                  placeholder="Describe your issue or question and we'll get back to you as soon as possible..."
                />
              </div>

              <button
                type="submit"
                className="m-contact-submit"
                disabled={supportLoading}
              >
                {supportLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}

          <p style={{ fontSize: '13px', color: 'var(--m-gray-400)', marginTop: '20px', lineHeight: 1.6 }}>
            You can also email us directly at{' '}
            <a href="mailto:info@kairologic.net" style={{ color: 'var(--m-gold)' }}>info@kairologic.net</a>{' '}
            or call <a href="tel:+15124022237" style={{ color: 'var(--m-gold)' }}>(512) 402-2237</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
