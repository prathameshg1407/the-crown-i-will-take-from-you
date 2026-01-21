// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Cinzel, Cormorant_Garamond, Lato } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "react-hot-toast";
import UserMenuFixed from "@/components/auth/UserMenu";
import Script from "next/script";
import RazorpayLoader from "@/components/RazorpayLoader";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-heading",
});

const bodyFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
});

const uiFont = Lato({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "The Crown I Will Take From You",
  description: "Fantasy regression revenge web novel showcase.",
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
        {/* Razorpay Checkout - Load eagerly for better UX */}
        <Script 
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased">
        <RazorpayLoader />
        <AuthProvider>
          <UserMenuFixed />
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
        </AuthProvider>
      </body>
    </html>
  );
}