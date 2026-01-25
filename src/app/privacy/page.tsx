// app/privacy/page.tsx
"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#a3a3a3] antialiased overflow-x-hidden selection:bg-[#881337] selection:text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-20 md:py-28">
        <header className="mb-14 text-center">
          <div className="mb-6 px-5 py-2 border border-[#881337]/40 rounded-full bg-[#4c0519]/20 backdrop-blur-sm inline-block">
            <span className="text-[#ffe4e6] text-[9px] font-ui tracking-[0.45em] uppercase font-light subpixel-antialiased">
              Legal
            </span>
          </div>

          <h1 className="text-[clamp(2.5rem,6vw,3.5rem)] font-heading text-neutral-100 mb-4 tracking-[0.15em] uppercase subpixel-antialiased">
            Privacy Policy
          </h1>

          <p className="font-body text-neutral-400 text-base md:text-lg max-w-2xl mx-auto subpixel-antialiased">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </header>

        <article className="prose prose-invert prose-sm md:prose-base max-w-none font-body subpixel-antialiased">
          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              1. Introduction
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              This Privacy Policy explains how The Crown I Will Take From You ("we", "us", or "our") 
              collects, uses, and protects your personal information when you use our website and services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              2. Information We Collect
            </h2>
            <h3 className="font-heading text-lg text-neutral-200 mb-2">Personal Information</h3>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mb-4">
              <li>Email address (for account creation and communication)</li>
              <li>Username and password (for authentication)</li>
              <li>Payment information (processed securely through Razorpay and PayPal)</li>
            </ul>

            <h3 className="font-heading text-lg text-neutral-200 mb-2">Automatic Information</h3>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on the site</li>
              <li>Reading preferences and chapter access history</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To manage your account and provide customer support</li>
              <li>To process payments and grant access to premium content</li>
              <li>To send important updates about your account or the service</li>
              <li>To improve our website and user experience</li>
              <li>To prevent fraud and ensure security</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              4. Data Storage and Security
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">
              We implement appropriate technical and organizational security measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Data is stored securely using industry-standard encryption</li>
              <li>Payment information is handled exclusively by PCI-DSS compliant payment providers</li>
              <li>Access to personal data is restricted to authorized personnel only</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              5. Third-Party Services
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li><strong>Razorpay</strong> - Payment processing (India)</li>
              <li><strong>PayPal</strong> - Payment processing (International)</li>
              <li><strong>Vercel</strong> - Website hosting and deployment</li>
            </ul>
            <p className="text-neutral-400 leading-relaxed mt-3">
              These services have their own privacy policies governing the use of your information.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              6. Cookies
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your preferences, 
              and analyze site usage. You can control cookies through your browser settings, but disabling 
              them may affect site functionality.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              7. Your Rights
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your account and data</li>
              <li>Withdraw consent for data processing</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              8. Data Retention
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We retain your personal information only for as long as necessary to provide our services 
              and comply with legal obligations. When you delete your account, we will remove your 
              personal data within 30 days, except where we are required to retain it by law.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              9. Children's Privacy
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              Our service is not intended for users under 13 years of age. We do not knowingly collect 
              personal information from children under 13. If you become aware that a child has provided 
              us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              10. Changes to This Policy
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              11. Contact Us
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <span className="text-neutral-200">support@thecrowniwilltakefromyou.com</span>
            </p>
          </section>
        </article>

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-ui tracking-[0.2em] uppercase text-neutral-400 hover:text-neutral-100 transition-colors subpixel-antialiased"
          >
            <span className="inline-block h-px w-6 bg-neutral-600" />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}