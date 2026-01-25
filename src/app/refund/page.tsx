// app/refund/page.tsx
"use client";

import Link from "next/link";

export default function RefundPolicyPage() {
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
            Refund & Cancellation Policy
          </h1>

          <p className="font-body text-neutral-400 text-base md:text-lg max-w-2xl mx-auto subpixel-antialiased">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </header>

        <article className="prose prose-invert prose-sm md:prose-base max-w-none font-body subpixel-antialiased">
          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              1. General Refund Policy
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              Due to the digital nature of our content (web novel chapters and premium access), 
              all sales are generally final. Once you have been granted access to premium content, 
              refunds are not available except in the specific circumstances outlined below.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              2. Eligible Refund Scenarios
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">
              We will provide refunds in the following situations:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li><strong>Duplicate Payment:</strong> If you were charged multiple times for the same purchase</li>
              <li><strong>Technical Error:</strong> If you paid but did not receive access to the content due to a technical issue on our end</li>
              <li><strong>Unauthorized Transaction:</strong> If your payment method was used without your authorization (subject to verification)</li>
              <li><strong>Service Not Provided:</strong> If we fail to provide the service you paid for within a reasonable timeframe</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              3. Non-Refundable Situations
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">
              Refunds will NOT be provided in the following cases:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2">
              <li>Change of mind after accessing premium content</li>
              <li>Dissatisfaction with story content or writing quality</li>
              <li>Failure to read the chapter descriptions or preview before purchasing</li>
              <li>Account suspension or termination due to violation of Terms of Service</li>
              <li>Internet connectivity issues on your end</li>
              <li>Device compatibility issues</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              4. Subscription Cancellations
            </h2>
            <h3 className="font-heading text-lg text-neutral-200 mb-2">Monthly/Annual Subscriptions</h3>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mb-4">
              <li>You may cancel your subscription at any time</li>
              <li>Cancellation will prevent future billing but will not refund the current period</li>
              <li>You will retain access to premium content until the end of your current billing period</li>
              <li>No partial refunds are provided for unused time in a subscription period</li>
            </ul>

            <h3 className="font-heading text-lg text-neutral-200 mb-2">How to Cancel</h3>
            <p className="text-neutral-400 leading-relaxed">
              To cancel your subscription, log into your account and navigate to Account Settings → 
              Subscription Management, or contact our support team at support@thecrowniwilltakefromyou.com
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              5. Refund Request Process
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-3">
              If you believe you are eligible for a refund:
            </p>
            <ol className="list-decimal list-inside text-neutral-400 space-y-2">
              <li>Contact us at <span className="text-neutral-200">support@thecrowniwilltakefromyou.com</span> within 7 days of the transaction</li>
              <li>Include your transaction ID, order number, and reason for the refund request</li>
              <li>Provide any supporting documentation (screenshots, payment receipts, etc.)</li>
              <li>Our team will review your request within 5-7 business days</li>
              <li>If approved, refunds will be processed to the original payment method within 7-10 business days</li>
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              6. Payment Processing Time
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              Approved refunds are processed within 7-10 business days. However, the time it takes for 
              the refund to appear in your account depends on your payment provider:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mt-3">
              <li>Credit/Debit Cards: 5-10 business days</li>
              <li>PayPal: 3-5 business days</li>
              <li>UPI/Net Banking: 3-7 business days</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              7. Chargebacks
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              If you initiate a chargeback through your payment provider without first contacting us:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mt-3">
              <li>Your account will be immediately suspended pending investigation</li>
              <li>Access to all premium content will be revoked</li>
              <li>We reserve the right to permanently ban accounts involved in fraudulent chargebacks</li>
              <li>Please contact us first to resolve payment disputes</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              8. Price Changes
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              If we change our pricing:
            </p>
            <ul className="list-disc list-inside text-neutral-400 space-y-2 mt-3">
              <li>Existing subscribers will maintain their current rate until their subscription renews</li>
              <li>New prices will apply upon renewal unless you cancel before the renewal date</li>
              <li>We will notify you of any price changes at least 30 days in advance</li>
            </ul>
          </section>

          <section className="mb-14">
            <h2 className="font-heading text-xl md:text-2xl text-neutral-100 mb-3">
              9. Contact for Refunds
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              For any refund or cancellation inquiries, please contact:
              <br />
              <span className="text-neutral-200">Email: support@thecrowniwilltakefromyou.com</span>
              <br />
              <span className="text-neutral-400 text-sm mt-2 block">
                Please include your order ID and detailed explanation for faster processing.
              </span>
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