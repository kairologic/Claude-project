import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — KairoLogic',
  description: 'KairoLogic privacy policy. How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="m-legal-page">
      <section className="m-legal-hero">
        <div className="m-container">
          <h1>Privacy Policy</h1>
          <p>Last Updated: January 2026</p>
        </div>
      </section>

      <section className="m-legal-content">
        <div className="m-container">
          <div className="m-legal-body">
            <h2>1. Information We Collect</h2>
            <p>
              KairoLogic collects information necessary to provide provider data intelligence and
              compliance services:
            </p>
            <ul>
              <li>Provider name, NPI, website URL, and contact information</li>
              <li>Compliance scan results and monitoring data</li>
              <li>Account registration and authentication information</li>
              <li>Usage data and analytics</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Perform provider monitoring and compliance tracking</li>
              <li>Generate reports and communicate results</li>
              <li>Process payments and maintain service records</li>
              <li>Improve our services and develop new features</li>
              <li>Send product updates and service notifications</li>
            </ul>

            <h2>3. Data Storage &amp; Security</h2>
            <p>
              All data is stored on servers physically located within the United States. We
              implement industry-standard security measures including encryption at rest and in
              transit, role-based access controls, and regular security audits. Our infrastructure
              is HIPAA-aligned and we are pursuing SOC 2 Type II certification.
            </p>

            <h2>4. Data Sharing</h2>
            <p>We do not sell or rent your personal information. We may share data with:</p>
            <ul>
              <li>
                Service providers who assist in delivering our platform (hosting, payment
                processing)
              </li>
              <li>Legal authorities when required by law or to protect our rights</li>
              <li>With your explicit consent for specific integrations</li>
            </ul>

            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data held by KairoLogic</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data in a portable format</li>
            </ul>

            <h2>6. Cookies &amp; Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We may use
              analytics cookies to understand how our platform is used. You can control cookie
              preferences in your browser settings.
            </p>

            <h2>7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes via email or through the platform. Continued use of services after changes
              constitutes acceptance.
            </p>

            <h2>8. Contact Us</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:info@kairologic.net">info@kairologic.net</a> or call{' '}
              <a href="tel:+15124022237">(512) 402-2237</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
