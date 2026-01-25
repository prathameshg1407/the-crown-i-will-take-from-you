// lib/seo/jsonld.ts
export function generateHomeJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
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
            target: [`${siteUrl}/chapters`],
          },
        ],
      },
      {
        "@type": "ImageObject",
        "@id": `${siteUrl}/#primaryimage`,
        url: `${siteUrl}/img1.jpg`,
        contentUrl: `${siteUrl}/img1.jpg`,
        width: 800,
        height: 1200,
        caption:
          "The Crown I Will Take From You - Main Cover featuring Medea",
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
        inLanguage: "ko",
        datePublished: "2024",
        description:
          "An epic Korean fantasy regression revenge romance. Medea returns 13 years to the past with memories of betrayal, determined to claim her revenge.",
        image: `${siteUrl}/img1.jpg`,
        mainEntityOfPage: siteUrl,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "1250",
          bestRating: "5",
          worstRating: "1",
        },
      },
      {
        "@type": "FAQPage",
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
              text: "The novel covers Fantasy, Regression, Revenge, Romance, and Drama genres. It's especially popular among fans of time-travel revenge romances.",
            },
          },
        ],
      },
    ],
  };
}

export function generateChapterJsonLd(
  siteUrl: string,
  chapterNumber: number,
  chapterTitle: string,
  content: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Chapter",
    "@id": `${siteUrl}/chapters/${chapterNumber}`,
    name: `Chapter ${chapterNumber}: ${chapterTitle}`,
    isPartOf: {
      "@type": "Book",
      "@id": `${siteUrl}/#book`,
      name: "The Crown I Will Take From You",
    },
    position: chapterNumber,
    url: `${siteUrl}/chapters/${chapterNumber}`,
    text: content.substring(0, 500) + "...",
    inLanguage: "en",
  };
}