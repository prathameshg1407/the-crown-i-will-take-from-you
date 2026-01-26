// components/home/AmbientIndicatorWrapper.tsx
"use client";

import dynamic from "next/dynamic";

// Now we can use ssr: false inside a Client Component
const AmbientIndicator = dynamic(
  () => import("@/components/home/AmbientIndicator"),
  { ssr: false }
);

export default function AmbientIndicatorWrapper() {
  return <AmbientIndicator />;
}