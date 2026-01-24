// app/read/[slug]/page.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { chapters, isChapterLocked } from "@/data/chapters"
import { useAuth } from "@/lib/auth/AuthContext"
import dynamic from "next/dynamic"

// Lazy load ChapterReader
const ChapterReader = dynamic(() => import("@/components/ChapterReader"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-neutral-400 text-xl font-ui animate-pulse">Loading chapter...</div>
    </div>
  ),
})

export default function ReadChapterPage() {
  const router = useRouter()
  const params = useParams()
  const slug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string | undefined)

  const { user, isLoading: authLoading } = useAuth()
  const userTier = user?.tier || "free"
  const ownedChapters = user?.ownedChapters || []

  const [canOpen, setCanOpen] = useState(false)

  // Memoize chapter lookup
  const chapter = useMemo(() => chapters.find((ch) => ch.slug === slug), [slug])

  useEffect(() => {
    let mounted = true
    setCanOpen(false)

    // Wait for auth
    if (authLoading) return

    // Invalid slug -> home
    if (!chapter) {
      router.replace("/")
      return
    }

    // Locked -> pricing
    const locked = isChapterLocked(chapter.id, userTier, ownedChapters)
    if (locked) {
      router.replace("/#pricing")
      return
    }

    // All good
    if (mounted) setCanOpen(true)

    return () => {
      mounted = false
    }
  }, [chapter, userTier, ownedChapters, authLoading, router])

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-xl font-ui animate-pulse">Checking authentication...</div>
      </div>
    )
  }

  if (!canOpen) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-xl font-ui animate-pulse">Checking access...</div>
      </div>
    )
  }

  return (
    <ChapterReader
      chapterSlug={slug!}
      userTier={userTier}
      ownedChapters={ownedChapters}
      onClose={() => router.push("/#chapters")}
      onNavigate={(nextSlug) => router.push(`/read/${nextSlug}`)}
    />
  )
}