// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Keep server features for auth, but optimize static parts
  compress: true,
  reactStrictMode: true,

  // Optimize package imports (still experimental)
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "react-hot-toast",
    ],
  },

  // Performance headers
  async headers() {
    return [
      {
        source: "/chapters/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // If you want to explicitly silence the Turbopack/webpack warning without
  // touching tooling, you can add a minimal turbopack config object:
  // turbopack: {}
};

export default nextConfig;
