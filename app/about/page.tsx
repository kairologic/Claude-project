import Link from 'next/link';

export default function AboutPage() {
  return (
    <div>
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-display font-bold text-navy mb-4">
            Why KairoLogic Exists
          </h1>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg">
          <p>
            HIPAA turned 28 this year. For most of that time, it was the only compliance framework
            healthcare providers had to think about. Federal rules, federal enforcement, one set of
            standards.
          </p>
          <p>
            That era is ending.
          </p>
          <p>
            Texas passed SB 1188 and HB 149 in 2023, creating state-level requirements for data
            sovereignty and AI transparency that go well beyond HIPAA. California followed with
            AB 3030, mandating disclosure when AI is used in clinical decision-making. More states
            are drafting their own versions. The pattern is clear: healthcare compliance is going
            local, fast, and the federal floor is no longer the ceiling.
          </p>
          <p>
            Most providers have no idea. We scanned hundreds of Texas healthcare websites and found
            that &gt;50% route patient data through foreign servers. Almost none of them disclose their use
            of AI tools. NPI records, the backbone of provider identity, are riddled with mismatches
            between what&apos;s on file and what&apos;s on the website. These aren&apos;t edge cases.
            They&apos;re the norm.
          </p>

          <h2>What We&apos;re Building</h2>
          <p>
            KairoLogic is compliance infrastructure for healthcare providers. We started with Texas
            because the regulations were first, but we&apos;re building for a national problem.
          </p>
          <p>
            Our Sentry engine scans 14 compliance checkpoints in 60 seconds: data residency (where
            is your patient data actually going?), AI transparency (are you disclosing it?), and NPI
            integrity (does your public information match your federal records?). Providers get a
            score, a breakdown by category, and a clear path to fix what&apos;s broken.
          </p>
          <p>
            For providers who need ongoing coverage, our Shield dashboard monitors compliance drift
            in real time, flagging new trackers, foreign data routing changes, roster mismatches, and
            other shifts that happen silently between point-in-time audits.
          </p>

          <h2>The NPI Problem Nobody Talks About</h2>
          <p>
            There&apos;s a quieter issue underneath the regulatory wave, and it&apos;s one we think
            about a lot.
          </p>
          <p>
            The NPI system was designed as a static registry. You get a number, it goes on file, and
            the assumption is that the information stays accurate. In practice, providers move, change
            affiliations, update websites, and add locations without ever touching their NPI records.
            The result is a growing gap between what the NPI database says about a provider and
            what&apos;s actually true.
          </p>
          <p>
            This matters more than it used to. State regulators are starting to cross-reference NPI
            data against provider websites. Payers use it for credentialing. Patients use it to find
            care. When the data doesn&apos;t match, everyone pays for it, sometimes literally.
          </p>
          <p>
            We&apos;re building tools to surface these mismatches automatically. Not to replace the
            NPI system, but to make it actually useful as a source of truth.
          </p>

          <h2>Where This Is Going</h2>
          <p>
            The regulatory map is getting more complex, not less. Every state that passes its own AI
            transparency law or data sovereignty requirement adds another layer providers have to
            track. A practice operating in Texas and California already faces two different compliance
            regimes, and they&apos;re not always compatible.
          </p>
          <p>
            We believe the right answer isn&apos;t more consultants or more manual checklists.
            It&apos;s automated, continuous monitoring that adapts as regulations change, that scans
            what&apos;s actually happening on a provider&apos;s digital footprint, and that gives
            clear, actionable results instead of 40-page PDFs nobody reads.
          </p>
          <p>
            KairoLogic monitors over 481,000 providers today. We&apos;re expanding state coverage,
            deepening our NPI integrity tools, and building the compliance layer that the healthcare
            industry doesn&apos;t have yet but increasingly needs.
          </p>

          <hr />

          <p>
            <strong>Get in touch:</strong>{' '}
            <a href="mailto:hello@kairologic.com" className="text-orange hover:underline">
              hello@kairologic.com
            </a>
          </p>
          <p>
            <strong>Run a free scan:</strong>{' '}
            <Link href="/scan" className="text-orange hover:underline">
              kairologic.com/scan
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
