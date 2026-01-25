// app/read/[slug]/ChapterPageClient.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { chapters, isChapterLocked } from "@/data/chapters"
import { useAuth } from "@/lib/auth/AuthContext"
import dynamic from "next/dynamic"

const ChapterReader = dynamic(() => import("@/components/ChapterReader"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-neutral-400 text-xl font-ui animate-pulse">Loading chapter...</div>
    </div>
  ),
})

interface ChapterPageClientProps {
  slug: string
  chapterId: number
  chapterTitle: string
  chapterNumber: string
  isLocked: boolean
}

export default function ChapterPageClient({ 
  slug, 
  chapterId, 
  chapterTitle, 
  chapterNumber,
  isLocked: defaultLocked 
}: ChapterPageClientProps) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const userTier = user?.tier || "free"
  const ownedChapters = user?.ownedChapters || []

  const [canOpen, setCanOpen] = useState(false)

  const chapter = useMemo(() => chapters.find((ch) => ch.slug === slug), [slug])

  useEffect(() => {
    if (authLoading) return

    if (!chapter) {
      router.replace("/")
      return
    }

    const locked = isChapterLocked(chapter.id, userTier, ownedChapters)
    if (locked) {
      router.replace("/#pricing")
      return
    }

    setCanOpen(true)
  }, [chapter, userTier, ownedChapters, authLoading, router])

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-xl font-ui animate-pulse">
          Checking authentication...
        </div>
      </div>
    )
  }

  if (!canOpen) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-xl font-ui animate-pulse">
          Checking access...
        </div>
      </div>
    )
  }

  return (
    <ChapterReader
      chapterSlug={slug}
      userTier={userTier}
      ownedChapters={ownedChapters}
      onClose={() => router.push("/#chapters")}
      onNavigate={(nextSlug) => router.push(`/read/${nextSlug}`)}
    />
  )
}