// components/seo/SEOHead.tsx
import Head from "next/head";

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
}

export function generateSEOTags({
  title,
  description,
  canonicalUrl,
  ogImage = "/og-default.jpg",
  noIndex = false,
  article,
}: SEOProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com";

  return {
    title,
    description,
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    alternates: {
      canonical: canonicalUrl || siteUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl || siteUrl,
      images: [
        {
          url: ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(article && {
        type: "article",
        publishedTime: article.publishedTime,
        modifiedTime: article.modifiedTime,
        authors: article.author ? [article.author] : undefined,
        section: article.section,
        tags: article.tags,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`],
    },
  };
}