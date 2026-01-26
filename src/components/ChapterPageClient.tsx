// app/read/[slug]/ChapterPageClient.tsx
"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { chapters, isChapterLocked } from "@/data/chapters"
import { useAuth } from "@/lib/auth/AuthContext"
import dynamic from "next/dynamic"
import { Loader2, Lock, AlertCircle } from "lucide-react"

const ChapterReader = dynamic(() => import("@/components/ChapterReader"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[100]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#9f1239] animate-spin mx-auto mb-3" />
        <p className="text-neutral-400 text-sm font-ui animate-pulse">Loading chapter...</p>
      </div>
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

type AccessState = "loading" | "checking" | "granted" | "denied" | "error"

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

  const [accessState, setAccessState] = useState<AccessState>("loading")
  const [redirecting, setRedirecting] = useState(false)

  const chapter = useMemo(() => chapters.find((ch) => ch.slug === slug), [slug])

  // Memoize lock status
  const isCurrentlyLocked = useMemo(() => {
    if (!chapter) return true
    return isChapterLocked(chapter.id, userTier, ownedChapters)
  }, [chapter, userTier, ownedChapters])

  // Handle navigation with smooth transition
  const handleClose = useCallback(() => {
    setRedirecting(true)
    router.push("/#chapters")
  }, [router])

  const handleNavigate = useCallback((nextSlug: string) => {
    setRedirecting(true)
    router.push(`/read/${nextSlug}`)
  }, [router])

  const handleReturnHome = useCallback(() => {
    setRedirecting(true)
    router.push("/")
  }, [router])

  const handleViewPricing = useCallback(() => {
    setRedirecting(true)
    router.push("/#pricing")
  }, [router])

  // Access control logic
  useEffect(() => {
    if (authLoading) {
      setAccessState("loading")
      return
    }

    if (!chapter) {
      setAccessState("error")
      setTimeout(() => {
        setRedirecting(true)
        router.replace("/")
      }, 1500)
      return
    }

    setAccessState("checking")

    // Small delay for smooth UX
    const timer = setTimeout(() => {
      if (isCurrentlyLocked) {
        setAccessState("denied")
        setTimeout(() => {
          setRedirecting(true)
          router.replace("/#pricing")
        }, 2000)
      } else {
        setAccessState("granted")
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [chapter, isCurrentlyLocked, authLoading, router])

  // Loading state - Authentication check
  if (authLoading || accessState === "loading") {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[100]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#9f1239] animate-spin mx-auto mb-3" />
          <p className="text-neutral-400 text-sm font-ui animate-pulse">
            Authenticating...
          </p>
        </div>
      </div>
    )
  }

  // Checking access state
  if (accessState === "checking") {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[100]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#9f1239] animate-spin mx-auto mb-3" />
          <p className="text-neutral-400 text-sm font-ui animate-pulse">
            Verifying access...
          </p>
        </div>
      </div>
    )
  }

  // Error state - Chapter not found
  if (accessState === "error") {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[100] px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-900/20 border border-red-800/50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-heading text-neutral-100 mb-3">
            Chapter Not Found
          </h1>
          <p className="text-neutral-400 font-body mb-6 text-sm">
            {redirecting ? "Redirecting to home..." : "The chapter you're looking for doesn't exist."}
          </p>
          {!redirecting && (
            <button
              onClick={handleReturnHome}
              className="px-6 py-2.5 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-wider hover:bg-[#881337] transition-colors"
            >
              Return Home
            </button>
          )}
        </div>
      </div>
    )
  }

  // Denied state - Locked chapter
  if (accessState === "denied") {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[100] px-6">
        <div className="max-w-md w-full text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-900/20 to-purple-900/20 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
              <Lock className="w-9 h-9 text-neutral-400" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-heading text-neutral-100 mb-3">
            {chapterNumber}: {chapterTitle}
          </h1>

          <p className="text-neutral-400 font-body mb-6">
            {redirecting 
              ? "Redirecting to unlock options..." 
              : "This chapter is locked. Please upgrade to continue reading."
            }
          </p>

          {!redirecting && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleViewPricing}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-wider hover:from-red-500 hover:to-red-700 transition-all duration-300"
              >
                Unlock Now
              </button>
              <button
                onClick={handleReturnHome}
                className="px-6 py-2.5 bg-neutral-800 text-neutral-300 rounded-lg font-heading text-sm tracking-wider hover:bg-neutral-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Granted state - Show reader
  if (accessState === "granted") {
    return (
      <ChapterReader
        chapterSlug={slug}
        userTier={userTier}
        ownedChapters={ownedChapters}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    )
  }

  // Fallback (should never reach here)
  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center z-[100]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#9f1239] animate-spin mx-auto mb-3" />
        <p className="text-neutral-400 text-sm font-ui animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  )
}