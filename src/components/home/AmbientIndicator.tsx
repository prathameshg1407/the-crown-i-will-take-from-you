// components/home/AmbientIndicator.tsx
"use client";

import { useEffect, useState } from "react";

export default function AmbientIndicator() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay render until after initial paint (improves INP/FID)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <aside
      className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-neutral-900/95 px-5 py-3 rounded-full border border-white/10 shadow-lg animate-fade-in"
      aria-label="Content tags"
    >
      <div className="flex gap-1 h-3 items-end" aria-hidden="true">
        <div className="w-1 bg-red-500 h-2 rounded-full opacity-75" />
        <div className="w-1 bg-red-500 h-3 rounded-full" />
        <div className="w-1 bg-red-500 h-1 rounded-full opacity-50" />
      </div>
      <span className="text-[10px] font-ui text-neutral-400 uppercase tracking-[0.3em] font-light">
        Fantasy • Regression
      </span>
    </aside>
  );
}