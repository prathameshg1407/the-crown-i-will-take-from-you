// app/chapters/page.tsx
import type { Metadata } from "next";
import { chapters, PRICING } from "@/data/chapters";
import ChaptersPageClient from "./ChaptersPageClient";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://the-crown-i-will-take-from-you.vercel.app";
const siteName = "The Crown I Will Take From You";

export const metadata: Metadata = {
  title: `All Chapters | ${siteName}`,
  description: `Browse all ${chapters.length} chapters of "${siteName}" (너에게 빼앗을 왕관). ${PRICING.FREE_CHAPTERS + 1} free chapters available. Korean fantasy regression revenge romance web novel. Read online in English.`,
  keywords: [
    siteName,
    "너에게 빼앗을 왕관",
    "all chapters",
    "chapter list",
    "read online",
    "Korean web novel",
    "fantasy novel chapters",
    "free chapters",
    "English translation",
    "Medea revenge",
    "regression novel",
    "villainess novel",
    "Wilbright",
  ],
  alternates: {
    canonical: `${siteUrl}/chapters`,
  },
  openGraph: {
    title: `All ${chapters.length} Chapters | ${siteName}`,
    description: `Browse the complete chapter list. ${PRICING.FREE_CHAPTERS + 1} free chapters. Epic Korean fantasy revenge romance.`,
    url: `${siteUrl}/chapters`,
    type: "website",
    siteName,
    locale: "en_US",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: `${siteName} - All Chapters`,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `All Chapters | ${siteName}`,
    description: `Browse all ${chapters.length} chapters. ${PRICING.FREE_CHAPTERS + 1} free chapters available.`,
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

function generateChaptersJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/chapters/#webpage`,
        name: `All Chapters - ${siteName}`,
        description: `Complete chapter listing for ${siteName}`,
        url: `${siteUrl}/chapters`,
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        about: {
          "@id": `${siteUrl}/#book`,
        },
        breadcrumb: {
          "@id": `${siteUrl}/chapters/#breadcrumb`,
        },
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/chapters/#list`,
        name: "Chapter List",
        numberOfItems: chapters.length,
        itemListElement: chapters.slice(0, 30).map((chapter, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Chapter",
            "@id": `${siteUrl}/read/${chapter.slug}`,
            name:
              chapter.id === 0
                ? `Prologue: ${chapter.title}`
                : `Chapter ${chapter.id}: ${chapter.title}`,
            url: `${siteUrl}/read/${chapter.slug}`,
            position: chapter.id,
            isAccessibleForFree: chapter.id <= PRICING.FREE_CHAPTERS,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/chapters/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Chapters",
            item: `${siteUrl}/chapters`,
          },
        ],
      },
      {
        "@type": "Book",
        "@id": `${siteUrl}/#book`,
        name: siteName,
        alternateName: "너에게 빼앗을 왕관",
        author: {
          "@type": "Person",
          name: "Wilbright",
          alternateName: "윌브라이트",
        },
        illustrator: {
          "@type": "Person",
          name: "Pilyeon",
          alternateName: "필연",
        },
        genre: ["Fantasy", "Romance", "Regression", "Revenge"],
        inLanguage: ["ko", "en"],
        numberOfPages: chapters.length,
        bookFormat: "EBook",
        datePublished: "2024",
        workExample: {
          "@type": "Book",
          bookFormat: "EBook",
          inLanguage: "en",
          url: `${siteUrl}/chapters`,
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/chapters/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "How many chapters are free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `The first ${PRICING.FREE_CHAPTERS + 1} chapters (Prologue through Chapter ${PRICING.FREE_CHAPTERS}) are completely free to read.`,
            },
          },
          {
            "@type": "Question",
            name: "How can I unlock premium chapters?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `You can unlock all ${PRICING.COMPLETE_PACK.chapters} premium chapters with the Complete Pack for ₹${PRICING.COMPLETE_PACK.price} (one-time payment, lifetime access).`,
            },
          },
          {
            "@type": "Question",
            name: "How often are new chapters released?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "All chapters are currently available. The complete novel has been fully translated and is ready to read.",
            },
          },
        ],
      },
    ],
  };
}

export default function ChaptersPage() {
  const jsonLd = generateChaptersJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content">
        <ChaptersPageClient />
      </main>
    </>
  );
}