// src/app/read/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { chapters, isChapterLocked } from "@/data/chapters";
import { useAuth } from "@/lib/auth/AuthContext";
import dynamic from "next/dynamic";

const ChapterReader = dynamic(() => import("@/components/ChapterReader"), {
  ssr: false,
});

export default function ReadChapterPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const { user } = useAuth();
  const userTier = user?.tier || "free";
  const ownedChapters = user?.ownedChapters || [];

  const [canOpen, setCanOpen] = useState(false);

  useEffect(() => {
    const chapter = chapters.find((ch) => ch.slug === slug);
    if (!chapter) {
      // Invalid slug -> go home
      router.replace("/");
      return;
    }

    const locked = isChapterLocked(chapter.id, userTier, ownedChapters);
    if (locked) {
      // Locked chapter -> send to pricing section
      router.replace("/#pricing");
      return;
    }

    setCanOpen(true);
  }, [slug, router, userTier, ownedChapters]);

  if (!canOpen) {
    return null; // or a loader if you prefer
  }

  return (
    <ChapterReader
      chapterSlug={slug}
      userTier={userTier}
      ownedChapters={ownedChapters}
      onClose={() => router.push("/#chapters")}
      onNavigate={(nextSlug) => router.push(`/read/${nextSlug}`)}
    />
  );
}