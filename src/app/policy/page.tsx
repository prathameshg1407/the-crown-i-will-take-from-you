// app/policy/page.tsx
"use client";

import Link from "next/link";

export default function PolicyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#a3a3a3] antialiased overflow-x-hidden selection:bg-[#881337] selection:text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-20 md:py-28">
        {/* Header */}
        <header className="mb-14 text-center">
          <div className="mb-6 px-5 py-2 border border-[#881337]/40 rounded-full bg-[#4c0519]/20 backdrop-blur-sm inline-block">
            <span className="text-[#ffe4e6] text-[9px] font-ui tracking-[0.45em] uppercase font-light subpixel-antialiased">
              Site Information
            </span>
          </div>

          <h1 className="text-[clamp(2.5rem,6vw,3.5rem)] font-heading text-neutral-100 mb-4 tracking-[0.15em] uppercase subpixel-antialiased">
            Policy & Terms
          </h1>

          <p className="font-body text-neutral-400 text-base md:text-lg max-w-2xl mx-auto subpixel-antialiased">
            Please read this page to understand how this site works, how your
            data is handled, and the terms that apply when you use this service.
          </p>
        </header>

        {/* Content */}
        <article className="prose prose-invert prose-sm md:prose-base max-w-none font-body subpixel-antialiased">
          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              1. General Information
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              This website is a fan translation / reading platform for the web
              novel <span className="italic">“The Crown I Will Take From You”</span>. 
              By accessing or using this site, you agree to the policies and
              terms described on this page.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              2. Content & Intellectual Property
            </h2>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>
                All novel text, images, and related media available on this
                site are provided for personal, non‑commercial reading.
              </li>
              <li>
                The original work and its characters belong to their respective
                author, artist, and rights holders. This site does not claim
                ownership over the original intellectual property.
              </li>
              <li>
                You may not redistribute, re‑upload, or use the content from
                this site for commercial purposes without permission from the
                respective rights holders.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              3. Accounts & Access
            </h2>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>
                You may be required to create an account to access certain
                chapters, features, or paid content.
              </li>
              <li>
                You are responsible for keeping your login credentials secure
                and for all activity that occurs under your account.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that
                violate these terms, abuse the service, or attempt to bypass
                access/paywalls.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              4. Payments & Premium Content
            </h2>
            <p className="text-neutral-400 mb-3">
              This site may offer paid chapters or premium access using payment
              providers such as Razorpay and PayPal.
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>
                All prices, access durations, and benefits associated with plans
                or purchases are described in the{" "}
                <Link
                  href="/#pricing"
                  className="text-[#fb7185] hover:text-[#f97373] underline underline-offset-4"
                >
                  Pricing
                </Link>{" "}
                section.
              </li>
              <li>
                Payments are processed securely by third‑party providers. We do
                not store your full payment card details on our servers.
              </li>
              <li>
                Unless explicitly stated, purchases are non‑refundable once
                access has been granted to premium chapters or features.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              5. Privacy & Data
            </h2>
            <p className="text-neutral-400 mb-3">
              We aim to collect only the minimum data necessary to operate this
              site and provide your reading experience.
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>
                Information you provide directly, such as email address or
                login details, is used to manage your account and access.
              </li>
              <li>
                Third‑party payment providers (e.g., Razorpay, PayPal) handle
                payment information according to their own privacy policies.
              </li>
              <li>
                Basic diagnostic or analytics data may be collected to improve
                performance, security, and user experience.
              </li>
              <li>
                We do not sell your personal data to third parties.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              6. Cookies & Third‑Party Scripts
            </h2>
            <p className="text-neutral-400 mb-3">
              This site may use cookies or similar technologies (for example,
              for authentication or payment flows).
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>
                Third‑party scripts such as Razorpay Checkout may set their own
                cookies or tracking to complete transactions.
              </li>
              <li>
                By using the site and initiating a payment, you agree to the
                use of such cookies and scripts as required for the service to
                function.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              7. Limitations of Liability
            </h2>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>
                The content and services on this site are provided “as is”
                without any guarantees of availability, accuracy, or reliability.
              </li>
              <li>
                We are not liable for any indirect, incidental, or consequential
                damages arising from your use of this site, including but not
                limited to loss of data, account access, or payments handled by
                third‑party providers.
              </li>
              <li>
                We may modify, suspend, or discontinue parts of the service at
                any time, with or without notice.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              8. Changes to This Policy
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              We may update this policy and terms from time to time. When we do,
              we will revise the “Last updated” date below. Continued use of the
              site after changes are posted means you accept the updated terms.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              9. Contact
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              If you have questions about this policy, your account, or the
              content on this site, please contact the site administrator at:
              <br />
              <span className="text-neutral-200">
                {/* Replace with your real contact */}
                example@example.com
              </span>
            </p>
          </section>

          <p className="text-xs text-neutral-600 italic">
            Last updated: {new Date().toISOString().split("T")[0]}
          </p>
        </article>

        {/* Back Link */}
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