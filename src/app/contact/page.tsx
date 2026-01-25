// app/contact/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission (replace with actual API call)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Message sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#a3a3a3] antialiased overflow-x-hidden selection:bg-[#881337] selection:text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />

      <div className="max-w-4xl mx-auto px-6 md:px-8 py-20 md:py-28">
        <header className="mb-14 text-center">
          <div className="mb-6 px-5 py-2 border border-[#881337]/40 rounded-full bg-[#4c0519]/20 backdrop-blur-sm inline-block">
            <span className="text-[#ffe4e6] text-[9px] font-ui tracking-[0.45em] uppercase font-light subpixel-antialiased">
              Support
            </span>
          </div>

          <h1 className="text-[clamp(2.5rem,6vw,3.5rem)] font-heading text-neutral-100 mb-4 tracking-[0.15em] uppercase subpixel-antialiased">
            Contact Us
          </h1>

          <p className="font-body text-neutral-400 text-base md:text-lg max-w-2xl mx-auto subpixel-antialiased">
            Have questions or need assistance? We're here to help.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-10 mb-14">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-6">
              <h2 className="font-heading text-xl text-neutral-100 mb-4">Get in Touch</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-ui tracking-wider uppercase text-neutral-500 mb-2">Email</h3>
                  <a 
                    href="mailto:support@thecrowniwilltakefromyou.com"
                    className="text-neutral-200 hover:text-[#fb7185] transition-colors"
                  >
                    support@thecrowniwilltakefromyou.com
                  </a>
                </div>

                <div>
                  <h3 className="text-sm font-ui tracking-wider uppercase text-neutral-500 mb-2">Response Time</h3>
                  <p className="text-neutral-300">Within 24-48 hours</p>
                </div>

                <div>
                  <h3 className="text-sm font-ui tracking-wider uppercase text-neutral-500 mb-2">Support Hours</h3>
                  <p className="text-neutral-300">Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-6">
              <h2 className="font-heading text-xl text-neutral-100 mb-4">Common Inquiries</h2>
              <ul className="space-y-3 text-neutral-400">
                <li>• Payment and billing issues</li>
                <li>• Account access problems</li>
                <li>• Content availability questions</li>
                <li>• Technical support</li>
                <li>• Refund requests</li>
                <li>• Partnership opportunities</li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-6 md:p-8">
            <h2 className="font-heading text-xl text-neutral-100 mb-6">Send us a Message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-ui tracking-wider uppercase text-neutral-500 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-950/50 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-[#9f1239] transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-ui tracking-wider uppercase text-neutral-500 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-950/50 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-[#9f1239] transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-ui tracking-wider uppercase text-neutral-500 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-950/50 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-[#9f1239] transition-colors"
                  placeholder="What is this regarding?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-ui tracking-wider uppercase text-neutral-500 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-950/50 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:border-[#9f1239] transition-colors resize-none"
                  placeholder="Please describe your inquiry in detail..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-[#9f1239] text-white font-heading tracking-widest uppercase text-sm rounded-lg hover:bg-[#881337] disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>

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