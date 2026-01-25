// app/page.tsx
import type { Metadata } from "next";
import HomeClient from "@/components/home/HomeClient";
import { generateHomeJsonLd } from "@/lib/seo/jsonld";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com";

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
    "chapter 1",
    "latest chapters",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "The Crown I Will Take From You | Read Korean Fantasy Web Novel Free",
    description:
      "Medea returns 13 years to the past. With her experience as a Kingmaker and memories of betrayal, she will stop at nothing for revenge.",
    url: siteUrl,
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: "The Crown I Will Take From You - Medea's Revenge Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Crown I Will Take From You | Korean Fantasy Web Novel",
    description:
      "Medea returns 13 years to the past. Experience the ultimate revenge fantasy romance.",
    images: [`${siteUrl}/twitter-home.jpg`],
  },
};

export default function Home() {
  const jsonLd = generateHomeJsonLd(siteUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}