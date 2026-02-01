'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    practiceName: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          contactName: '',
          email: '',
          practiceName: '',
          subject: 'General Inquiry',
          message: '',
        });
      }, 3000);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again or email us directly at compliance@kairologic.com');
    }
  };

  const handlePrioritize = () => {
    setFormData({
      ...formData,
      subject: 'Remediation Required',
      message: 'URGENT: We have received a Cure Notice from the Attorney General and need immediate assistance with technical remediation.'
    });
    // Scroll to form
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-display font-bold text-navy mb-4">
            Contact & Briefing
          </h1>
          <p className="text-xl text-gray-600">
            "Direct channel for statutory remediation, legal inquiry, and practice-specific data residency audits."
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Hub Details */}
            <div>
              <div className="card mb-8">
                <h2 className="text-2xl font-display font-bold text-navy mb-6">
                  Hub Details
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📧</span>
                    <div>
                      <div className="text-sm text-gray-600 uppercase tracking-wider mb-1">
                        EMAIL
                      </div>
                      <a 
                        href="mailto:compliance@kairologic.com"
                        className="text-navy hover:text-orange transition-colors font-semibold"
                      >
                        compliance@kairologic.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📞</span>
                    <div>
                      <div className="text-sm text-gray-600 uppercase tracking-wider mb-1">
                        AUSTIN ENGINEERING DESK
                      </div>
                      <a 
                        href="tel:+15124022237"
                        className="text-navy hover:text-orange transition-colors font-semibold"
                      >
                        (512) 402-2237
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <div className="text-sm text-gray-600 uppercase tracking-wider mb-1">
                        HQ
                      </div>
                      <div className="text-navy font-semibold">
                        Austin, TX // ATX-01 Node
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remediation Required Card */}
              <div className="card bg-navy text-white">
                <h3 className="text-2xl font-display font-bold mb-4">
                  Remediation Required?
                </h3>
                <p className="text-gray-300 mb-6">
                  If you have received a 'Cure Notice' from the Attorney General, prioritize scheduling a Technical Briefing.
                </p>
                <button 
                  onClick={handlePrioritize}
                  className="bg-gold hover:bg-gold-dark text-navy font-semibold px-6 py-3 rounded-lg transition-all duration-200 w-full"
                >
                  PRIORITIZE MY PRACTICE
                </button>
              </div>
            </div>

            {/* Contact Form */}
            <div className="card" id="contact-form">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">✓</div>
                  <h3 className="text-2xl font-display font-bold text-navy mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-gray-600">
                    We'll respond within 24 hours
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-display font-bold text-navy mb-6">
                    Send Message
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-navy mb-2">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.contactName}
                          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-navy mb-2">
                          Work Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-navy mb-2">
                          Practice Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.practiceName}
                          onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-navy mb-2">
                          Subject
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="input-field"
                        >
                          <option>General Inquiry</option>
                          <option>Compliance Scan Question</option>
                          <option>Technical Briefing Request</option>
                          <option>Remediation Required</option>
                          <option>Full Service Implementation</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">
                        Narrative
                      </label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={6}
                        className="input-field"
                        placeholder="Provide practice-specific compliance context..."
                      />
                    </div>

                    <button type="submit" className="btn-primary w-full">
                      Send Message
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
