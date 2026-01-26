// components/home/HomeClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, memo } from "react";
import PricingPlans from "@/components/PricingPlans";
import ChaptersList from "@/components/ChaptersList";

// ============================================================================
// Optimized Image Gallery Component
// ============================================================================

interface ImageGalleryProps {
  images: Array<{ src: string; alt: string }>;
  onSwap: (index: number) => void;
}

const ImageGallery = memo(function ImageGallery({ images, onSwap }: ImageGalleryProps) {
  return (
    <section 
      className="max-w-7xl mx-auto px-6 md:px-8 mb-20 lg:mb-40 reveal"
      aria-labelledby="cover-art-heading"
    >
      <h2 id="cover-art-heading" className="sr-only">Novel Cover Art and Illustrations</h2>
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Cover */}
        <figure className="lg:col-span-2">
          <button
            type="button"
            onClick={() => onSwap(0)}
            className="w-full cursor-pointer group"
            aria-label="View main cover image"
          >
            <div className="relative aspect-[3/4] w-full max-h-[80vh] rounded-xl overflow-hidden image-glow border border-[#881337]/30 group-hover:border-[#881337]/60 transition-all duration-500">
              <Image
                src={images[0].src}
                alt={images[0].alt}
                fill
                className="object-contain group-hover:scale-[1.02] transition-transform duration-700"
                priority
                sizes="(min-width: 1024px) 66vw, 100vw"
                quality={95}
              />
            </div>
          </button>
        </figure>

        {/* Side Images */}
        <div className="grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-6 md:gap-8">
          {[1, 2].map((index) => (
            <figure key={index}>
              <button
                type="button"
                onClick={() => onSwap(index)}
                className="w-full cursor-pointer group"
                aria-label={`View image ${index + 1}`}
              >
                <div className="relative aspect-[3/4] lg:max-h-[38vh] rounded-xl overflow-hidden border border-[#881337]/20 group-hover:border-[#881337]/50 transition-all duration-500 image-glow">
                  <Image
                    src={images[index].src}
                    alt={images[index].alt}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-700"
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    loading="lazy"
                    quality={90}
                  />
                </div>
              </button>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
});

// ============================================================================
// Credits Section Component
// ============================================================================

const CreditsSection = memo(function CreditsSection() {
  return (
    <section className="mb-20 reveal" aria-labelledby="credits-heading">
      <h2 id="credits-heading" className="sr-only">Novel Credits and Information</h2>
      <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-8 md:p-10 shadow-2xl backdrop-blur-sm">
        <dl className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
          <div>
            <dt className="text-[9px] font-ui tracking-[0.35em] uppercase text-neutral-500 mb-3 font-light">
              Author
            </dt>
            <dd>
              <span className="font-heading text-lg text-neutral-100 mb-1 block" itemProp="author" itemScope itemType="https://schema.org/Person">
                <span itemProp="name">Wilbright</span>
              </span>
              <span className="text-sm text-neutral-500 font-body" lang="ko">윌브라이트</span>
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-ui tracking-[0.35em] uppercase text-neutral-500 mb-3 font-light">
              Artist
            </dt>
            <dd>
              <span className="font-heading text-lg text-neutral-100 mb-1 block" itemProp="illustrator" itemScope itemType="https://schema.org/Person">
                <span itemProp="name">Pilyeon</span>
              </span>
              <span className="text-sm text-neutral-500 font-body" lang="ko">필연</span>
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-ui tracking-[0.35em] uppercase text-neutral-500 mb-3 font-light">
              Language
            </dt>
            <dd>
              <span className="font-heading text-lg text-neutral-100 mb-1 block">Korean</span>
              <span className="text-sm text-neutral-500 font-body">English TL</span>
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-ui tracking-[0.35em] uppercase text-neutral-500 mb-3 font-light">
              Year
            </dt>
            <dd>
              <time className="font-heading text-lg text-neutral-100 mb-1 block" itemProp="datePublished" dateTime="2024">2024</time>
              <span className="text-sm text-neutral-500 font-body">Ongoing</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
});

// ============================================================================
// Genre Tags Component
// ============================================================================

const GENRE_TAGS = ["Fantasy", "Regression", "Revenge", "Romance", "Drama"] as const;

const GenreTags = memo(function GenreTags() {
  return (
    <nav className="mb-20 reveal" aria-label="Genre tags">
      <ul className="flex flex-wrap justify-center gap-3" itemProp="genre">
        {GENRE_TAGS.map((tag) => (
          <li key={tag}>
            <span
              className="px-5 py-2.5 border border-[#9f1239]/30 rounded-full text-[10px] font-ui tracking-[0.25em] uppercase text-[#9f1239] bg-[#4c0519]/10 hover:bg-[#4c0519]/20 hover:border-[#9f1239]/50 transition-all duration-300 font-light inline-block cursor-default"
            >
              {tag}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
});

// ============================================================================
// Revenge Declarations Component
// ============================================================================

const RevengeDeclarations = memo(function RevengeDeclarations() {
  return (
    <aside className="my-20 bg-gradient-to-r from-transparent via-neutral-900/40 to-transparent border-y border-neutral-800/60 py-14 space-y-8 -mx-6 px-6 md:-mx-8 md:px-8">
      <h3 className="sr-only">Medea&apos;s Revenge Declarations</h3>
      
      <blockquote className="border-l-4 border-purple-900/60 pl-8 py-2">
        <p className="text-purple-400 font-heading text-2xl md:text-3xl mb-3 tracking-wide">
          &quot;Claudio.&quot;
        </p>
        <p className="text-neutral-400 text-lg md:text-xl font-body font-light leading-relaxed">
          All the glory given to my uncle will lose its luster.
        </p>
      </blockquote>

      <blockquote className="border-l-4 border-rose-900/60 pl-8 py-2">
        <p className="text-rose-400 font-heading text-2xl md:text-3xl mb-3 tracking-wide">
          &quot;Jason.&quot;
        </p>
        <p className="text-neutral-400 text-lg md:text-xl font-body font-light leading-relaxed">
          The glorious crown my husband desired would be taken away.
        </p>
      </blockquote>

      <blockquote className="border-l-4 border-red-900/60 pl-8 py-2">
        <p className="text-red-400 font-heading text-2xl md:text-3xl mb-3 tracking-wide">
          &quot;I&apos;m back.&quot;
        </p>
        <p className="text-neutral-400 text-lg md:text-xl font-body font-light leading-relaxed">
          The prophecy that returned once in a lifetime shined in a gloomy light.
        </p>
      </blockquote>
    </aside>
  );
});

// ============================================================================
// Main Home Client Component
// ============================================================================

export default function HomeClient() {
  const [images, setImages] = useState([
    { src: "/img1.jpg", alt: "The Crown I Will Take From You - Main Cover featuring Medea, the protagonist seeking revenge" },
    { src: "/img2.png", alt: "The Crown I Will Take From You - Character illustration by artist Pilyeon" },
    { src: "/img3.png", alt: "The Crown I Will Take From You - Fantasy kingdom artwork" },
  ]);

  // Reveal on scroll
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleSwap = useCallback((index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  }, []);

  return (
    <>
      <div className="fog-container" aria-hidden="true" />

      <main 
        id="main-content"
        className="relative min-h-screen pb-24 bg-[#050505] text-[#a3a3a3] antialiased overflow-x-hidden selection:bg-[#881337] selection:text-white"
        role="main"
      >
        {/* Background */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" aria-hidden="true" />

        {/* Hero Header */}
        <header className="min-h-[90vh] lg:min-h-screen flex flex-col items-center justify-center relative px-6 py-16 lg:py-20">
          <div className="flex flex-col items-center reveal max-w-6xl mx-auto">
            {/* Badge */}
            <div className="mb-8 px-5 py-2 border border-[#881337]/40 rounded-full bg-[#4c0519]/20 backdrop-blur-sm">
              <span className="text-[#ffe4e6] text-[9px] font-ui tracking-[0.45em] uppercase font-light">
                Korean Web Novel • 2024
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-[clamp(3rem,12vw,10rem)] font-heading text-center leading-[0.9] tracking-[-0.02em] mb-10 text-neutral-100">
              <span className="sr-only">The Crown I Will Take From You - Korean Fantasy Regression Revenge Web Novel</span>
              <span aria-hidden="true">
                The Crown <br />
                <span className="gradient-text italic font-bold">I Will Take</span>
                <br />
                <span className="gradient-text italic font-bold">From You</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="font-body text-[clamp(1.125rem,2.5vw,1.5rem)] text-neutral-400 italic max-w-3xl text-center mb-6 leading-relaxed px-4">
              &quot;I&apos;m back... and this time, the crown you desired will be
              torn from your grasp.&quot;
            </p>

            {/* Korean Title */}
            <p className="text-[#f43f5e] text-base md:text-lg font-body tracking-[0.3em] font-light" lang="ko">
              너에게 빼앗을 왕관
            </p>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-12 animate-bounce text-neutral-600" aria-hidden="true">
            <svg
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-label="Scroll down"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </header>

        {/* Cover Images */}
        <ImageGallery images={images} onSwap={handleSwap} />

        {/* Novel Information */}
        <article className="max-w-4xl mx-auto px-6 md:px-8 relative z-10" itemScope itemType="https://schema.org/Book">
          <meta itemProp="name" content="The Crown I Will Take From You" />
          <meta itemProp="alternateName" content="너에게 빼앗을 왕관" />
          <meta itemProp="inLanguage" content="ko" />
          <meta itemProp="bookFormat" content="EBook" />
          
          {/* Credits */}
          <CreditsSection />

          {/* Genre Tags */}
          <GenreTags />

          {/* Synopsis */}
          <section className="prose prose-invert prose-lg md:prose-xl max-w-none reveal" aria-labelledby="synopsis-heading">
            <div className="mb-10 px-5 py-2 border border-amber-900/30 rounded-full bg-amber-950/10 inline-block">
              <h2 id="synopsis-heading" className="text-amber-200/60 text-[9px] font-ui tracking-[0.45em] uppercase font-light m-0">
                Synopsis
              </h2>
            </div>

            <div itemProp="description">
              <p className="drop-cap text-neutral-300 text-xl md:text-2xl leading-[1.9] mb-10 font-body font-light">
                I held my swollen belly with my second child and heard the news of
                my husband&apos;s marriage. It was a painful betrayal by my
                husband I loved with all my life.
              </p>

              <blockquote className="my-14 border-l-2 border-[#881337]/40 pl-8 py-2">
                <p className="text-[#e2e8f0] text-xl md:text-2xl italic leading-[1.8] font-body">
                  &quot;Ahaha! You&apos;re a Princess and you act so proud, but
                  look at you. Valdina was destroyed, and your brother was torn
                  into pieces by demonic beasts. Because a stupid like you!&quot;
                </p>
              </blockquote>

              <p className="text-neutral-400 text-lg md:text-xl leading-[1.9] mb-10 font-body font-light">
                My brother died, and my country was destroyed. Even the children
                born from the embryo died at the hands of their father.
              </p>

              <p className="text-neutral-400 text-lg md:text-xl leading-[1.9] mb-10 font-body font-light">
                The moment I took the poison, realizing that all of this was a
                plan by my uncle&apos;s family and my husband.
              </p>

              <div className="my-20 text-center" role="presentation">
                <p className="font-heading text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 italic leading-tight">
                  &quot;I&apos;m back...<br />Again...&quot;
                </p>
              </div>

              <p className="text-neutral-400 text-lg md:text-xl leading-[1.9] mb-10 font-body font-light">
                I returned to the past 13 years ago. With my experience as a
                Kingmaker who established my husband as an Emperor in a fierce
                battle for the throne, and with memories of everything that will
                happen in the future, I was shocked and realized.
              </p>

              <p className="text-neutral-200 text-xl md:text-2xl leading-[1.9] mb-10 font-body font-normal">
                God has granted my last request.
              </p>
            </div>

            {/* Revenge Declarations */}
            <RevengeDeclarations />

            {/* Final Declaration */}
            <div className="mt-20 mb-24 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-900/50 to-purple-900/50 rounded-xl blur-xl opacity-60" aria-hidden="true" />
              <div className="relative bg-black/80 border border-slate-700/50 p-10 md:p-14 rounded-xl text-center">
                <h3 className="text-3xl md:text-4xl font-heading text-neutral-200 mb-8 tracking-wide leading-tight">
                  To get my revenge,
                </h3>
                <p className="text-5xl md:text-7xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 uppercase tracking-[0.15em] leading-tight mb-3">
                  I, Medea,
                </p>
                <p className="text-4xl md:text-6xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 uppercase tracking-[0.15em] leading-tight">
                  Would Stop at Nothing
                </p>
              </div>
            </div>
          </section>

          {/* CTA Buttons */}
          <nav className="mt-24 mb-40 flex flex-col sm:flex-row gap-5 justify-center reveal" aria-label="Reading actions">
            <Link 
              href="/chapters"
              className="group relative px-14 py-4 font-heading tracking-[0.25em] uppercase text-sm overflow-hidden rounded-lg border border-[#9f1239] bg-[#9f1239]/10 text-[#9f1239] hover:text-white transition-all duration-300 shadow-lg hover:shadow-[#9f1239]/20 text-center active:scale-[0.98]"
            >
              <span className="relative z-10">Begin Reading</span>
              <div className="absolute inset-0 bg-[#9f1239] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" aria-hidden="true" />
            </Link>

            <button 
              className="group relative px-14 py-4 font-heading tracking-[0.25em] uppercase text-sm overflow-hidden rounded-lg border border-neutral-700 bg-transparent text-neutral-400 hover:text-white hover:border-neutral-500 transition-all duration-300 active:scale-[0.98]"
              aria-label="Add The Crown I Will Take From You to your library"
            >
              <span className="relative z-10">Add to Library</span>
            </button>
          </nav>
        </article>

        {/* Pricing Plans */}
        <section id="pricing" aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="sr-only">Subscription Plans and Pricing</h2>
          <PricingPlans />
        </section>

        {/* Chapters List */}
        <section id="chapters" aria-labelledby="chapters-heading">
          <h2 id="chapters-heading" className="sr-only">Available Chapters</h2>
          <ChaptersList />
        </section>
      </main>

      {/* Ambient Indicator */}
      <aside 
        className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-neutral-900/90 backdrop-blur-md px-5 py-3 rounded-full border border-white/10 shadow-2xl"
        aria-label="Content tags"
      >
        <div className="flex gap-1 h-3 items-end" aria-hidden="true">
          <div className="w-1 bg-red-500 h-2 animate-pulse rounded-full" />
          <div className="w-1 bg-red-500 h-3 animate-pulse [animation-delay:75ms] rounded-full" />
          <div className="w-1 bg-red-500 h-1 animate-pulse [animation-delay:150ms] rounded-full" />
        </div>
        <span className="text-[10px] font-ui text-neutral-400 uppercase tracking-[0.3em] font-light">
          Fantasy • Regression
        </span>
      </aside>
    </>
  );
}