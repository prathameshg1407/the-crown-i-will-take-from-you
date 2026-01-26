// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Cinzel, Cormorant_Garamond, Lato } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "react-hot-toast";
import UserMenuFixed from "@/components/auth/UserMenu";
import Script from "next/script";
import RazorpayLoader from "@/components/RazorpayLoader";
import PayPalProvider from "@/components/providers/PayPalProvider";
import { SpeedInsights } from "@vercel/speed-insights/next"; // Add this import
import { Analytics } from "@vercel/analytics/react";


const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const uiFont = Lato({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-ui",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  // Basic Metadata
  title: {
    default: "The Crown I Will Take From You | Korean Fantasy Web Novel",
    template: "%s | The Crown I Will Take From You",
  },
  description:
    "Read 'The Crown I Will Take From You' (너에게 빼앗을 왕관) - An epic Korean fantasy regression revenge romance web novel. Follow Medea's journey of betrayal, time travel, and ultimate revenge. English translation available.",
  keywords: [
    "The Crown I Will Take From You",
    "너에게 빼앗을 왕관",
    "Korean web novel",
    "fantasy web novel",
    "regression novel",
    "revenge romance",
    "isekai",
    "light novel",
    "web novel translation",
    "English translation",
    "Medea",
    "Wilbright",
    "fantasy romance",
    "Korean manhwa",
    "time travel romance",
    "villainess novel",
    "female lead revenge",
  ],
  authors: [
    { name: "Wilbright (윌브라이트)", url: siteUrl },
  ],
  creator: "Wilbright",
  publisher: "Your Site Name",
  
  // Canonical & Alternate
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en",
      "ko-KR": "/ko",
    },
  },
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR"],
    url: siteUrl,
    siteName: "The Crown I Will Take From You",
    title: "The Crown I Will Take From You | Korean Fantasy Web Novel",
    description:
      "An epic Korean fantasy regression revenge romance web novel. Follow Medea's journey of betrayal, time travel, and ultimate revenge.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "The Crown I Will Take From You - Korean Fantasy Web Novel Cover",
        type: "image/jpeg",
      },
      {
        url: "/og-image-square.jpg",
        width: 1200,
        height: 1200,
        alt: "The Crown I Will Take From You Cover Art",
        type: "image/jpeg",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@yourtwitter",
    creator: "@yourtwitter",
    title: "The Crown I Will Take From You | Korean Fantasy Web Novel",
    description:
      "An epic Korean fantasy regression revenge romance web novel. Follow Medea's journey of betrayal, time travel, and ultimate revenge.",
    images: ["/twitter-image.jpg"],
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Verification (add your actual verification codes)
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
    other: {
      "msvalidate.01": "your-bing-verification-code",
      "facebook-domain-verification": "your-facebook-verification",
    },
  },
  
  // App Links
  appLinks: {
    web: {
      url: siteUrl,
      should_fallback: true,
    },
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#9f1239",
      },
    ],
  },
  
  // Manifest
  manifest: "/manifest.json",
  
  // Category
  category: "literature",
  
  // Other
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Crown Novel",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#9f1239",
    "msapplication-config": "/browserconfig.xml",
    "format-detection": "telephone=no",
  },
};

// JSON-LD Structured Data
const jsonLd = {
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
      potentialAction: [
        {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      ],
      inLanguage: "en-US",
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "The Crown I Will Take From You",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        inLanguage: "en-US",
        "@id": `${siteUrl}/#logo`,
        url: `${siteUrl}/logo.png`,
        contentUrl: `${siteUrl}/logo.png`,
        width: 512,
        height: 512,
        caption: "The Crown I Will Take From You",
      },
      image: { "@id": `${siteUrl}/#logo` },
      sameAs: [
        "https://twitter.com/yourtwitter",
        "https://www.instagram.com/yourinstagram",
        "https://www.facebook.com/yourfacebook",
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
      genre: ["Fantasy", "Romance", "Regression", "Revenge"],
      inLanguage: ["ko", "en"],
      datePublished: "2024",
      publisher: {
        "@type": "Organization",
        name: "Your Site Name",
      },
      description:
        "An epic Korean fantasy regression revenge romance web novel. Follow Medea's journey of betrayal, time travel, and ultimate revenge.",
      image: `${siteUrl}/img1.jpg`,
      url: siteUrl,
      workExample: {
        "@type": "Book",
        bookFormat: "https://schema.org/EBook",
        inLanguage: "en",
        url: `${siteUrl}/chapters`,
      },
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
        {
          "@type": "ListItem",
          position: 2,
          name: "Chapters",
          item: `${siteUrl}/chapters`,
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${uiFont.variable} scroll-smooth`}
    >
      <head>
        {/* Preconnect to important domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://www.paypal.com" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* Razorpay Checkout */}
        <Script 
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased">
        <RazorpayLoader />
        <AuthProvider>
          <PayPalProvider>
            <UserMenuFixed />
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#9f1239] focus:text-white focus:rounded"
            >
              Skip to main content
            </a>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #333',
                },
                success: {
                  duration: 6000,
                  iconTheme: {
                    primary: '#9f1239',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
                loading: {
                  iconTheme: {
                    primary: '#9f1239',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </PayPalProvider>
        </AuthProvider>
        <SpeedInsights />
        <Analytics />


      </body>
    </html>
  );
}