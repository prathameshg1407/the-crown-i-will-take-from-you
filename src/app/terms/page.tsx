// app/terms/page.tsx
"use client";

import Link from "next/link";

export default function TermsPage() {
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
            Terms & Conditions
          </h1>

          <p className="font-body text-neutral-400 text-base md:text-lg max-w-2xl mx-auto subpixel-antialiased">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </header>

        <article className="prose prose-invert prose-sm md:prose-base max-w-none font-body subpixel-antialiased">
          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              1. Acceptance of Terms
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              By accessing and using The Crown I Will Take From You website and services, you accept 
              and agree to be bound by these Terms and Conditions. If you do not agree to these terms, 
              please do not use our services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              2. Service Description
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We provide access to web novel content, including free and premium chapters. Access to 
              certain content may require account registration and/or payment.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              3. User Accounts
            </h2>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              4. Intellectual Property
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">
              All content on this website, including but not limited to text, images, graphics, and artwork:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Is protected by copyright and other intellectual property rights</li>
              <li>Remains the property of the original author, artist, and rights holders</li>
              <li>May not be reproduced, distributed, or used commercially without permission</li>
              <li>Is provided for personal, non-commercial reading only</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              5. Payments and Subscriptions
            </h2>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Prices for premium content are displayed in the applicable currency</li>
              <li>All payments are processed securely through Razorpay or PayPal</li>
              <li>Access to premium content begins immediately upon successful payment</li>
              <li>Subscription periods and benefits are as described on the pricing page</li>
              <li>We reserve the right to modify pricing with reasonable notice</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              6. Prohibited Conduct
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Share your account credentials with others</li>
              <li>Attempt to circumvent payment or access restrictions</li>
              <li>Copy, redistribute, or republish content from this site</li>
              <li>Use automated tools to scrape or download content</li>
              <li>Engage in any activity that disrupts or interferes with the service</li>
              <li>Upload malicious code or attempt to hack the website</li>
              <li>Impersonate others or provide false information</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              7. Disclaimer of Warranties
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, 
              SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              8. Limitation of Liability
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR 
              REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR 
              OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              9. Service Modifications
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any part of the service at any 
              time, with or without notice. We will not be liable to you or any third party for any 
              modification, suspension, or discontinuation of the service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              10. Termination
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We may terminate or suspend your account and access to the service immediately, without 
              prior notice, for any reason, including breach of these Terms. Upon termination, your 
              right to use the service will immediately cease.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              11. Governing Law
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, 
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              12. Changes to Terms
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We reserve the right to modify these terms at any time. We will provide notice of 
              significant changes by posting the new Terms on this page and updating the "Last updated" 
              date. Your continued use of the service after such changes constitutes acceptance of the 
              new Terms.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              13. Contact Information
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              For questions about these Terms, please contact us at:
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