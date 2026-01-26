// app/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { generateHomeJsonLd } from "@/lib/seo/jsonld";

// Static imports - Server Components (zero JS sent to client)
import HeroSection from "@/components/home/HeroSection";
import NovelInfo from "@/components/home/NovelInfo";

// Client component for interactive gallery
import ImageGallery from "@/components/home/ImageGallery";

// Dynamic imports for below-fold heavy components (SSR enabled)
const PricingPlans = dynamic(() => import("@/components/PricingPlans"), {
  loading: () => <PricingPlansSkeleton />,
});

const ChaptersList = dynamic(() => import("@/components/ChaptersList"), {
  loading: () => <ChaptersListSkeleton />,
});

// Skeletons
import PricingPlansSkeleton from "@/components/home/skeletons/PricingPlansSkeleton";
import ChaptersListSkeleton from "@/components/home/skeletons/ChaptersListSkeleton";

// Client wrapper for deferred component
import AmbientIndicatorWrapper from "@/components/home/AmbientIndicatorWrapper";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://the-crown-i-will-take-from-you.vercel.app";

export const metadata: Metadata = {
  title: "The Crown I Will Take From You | Korean Fantasy Web Novel - Read Free",
  description:
    "Read 'The Crown I Will Take From You' (너에게 빼앗을 왕관) online free. A gripping Korean fantasy regression revenge romance. Medea returns 13 years to the past with memories of betrayal. Will she claim her revenge? English translation available.",
  keywords: [
    "The Crown I Will Take From You",
    "너에게 빼앗을 왕관",
    "read online free",
    "Korean web novel",
    "fantasy regression",
    "revenge romance novel",
    "Medea revenge",
    "kingmaker novel",
    "time travel romance",
    "English translation",
    "villainess novel",
    "Korean manhwa",
    "web novel translation",
    "Wilbright",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "The Crown I Will Take From You | Read Korean Fantasy Web Novel Free",
    description:
      "Medea returns 13 years to the past. With her experience as a Kingmaker and memories of betrayal, she will stop at nothing for revenge.",
    url: siteUrl,
    siteName: "The Crown I Will Take From You",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "The Crown I Will Take From You - Medea's Revenge Story",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Crown I Will Take From You | Korean Fantasy Web Novel",
    description:
      "Medea returns 13 years to the past. Experience the ultimate revenge fantasy romance.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  const homeJsonLd = generateHomeJsonLd(siteUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      {/* Simplified fog overlay */}
      <div className="fog-overlay" aria-hidden="true" />

      <main
        id="main-content"
        className="relative min-h-screen pb-24 bg-[#050505] text-[#a3a3a3] antialiased overflow-x-hidden selection:bg-[#881337] selection:text-white"
        role="main"
      >
        {/* Static background gradient */}
        <div
          className="fixed inset-0 bg-gradient-to-b from-slate-900/20 via-black to-black -z-10"
          aria-hidden="true"
        />

        {/* Hero - Server Rendered */}
        <HeroSection />

        {/* Image Gallery - Client Component (interactive) */}
        <Suspense fallback={<ImageGallerySkeleton />}>
          <ImageGallery />
        </Suspense>

        {/* Novel Info - Server Rendered */}
        <NovelInfo />

        {/* Pricing - Dynamically Loaded */}
        <section id="pricing" aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="sr-only">
            Subscription Plans and Pricing
          </h2>
          <Suspense fallback={<PricingPlansSkeleton />}>
            <PricingPlans />
          </Suspense>
        </section>

        {/* Chapters - Dynamically Loaded */}
        <section id="chapters" aria-labelledby="chapters-heading">
          <h2 id="chapters-heading" className="sr-only">
            Available Chapters
          </h2>
          <Suspense fallback={<ChaptersListSkeleton />}>
            <ChaptersList />
          </Suspense>
        </section>
      </main>

      {/* Ambient Indicator - Client Wrapper handles deferred loading */}
      <AmbientIndicatorWrapper />
    </>
  );
}

// Inline skeleton for image gallery
function ImageGallerySkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-8 mb-20 lg:mb-40">
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 aspect-[3/4] bg-neutral-900/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-6 md:gap-8">
          <div className="aspect-[3/4] bg-neutral-900/50 rounded-xl animate-pulse" />
          <div className="aspect-[3/4] bg-neutral-900/50 rounded-xl animate-pulse" />
        </div>
      </div>
    </section>
  );
}