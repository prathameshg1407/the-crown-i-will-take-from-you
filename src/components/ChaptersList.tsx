// components/ChaptersList.tsx
"use client"

import { useState, useCallback, useEffect, useMemo, memo } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { chapters, isChapterLocked, PRICING } from "@/data/chapters"
import type { Chapter } from "@/data/chapters"
import { Lock, ChevronDown, ChevronUp, BookOpen, Sparkles, Crown, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthContext"

const ChapterReader = dynamic(() => import("./ChapterReader"), { ssr: false })

// ============================================================================
// Types
// ============================================================================

interface ChapterGroupProps {
  title: string
  description: string
  chaptersList: Chapter[]
  userTier: "free" | "complete"
  ownedChapters: number[]
  router: ReturnType<typeof useRouter>
  defaultExpanded?: boolean
  accentColor?: "green" | "blue" | "purple" | "amber" | "red"
}

interface ChapterItemProps {
  chapter: Chapter
  locked: boolean
  colorScheme: {
    accent: string
    number: string
  }
  onClick: () => void
}

// ============================================================================
// Chapter Item Component (Memoized)
// ============================================================================

const ChapterItem = memo(function ChapterItem({ 
  chapter, 
  locked, 
  colorScheme, 
  onClick 
}: ChapterItemProps) {
  const badgeLabel = chapter.id === 0 ? "P" : String(chapter.id)

  return (
    <button
      onClick={onClick}
      aria-disabled={locked}
      aria-label={`${chapter.number}: ${chapter.title}${locked ? ' (locked)' : ''}`}
      className={`w-full text-left group border-b border-neutral-800/30 last:border-b-0 p-4 transition-all duration-200 ${
        locked 
          ? "bg-neutral-900/30 hover:bg-neutral-900/50 cursor-pointer" 
          : "hover:bg-neutral-800/40 active:scale-[0.99]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Chapter Number Badge */}
          <div
            className={`flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-heading text-sm border transition-all duration-200 ${
              locked
                ? "bg-neutral-900/60 border-neutral-700 text-neutral-600"
                : `${colorScheme.number} group-hover:scale-105 group-hover:shadow-lg`
            }`}
            aria-hidden="true"
          >
            {badgeLabel}
          </div>

          {/* Chapter Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-ui tracking-[0.3em] uppercase text-neutral-600 mb-1">
              {chapter.number}
            </div>
            <h4
              className={`text-sm md:text-base font-heading truncate transition-colors ${
                locked ? "text-neutral-500" : "text-neutral-200 group-hover:text-white"
              }`}
            >
              {chapter.title}
            </h4>
          </div>
        </div>

        {/* Status Icon */}
        <div className="flex-shrink-0">
          {locked ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/60 rounded-full border border-neutral-700/50">
              <Lock className="w-3 h-3 text-neutral-500" aria-hidden="true" />
              <span className="text-[9px] font-ui text-neutral-500 tracking-wider uppercase hidden sm:inline">
                Locked
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-neutral-700/50 transition-colors">
              <svg
                className="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  )
})

// ============================================================================
// Chapter Group Component (Memoized)
// ============================================================================

const ChapterGroup = memo(function ChapterGroup({
  title,
  description,
  chaptersList,
  userTier,
  ownedChapters,
  router,
  defaultExpanded = false,
  accentColor = "red",
}: ChapterGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const colors = {
    green: {
      accent: "border-l-green-600",
      number: "bg-green-900/20 border-green-800/40 text-green-500",
    },
    blue: {
      accent: "border-l-blue-600",
      number: "bg-blue-900/20 border-blue-800/40 text-blue-500",
    },
    purple: {
      accent: "border-l-purple-600",
      number: "bg-purple-900/20 border-purple-800/40 text-purple-500",
    },
    amber: {
      accent: "border-l-amber-600",
      number: "bg-amber-900/20 border-amber-800/40 text-amber-500",
    },
    red: {
      accent: "border-l-red-600",
      number: "bg-[#9f1239]/10 border-[#9f1239]/30 text-[#9f1239]",
    },
  }

  const colorScheme = colors[accentColor]

  const handleChapterClick = useCallback((chapter: Chapter, locked: boolean) => {
    if (locked) {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
    } else {
      router.push(`/read/${chapter.slug}`)
    }
  }, [router])

  return (
    <div
      className={`border border-neutral-800/60 rounded-xl overflow-hidden bg-neutral-900/20 reveal border-l-4 ${colorScheme.accent}`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 md:p-6 flex items-center justify-between hover:bg-neutral-900/40 transition-colors text-left active:scale-[0.99]"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-xl md:text-2xl font-heading text-neutral-100">{title}</h3>
            <span className="text-neutral-600 text-sm font-ui">({chaptersList.length} chapters)</span>
          </div>
          <p className="text-sm text-neutral-500 font-body">{description}</p>
        </div>

        <div className="flex-shrink-0 ml-4 p-2 rounded-full hover:bg-neutral-800/50 transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Chapters List */}
      {isExpanded && (
        <div className="border-t border-neutral-800/60 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {chaptersList.map((chapter) => {
            const locked = isChapterLocked(chapter.id, userTier, ownedChapters)
            return (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                locked={locked}
                colorScheme={colorScheme}
                onClick={() => handleChapterClick(chapter, locked)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
})

// ============================================================================
// Main Chapters List Component
// ============================================================================

export default function ChaptersList() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [activeChapter, setActiveChapter] = useState<string | null>(null)
  const router = useRouter()

  // Wait for client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Use default values during SSR, real values after mount
  const userTier = mounted ? (user?.tier || "free") : "free"
  const ownedChapters = mounted ? (user?.ownedChapters || []) : []

  // Sync with URL on mount
  useEffect(() => {
    if (!mounted) return
    
    const path = window.location.pathname
    if (path.startsWith("/read/")) {
      const slug = path.replace("/read/", "")
      const chapter = chapters.find((ch) => ch.slug === slug)
      if (chapter && !isChapterLocked(chapter.id, userTier, ownedChapters)) {
        setActiveChapter(slug)
      }
    }
  }, [mounted, userTier, ownedChapters])

  const handleCloseReader = useCallback(() => {
    setActiveChapter(null)
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/#chapters")
    }
  }, [])

  const handleNavigateChapter = useCallback((slug: string) => {
    setActiveChapter(slug)
  }, [])

  // Memoized calculations
  const stats = useMemo(() => {
    const freeCount = PRICING.FREE_CHAPTERS + 1
    const premiumCount = chapters.length - freeCount
    const accessibleCount = chapters.filter((ch) =>
      !isChapterLocked(ch.id, userTier, ownedChapters)
    ).length

    return { freeCount, premiumCount, accessibleCount, readCount: 0 }
  }, [userTier, ownedChapters])

  const chapterGroups = useMemo(() => ({
    free: chapters.filter((ch) => ch.id <= PRICING.FREE_CHAPTERS),
    premium: chapters.filter((ch) => ch.id > PRICING.FREE_CHAPTERS),
  }), [])

  // User tier display - only render after mount to prevent hydration mismatch
  const tierBadge = useMemo(() => {
    // Don't render user-specific content until mounted
    if (!mounted || !user) return null

    if (userTier === "complete") {
      return (
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-800/50 rounded-lg">
          <Crown className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <p className="text-amber-400 font-ui text-sm uppercase tracking-wider">
            Complete Pack • All {chapters.length} Chapters
          </p>
        </div>
      )
    }

    if (ownedChapters.length > 0) {
      return (
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <Sparkles className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <p className="text-blue-400 font-ui text-sm uppercase tracking-wider">
            {stats.freeCount + ownedChapters.length} Chapters Available
          </p>
        </div>
      )
    }

    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-800/50 rounded-lg">
        <CheckCircle2 className="w-4 h-4 text-green-500" aria-hidden="true" />
        <p className="text-green-400 font-ui text-sm uppercase tracking-wider">
          {stats.freeCount} Free Chapters
        </p>
      </div>
    )
  }, [mounted, user, userTier, ownedChapters, stats.freeCount])

  return (
    <>
      <section id="chapters" className="max-w-4xl mx-auto px-6 md:px-8 py-20">
        {/* Section Header */}
        <div className="mb-12 reveal">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-[#9f1239]" aria-hidden="true" />
            <h2 className="text-4xl md:text-5xl font-heading text-neutral-100">
              All Chapters
            </h2>
          </div>
          <p className="text-neutral-500 font-body text-lg">
            {chapters.length} total chapters • {stats.freeCount} free • {stats.premiumCount} premium
          </p>
          {tierBadge}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 reveal">
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-4 text-center hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-[#9f1239]">{chapters.length}</div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider mt-1">Total</div>
          </div>
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-4 text-center hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-green-500">{stats.freeCount}</div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider mt-1">Free</div>
          </div>
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-4 text-center hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-blue-500">{stats.accessibleCount}</div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider mt-1">Available</div>
          </div>
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-4 text-center hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-purple-500">{stats.readCount}</div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider mt-1">Read</div>
          </div>
        </div>

        {/* Chapter Groups */}
        <div className="space-y-6">
          <ChapterGroup
            title="Free Chapters"
            description="Prologue through Chapter 80"
            chaptersList={chapterGroups.free}
            userTier={userTier}
            ownedChapters={ownedChapters}
            router={router}
            defaultExpanded={true}
            accentColor="green"
          />

          <ChapterGroup
            title="Premium Chapters"
            description={`Chapters 81-${PRICING.MAX_CHAPTER_ID} • Complete Story Pack`}
            chaptersList={chapterGroups.premium}
            userTier={userTier}
            ownedChapters={ownedChapters}
            router={router}
            accentColor="amber"
          />
        </div>

        {/* CTA for locked users */}
        {userTier !== "complete" && stats.premiumCount > 0 && (
          <div className="mt-12 p-6 bg-gradient-to-r from-neutral-900/60 to-neutral-900/40 border border-neutral-800/60 rounded-xl text-center reveal">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl font-heading text-neutral-100 mb-2">
              Unlock the Complete Story
            </h3>
            <p className="text-neutral-400 font-body mb-4 text-sm">
              Get instant access to all {stats.premiumCount} premium chapters with the Complete Pack
            </p>
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-wider hover:from-red-500 hover:to-red-700 transition-all duration-300 active:scale-95"
            >
              View Pricing Plans
            </button>
          </div>
        )}
      </section>

      {/* Chapter Reader Modal */}
      {activeChapter && (
        <ChapterReader
          chapterSlug={activeChapter}
          userTier={userTier}
          ownedChapters={ownedChapters}
          onClose={handleCloseReader}
          onNavigate={handleNavigateChapter}
        />
      )}
    </>
  )
}