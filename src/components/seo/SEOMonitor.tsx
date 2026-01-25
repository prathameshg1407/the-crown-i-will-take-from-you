// components/seo/SEOMonitor.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

interface SEOMonitorProps {
  gaId?: string;
}

function SEOMonitorInner({ gaId }: SEOMonitorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId) return;
    
    // Track page views
    if (window.gtag) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      window.gtag("config", gaId, {
        page_path: url,
      });
    }
  }, [pathname, searchParams, gaId]);

  return null;
}

export default function SEOMonitor({ gaId }: SEOMonitorProps) {
  return (
    <Suspense fallback={null}>
      <SEOMonitorInner gaId={gaId} />
    </Suspense>
  );
}