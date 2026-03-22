export default function TermsPage() {
  return (
    <div>
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-display font-bold text-navy mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-600">Last Updated: January 2026</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using KairoLogic services, you accept and agree to be bound by these 
            Terms of Service. If you do not agree, please do not use our services.
          </p>

          <h2>2. Services Provided</h2>
          <p>KairoLogic provides:</p>
          <ul>
            <li>Compliance scanning for Texas SB 1188 and HB 149</li>
            <li>Technical remediation reports and guidance</li>
            <li>Consultation and implementation services</li>
            <li>Registry management and verification services</li>
          </ul>

          <h2>3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use services in compliance with applicable laws</li>
            <li>Not misuse or attempt to circumvent our security measures</li>
          </ul>

          <h2>4. Limitation of Liability</h2>
          <p>
            KairoLogic provides compliance guidance and technical recommendations, but does not 
            constitute legal advice. We are not liable for any penalties, fines, or damages resulting 
            from non-compliance. You should consult with legal counsel for specific compliance matters.
          </p>

          <h2>5. Payment Terms</h2>
          <p>
            Services are billed as specified at time of purchase. All fees are non-refundable unless 
            otherwise stated. We reserve the right to modify pricing with 30 days notice.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            All content, trademarks, and materials on this site are owned by KairoLogic. You may not 
            reproduce, distribute, or create derivative works without express written permission.
          </p>

          <h2>7. Termination</h2>
          <p>
            We reserve the right to terminate or suspend access to our services at our discretion, 
            without notice, for conduct that violates these Terms or is harmful to other users.
          </p>

          <h2>8. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Texas. Any disputes shall be 
            resolved in the courts of Travis County, Texas.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Continued use of services after changes 
            constitutes acceptance of modified Terms.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:compliance@kairologic.net" className="text-orange hover:underline">
              compliance@kairologic.net
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

