// app/read/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chapters, PRICING } from "@/data/chapters";
import ReadChapterClient from "./ReadChapterClient";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://the-crown-i-will-take-from-you.vercel.app";
const siteName = "The Crown I Will Take From You";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate static params for all chapters
export async function generateStaticParams() {
  return chapters.map((chapter) => ({
    slug: chapter.slug,
  }));
}

// Generate metadata for each chapter
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const chapter = chapters.find((ch) => ch.slug === slug);

  if (!chapter) {
    return {
      title: "Chapter Not Found",
      description: "The requested chapter could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const isPrologue = chapter.id === 0;
  const isFree = chapter.id <= PRICING.FREE_CHAPTERS;
  const chapterLabel = isPrologue ? "Prologue" : `Chapter ${chapter.id}`;
  const fullTitle = `${chapterLabel}: ${chapter.title}`;
  const canonicalUrl = `${siteUrl}/read/${chapter.slug}`;

  const description = isPrologue
    ? `Read the Prologue "${chapter.title}" of "${siteName}" (너에게 빼앗을 왕관). The epic Korean fantasy regression revenge romance begins. Free to read.`
    : `Read ${chapterLabel} "${chapter.title}" of "${siteName}". ${isFree ? "Free chapter available." : "Premium chapter."} Korean fantasy revenge romance.`;

  return {
    title: fullTitle,
    description,
    keywords: [
      siteName,
      "너에게 빼앗을 왕관",
      chapterLabel,
      chapter.title,
      "Korean web novel",
      "read online",
      "English translation",
      "fantasy",
      "regression",
      "revenge romance",
      isFree ? "free chapter" : "premium chapter",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${fullTitle} | ${siteName}`,
      description,
      url: canonicalUrl,
      siteName,
      type: "article",
      locale: "en_US",
      publishedTime: chapter.publishedAt,
      modifiedTime: new Date().toISOString(),
      authors: ["Wilbright"],
      section: "Web Novel",
      tags: ["Fantasy", "Romance", "Regression", "Revenge"],
      images: [
        {
          url: `${siteUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} - ${chapterLabel}`,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${fullTitle} | ${siteName}`,
      description,
      images: [`${siteUrl}/og-image.jpg`],
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

// Generate JSON-LD for the chapter
function generateChapterJsonLd(chapter: (typeof chapters)[0]) {
  const isPrologue = chapter.id === 0;
  const chapterLabel = isPrologue ? "Prologue" : `Chapter ${chapter.id}`;
  const canonicalUrl = `${siteUrl}/read/${chapter.slug}`;
  const isFree = chapter.id <= PRICING.FREE_CHAPTERS;

  const currentIndex = chapters.findIndex((ch) => ch.id === chapter.id);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
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
          alternateName: "너에게 빼앗을 왕관",
        },
        author: {
          "@type": "Person",
          name: "Wilbright",
          alternateName: "윌브라이트",
        },
        datePublished: chapter.publishedAt || "2024-01-01",
        dateModified: new Date().toISOString(),
        inLanguage: "en",
        isAccessibleForFree: isFree,
        potentialAction: {
          "@type": "ReadAction",
          target: canonicalUrl,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}/#webpage`,
        url: canonicalUrl,
        name: `${chapterLabel}: ${chapter.title} | ${siteName}`,
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        breadcrumb: {
          "@id": `${canonicalUrl}/#breadcrumb`,
        },
        inLanguage: "en-US",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}/#breadcrumb`,
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
          {
            "@type": "ListItem",
            position: 3,
            name: chapterLabel,
            item: canonicalUrl,
          },
        ],
      },
      ...(prevChapter || nextChapter
        ? [
            {
              "@type": "WebPage",
              "@id": `${canonicalUrl}/#navigation`,
              relatedLink: [
                ...(prevChapter
                  ? [
                      {
                        "@type": "WebPage",
                        url: `${siteUrl}/read/${prevChapter.slug}`,
                        name: `Previous: ${prevChapter.id === 0 ? "Prologue" : `Chapter ${prevChapter.id}`}`,
                      },
                    ]
                  : []),
                ...(nextChapter
                  ? [
                      {
                        "@type": "WebPage",
                        url: `${siteUrl}/read/${nextChapter.slug}`,
                        name: `Next: Chapter ${nextChapter.id}`,
                      },
                    ]
                  : []),
              ],
            },
          ]
        : []),
    ],
  };
}

export default async function ReadChapterPage({ params }: PageProps) {
  const { slug } = await params;
  const chapter = chapters.find((ch) => ch.slug === slug);

  if (!chapter) {
    notFound();
  }

  const jsonLd = generateChapterJsonLd(chapter);

  const currentIndex = chapters.findIndex((ch) => ch.id === chapter.id);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {prevChapter && (
        <link rel="prev" href={`${siteUrl}/read/${prevChapter.slug}`} />
      )}
      {nextChapter && (
        <link rel="next" href={`${siteUrl}/read/${nextChapter.slug}`} />
      )}

      <ReadChapterClient slug={slug} chapter={chapter} />
    </>
  );
}