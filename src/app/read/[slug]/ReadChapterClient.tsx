// app/read/[slug]/ReadChapterClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isChapterLocked } from "@/data/chapters";
import { useAuth } from "@/lib/auth/AuthContext";
import dynamic from "next/dynamic";

const ChapterReader = dynamic(() => import("@/components/ChapterReader"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-neutral-400 text-xl font-ui animate-pulse">
        Loading chapter...
      </div>
    </div>
  ),
});

interface ReadChapterClientProps {
  slug: string;
  chapter: {
    id: number;
    slug: string;
    title: string;
  };
}

export default function ReadChapterClient({ slug, chapter }: ReadChapterClientProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const userTier = user?.tier || "free";
  const ownedChapters = user?.ownedChapters || [];

  const [accessState, setAccessState] = useState<"loading" | "granted" | "denied">("loading");

  useEffect(() => {
    if (authLoading) {
      setAccessState("loading");
      return;
    }

    const locked = isChapterLocked(chapter.id, userTier, ownedChapters);
    
    if (locked) {
      setAccessState("denied");
      // Redirect after a brief moment to show the message
      const timer = setTimeout(() => {
        router.replace("/#pricing");
      }, 100);
      return () => clearTimeout(timer);
    }

    setAccessState("granted");
  }, [chapter.id, userTier, ownedChapters, authLoading, router]);

  if (accessState === "loading" || authLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-xl font-ui animate-pulse">
          Checking access...
        </div>
      </div>
    );
  }

  if (accessState === "denied") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-xl font-ui animate-pulse">
          Redirecting to pricing...
        </div>
      </div>
    );
  }

  return (
    <main id="main-content">
      <ChapterReader
        chapterSlug={slug}
        userTier={userTier}
        ownedChapters={ownedChapters}
        onClose={() => router.push("/#chapters")}
        onNavigate={(nextSlug) => router.push(`/read/${nextSlug}`)}
      />
    </main>
  );
}