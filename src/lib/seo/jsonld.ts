// lib/seo/jsonld.ts

const DEFAULT_SITE_URL = "https://the-crown-i-will-take-from-you.vercel.app";

export function generateHomeJsonLd(siteUrl: string = DEFAULT_SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "The Crown I Will Take From You",
        description: "Korean Fantasy Web Novel - English Translation",
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        inLanguage: "en-US",
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "The Crown I Will Take From You",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          "@id": `${siteUrl}/#logo`,
          url: `${siteUrl}/logo.png`,
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: "The Crown I Will Take From You | Korean Fantasy Web Novel",
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        primaryImageOfPage: {
          "@id": `${siteUrl}/#primaryimage`,
        },
        datePublished: "2024-01-01T00:00:00+00:00",
        dateModified: new Date().toISOString(),
        description:
          "Read 'The Crown I Will Take From You' - An epic Korean fantasy regression revenge romance web novel featuring Medea's journey of betrayal and ultimate revenge.",
        breadcrumb: {
          "@id": `${siteUrl}/#breadcrumb`,
        },
        inLanguage: "en-US",
        potentialAction: [
          {
            "@type": "ReadAction",
            target: [`${siteUrl}/read/prologue`],
          },
        ],
      },
      {
        "@type": "ImageObject",
        "@id": `${siteUrl}/#primaryimage`,
        url: `${siteUrl}/og-image.jpg`,
        contentUrl: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        caption: "The Crown I Will Take From You - Korean Fantasy Web Novel",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
        ],
      },
      {
        "@type": "Book",
        "@id": `${siteUrl}/#book`,
        name: "The Crown I Will Take From You",
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
        bookFormat: "EBook",
        genre: ["Fantasy", "Romance", "Regression", "Revenge", "Drama"],
        inLanguage: ["ko", "en"],
        datePublished: "2024",
        description:
          "An epic Korean fantasy regression revenge romance. Medea returns 13 years to the past with memories of betrayal, determined to claim her revenge.",
        image: `${siteUrl}/og-image.jpg`,
        mainEntityOfPage: siteUrl,
        // Only include if you have real ratings
        // aggregateRating: {
        //   "@type": "AggregateRating",
        //   ratingValue: "4.8",
        //   reviewCount: "1250",
        //   bestRating: "5",
        //   worstRating: "1",
        // },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is 'The Crown I Will Take From You' about?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It's a Korean fantasy regression revenge romance web novel about Medea, a princess who is betrayed by her husband and returns 13 years to the past to seek revenge and reclaim her rightful crown.",
            },
          },
          {
            "@type": "Question",
            name: "Is there an English translation available?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, the novel is being translated from Korean to English. You can read the English translation on our website.",
            },
          },
          {
            "@type": "Question",
            name: "Who is the author of the novel?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The novel is written by Wilbright (윌브라이트) with illustrations by Pilyeon (필연).",
            },
          },
          {
            "@type": "Question",
            name: "What genres does this novel cover?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The novel covers Fantasy, Regression, Revenge, Romance, and Drama genres. It's especially popular among fans of time-travel revenge romances and villainess stories.",
            },
          },
          {
            "@type": "Question",
            name: "How can I read premium chapters?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can purchase chapter bundles or subscribe to access premium chapters. The first few chapters are free to read.",
            },
          },
        ],
      },
    ],
  };
}

export function generateChapterJsonLd(
  siteUrl: string = DEFAULT_SITE_URL,
  chapter: {
    id: number;
    slug: string;
    title: string;
    publishedAt?: string;
  },
  contentPreview?: string
) {
  const chapterUrl = `${siteUrl}/read/${chapter.slug}`;
  const isPrologue = chapter.id === 0;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Chapter",
        "@id": `${chapterUrl}/#chapter`,
        name: isPrologue ? "Prologue" : `Chapter ${chapter.id}: ${chapter.title}`,
        headline: chapter.title,
        isPartOf: {
          "@type": "Book",
          "@id": `${siteUrl}/#book`,
          name: "The Crown I Will Take From You",
        },
        position: chapter.id,
        url: chapterUrl,
        description: contentPreview
          ? contentPreview.substring(0, 160).trim() + "..."
          : `Read ${isPrologue ? "Prologue" : `Chapter ${chapter.id}`} of The Crown I Will Take From You.`,
        inLanguage: "en",
        author: {
          "@type": "Person",
          name: "Wilbright",
        },
        datePublished: chapter.publishedAt || "2024-01-01",
        dateModified: new Date().toISOString(),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${chapterUrl}/#breadcrumb`,
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
            name: isPrologue ? "Prologue" : `Chapter ${chapter.id}`,
            item: chapterUrl,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${chapterUrl}/#webpage`,
        url: chapterUrl,
        name: `${isPrologue ? "Prologue" : `Chapter ${chapter.id}`}: ${chapter.title} | The Crown I Will Take From You`,
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        breadcrumb: {
          "@id": `${chapterUrl}/#breadcrumb`,
        },
        inLanguage: "en-US",
      },
    ],
  };
}

// Generate JSON-LD for chapters listing page
export function generateChaptersListJsonLd(
  siteUrl: string = DEFAULT_SITE_URL,
  chapters: Array<{ id: number; slug: string; title: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/chapters/#webpage`,
    name: "All Chapters | The Crown I Will Take From You",
    description: "Browse all chapters of The Crown I Will Take From You Korean fantasy web novel.",
    url: `${siteUrl}/chapters`,
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: chapters.slice(0, 50).map((chapter, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/read/${chapter.slug}`,
        name: chapter.id === 0 ? "Prologue" : `Chapter ${chapter.id}: ${chapter.title}`,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
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
  };
}