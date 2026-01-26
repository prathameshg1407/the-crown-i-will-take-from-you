// lib/seo/utils.ts
import { chapters, PRICING } from "@/data/chapters";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://the-crown-i-will-take-from-you.vercel.app";
const siteName = "The Crown I Will Take From You";
const siteNameKorean = "너에게 빼앗을 왕관";

export interface ChapterSEO {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  ogImage: string;
  jsonLd: object;
}

export function generateChapterSEO(chapterId: number): ChapterSEO | null {
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) return null;

  const isPrologue = chapter.id === 0;
  const chapterLabel = isPrologue ? "Prologue" : `Chapter ${chapter.id}`;
  const isFree = chapter.id <= PRICING.FREE_CHAPTERS;

  const title = `${chapterLabel}: ${chapter.title} | ${siteName}`;

  const description = isPrologue
    ? `Read the Prologue "${chapter.title}" of "${siteName}" (${siteNameKorean}). The epic Korean fantasy regression revenge romance begins. Free to read.`
    : `Read ${chapterLabel} "${chapter.title}" of "${siteName}". ${isFree ? "Free chapter." : "Premium chapter."} Korean fantasy regression revenge romance.`;

  const keywords = [
    siteName,
    siteNameKorean,
    chapterLabel,
    chapter.title,
    "Korean web novel",
    "fantasy",
    "regression",
    "revenge romance",
    "read online",
    "English translation",
    isFree ? "free chapter" : "premium chapter",
    "Medea",
    "villainess",
  ];

  const canonicalUrl = `${siteUrl}/read/${chapter.slug}`;
  
  // Use default OG image unless you have per-chapter images
  const ogImage = `${siteUrl}/og-image.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    "@id": `${canonicalUrl}/#chapter`,
    name: `${chapterLabel}: ${chapter.title}`,
    headline: chapter.title,
    position: chapter.id + 1,
    url: canonicalUrl,
    isPartOf: {
      "@type": "Book",
      "@id": `${siteUrl}/#book`,
      name: siteName,
      alternateName: siteNameKorean,
      author: { "@type": "Person", name: "Wilbright" },
    },
    datePublished: chapter.publishedAt,
    dateModified: new Date().toISOString(),
    inLanguage: "en",
    isAccessibleForFree: isFree,
    author: {
      "@type": "Person",
      name: "Wilbright",
    },
  };

  return { title, description, keywords, canonicalUrl, ogImage, jsonLd };
}

export function generateChapterSEOBySlug(slug: string): ChapterSEO | null {
  const chapter = chapters.find((c) => c.slug === slug);
  if (!chapter) return null;
  return generateChapterSEO(chapter.id);
}

export function generateBookJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": `${siteUrl}/#book`,
    name: siteName,
    alternateName: siteNameKorean,
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
    description:
      "An epic Korean fantasy regression revenge romance web novel. Follow Medea's journey of betrayal, time travel, and ultimate revenge.",
    image: `${siteUrl}/og-image.jpg`,
    url: siteUrl,
    workExample: chapters.slice(0, 5).map((ch) => ({
      "@type": "Chapter",
      name: ch.id === 0 ? `Prologue: ${ch.title}` : `Chapter ${ch.id}: ${ch.title}`,
      url: `${siteUrl}/read/${ch.slug}`,
      position: ch.id + 1,
      isAccessibleForFree: ch.id <= PRICING.FREE_CHAPTERS,
    })),
    // Only include offers if you have a real product
    offers: {
      "@type": "Offer",
      name: "Premium Chapters",
      description: `Access all ${PRICING.COMPLETE_PACK.chapters} premium chapters`,
      price: String(PRICING.COMPLETE_PACK.price),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/#pricing`,
    },
  };
}

export function generateFAQJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    mainEntity: [
      {
        "@type": "Question",
        name: `What is "${siteName}" about?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `"${siteName}" (${siteNameKorean}) is a Korean fantasy regression revenge romance web novel. It follows Medea, a princess who is betrayed by her husband and returns 13 years to the past to seek revenge and reclaim her rightful crown.`,
        },
      },
      {
        "@type": "Question",
        name: "How many chapters are available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `There are ${chapters.length} chapters in total. The first ${PRICING.FREE_CHAPTERS + 1} chapters (Prologue through Chapter ${PRICING.FREE_CHAPTERS}) are free to read. Premium chapters are available with the Complete Pack.`,
        },
      },
      {
        "@type": "Question",
        name: "Is there an English translation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! The novel has been translated from Korean to English. You can read the complete English translation on our website.",
        },
      },
      {
        "@type": "Question",
        name: "Who is the author?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The novel is written by Wilbright (윌브라이트) with beautiful illustrations by Pilyeon (필연).",
        },
      },
      {
        "@type": "Question",
        name: "What genres does this novel cover?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The novel spans Fantasy, Regression (time travel), Revenge, Romance, and Drama. It's particularly popular among fans of Korean web novels, villainess stories, and revenge fantasy romance.",
        },
      },
      {
        "@type": "Question",
        name: "How much does the Complete Pack cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `The Complete Pack costs ₹${PRICING.COMPLETE_PACK.price} for all ${PRICING.COMPLETE_PACK.chapters} premium chapters. This is a one-time payment with lifetime access.`,
        },
      },
      {
        "@type": "Question",
        name: "Can I read on mobile devices?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! The website is fully responsive and optimized for reading on mobile phones, tablets, and desktop computers.",
        },
      },
    ],
  };
}

// Generate breadcrumb for any page
export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url || undefined,
    })),
  };
}

// Helper to get all chapter slugs for static generation
export function getAllChapterSlugs(): string[] {
  return chapters.map((c) => c.slug);
}

// Helper to get chapter by slug
export function getChapterBySlug(slug: string) {
  return chapters.find((c) => c.slug === slug);
}

// Generate metadata for chapter page
export function generateChapterMetadata(slug: string) {
  const seo = generateChapterSEOBySlug(slug);
  if (!seo) return null;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: seo.canonicalUrl,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: seo.canonicalUrl,
      siteName: siteName,
      images: [
        {
          url: seo.ogImage,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.ogImage],
    },
  };
}