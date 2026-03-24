import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — KairoLogic',
  description: 'KairoLogic terms of service. Rules and guidelines for using our platform.',
};

export default function TermsPage() {
  return (
    <div className="m-legal-page">
      <section className="m-legal-hero">
        <div className="m-container">
          <h1>Terms of Service</h1>
          <p>Last Updated: January 2026</p>
        </div>
      </section>

      <section className="m-legal-content">
        <div className="m-container">
          <div className="m-legal-body">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using KairoLogic services, you accept and agree to be bound by these
              Terms of Service. If you do not agree, please do not use our services.
            </p>

            <h2>2. Services Provided</h2>
            <p>KairoLogic provides:</p>
            <ul>
              <li>Provider data monitoring and intelligence across NPPES, state boards, and payer directories</li>
              <li>Compliance tracking for state-level regulations (TX SB 1188, CA AB 3030, and others)</li>
              <li>Credentialing workflow automation</li>
              <li>Payer directory accuracy monitoring</li>
              <li>Reports, dashboards, and analytics</li>
            </ul>

            <h2>3. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul>
              <li>Provide accurate and complete information during registration and use</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use services in compliance with all applicable laws</li>
              <li>Not misuse, reverse engineer, or attempt to circumvent our security measures</li>
              <li>Not use our platform to harass, harm, or infringe on others&rsquo; rights</li>
            </ul>

            <h2>4. Limitation of Liability</h2>
            <p>
              KairoLogic provides compliance monitoring and data intelligence tools, but does not
              constitute legal advice. We are not liable for any penalties, fines, or damages
              resulting from non-compliance. You should consult with legal counsel for specific
              compliance matters.
            </p>

            <h2>5. Payment Terms</h2>
            <p>
              Services are billed as specified at time of purchase. Subscriptions renew automatically
              unless cancelled. All fees are non-refundable unless otherwise stated. We reserve the
              right to modify pricing with 30 days notice.
            </p>

            <h2>6. Intellectual Property</h2>
            <p>
              All content, trademarks, and materials on this site are owned by KairoLogic. You may
              not reproduce, distribute, or create derivative works without express written
              permission. Your data remains your property.
            </p>

            <h2>7. Data &amp; Privacy</h2>
            <p>
              Your use of our services is also governed by our{' '}
              <a href="/privacy">Privacy Policy</a>. By using our services, you consent to our
              data collection and use practices as described therein.
            </p>

            <h2>8. Termination</h2>
            <p>
              We reserve the right to terminate or suspend access to our services at our
              discretion, without notice, for conduct that violates these Terms or is harmful to
              other users. You may terminate your account at any time by contacting support.
            </p>

            <h2>9. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Texas. Any disputes shall be
              resolved in the courts of Travis County, Texas.
            </p>

            <h2>10. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. We will provide notice of material changes.
              Continued use of services after changes constitutes acceptance of modified Terms.
            </p>

            <h2>11. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{' '}
              <a href="mailto:info@kairologic.net">info@kairologic.net</a>{' '}
              or call <a href="tel:+15124022237">(512) 402-2237</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
