// app/sitemap.ts
import { MetadataRoute } from "next";
import { chapters, PRICING } from "@/data/chapters";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/#chapters`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/#pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Chapter pages - prioritize free chapters higher
  const chapterPages: MetadataRoute.Sitemap = chapters.map((chapter) => {
    const isFree = chapter.id <= PRICING.FREE_CHAPTERS;
    const isPrologue = chapter.id === 0;
    
    return {
      url: `${siteUrl}/read/${chapter.slug}`,
      lastModified: chapter.publishedAt,
      changeFrequency: "monthly" as const,
      // Prologue highest, then free chapters, then premium
      priority: isPrologue ? 0.95 : isFree ? 0.85 : 0.7,
    };
  });

  return [...staticPages, ...chapterPages];
}