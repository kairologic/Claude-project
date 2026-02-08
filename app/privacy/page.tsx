export default function PrivacyPage() {
  return (
    <div>
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-display font-bold text-navy mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600">Last Updated: January 2026</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg">
          <h2>1. Information We Collect</h2>
          <p>
            KairoLogic collects information necessary to provide compliance scanning and advisory services:
          </p>
          <ul>
            <li>Provider name, NPI, website URL, and contact information</li>
            <li>Compliance scan results and violation details</li>
            <li>Usage data and analytics</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Perform compliance scans and generate reports</li>
            <li>Communicate scan results and remediation guidance</li>
            <li>Process payments and maintain service records</li>
            <li>Improve our services and develop new features</li>
          </ul>

          <h2>3. Data Storage & Security</h2>
          <p>
            In compliance with Texas SB 1188, all data is stored on servers physically located within 
            the United States. We implement industry-standard security measures including encryption, 
            access controls, and regular security audits.
          </p>

          <h2>4. Data Sharing</h2>
          <p>
            We do not sell or rent your personal information. We may share data with:
          </p>
          <ul>
            <li>Service providers who assist in delivering our services</li>
            <li>Legal authorities when required by law</li>
            <li>With your explicit consent</li>
          </ul>

          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>

          <h2>6. Contact Us</h2>
          <p>
            For privacy-related inquiries, contact us at{' '}
            <a href="mailto:compliance@kairologic.net" className="text-orange hover:underline">
              compliance@kairologic.net
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

