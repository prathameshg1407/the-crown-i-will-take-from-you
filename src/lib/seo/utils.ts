// lib/seo/utils.ts
import { chapters, PRICING, MAX_CHAPTER_ID } from "@/data/chapters";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com";
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
    isFree ? "free chapter" : "premium",
  ];

  const canonicalUrl = `${siteUrl}/read/${chapter.slug}`;
  const ogImage = `${siteUrl}/og/chapter-${chapter.id}.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    name: `${chapterLabel}: ${chapter.title}`,
    position: chapter.id + 1,
    url: canonicalUrl,
    isPartOf: {
      "@type": "Book",
      name: siteName,
      alternateName: siteNameKorean,
      author: { "@type": "Person", name: "Wilbright" },
    },
    datePublished: chapter.publishedAt,
    inLanguage: "en",
    isAccessibleForFree: isFree,
  };

  return { title, description, keywords, canonicalUrl, ogImage, jsonLd };
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
    description: "An epic Korean fantasy regression revenge romance web novel. Follow Medea's journey of betrayal, time travel, and ultimate revenge.",
    image: `${siteUrl}/img1.jpg`,
    url: siteUrl,
    workExample: chapters.slice(0, 5).map((ch) => ({
      "@type": "Chapter",
      name: `${ch.number}: ${ch.title}`,
      url: `${siteUrl}/read/${ch.slug}`,
      position: ch.id + 1,
    })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "1250",
      bestRating: "5",
      worstRating: "1",
    },
    offers: [
      {
        "@type": "Offer",
        name: "Free Chapters",
        description: `First ${PRICING.FREE_CHAPTERS + 1} chapters free`,
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Complete Pack",
        description: `All ${PRICING.COMPLETE_PACK.chapters} premium chapters`,
        price: String(PRICING.COMPLETE_PACK.price),
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
    ],
  };
}

export function generateFAQJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
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
          text: `The Complete Pack costs ₹${PRICING.COMPLETE_PACK.price} for all ${PRICING.COMPLETE_PACK.chapters} premium chapters. This is a one-time payment with lifetime access, averaging just ₹${PRICING.COMPLETE_PACK.pricePerChapter} per chapter.`,
        },
      },
    ],
  };
}