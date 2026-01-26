"use client"

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react"
import { createPortal } from "react-dom"
import { chapters, isChapterLocked, PRICING } from "@/data"
import {
  X,
  ArrowLeft,
  ArrowRight,
  Lock,
  Loader2,
  Crown,
  BookOpen,
  Sparkles,
  Zap,
  Menu,
  Check,
  Maximize2,
  Minimize2,
  Type
} from "lucide-react"
import { useRazorpay } from "@/lib/razorpay/hooks"

// ============================================================================
// Types
// ============================================================================

interface ChapterReaderProps {
  chapterSlug: string
  userTier: 'free' | 'complete'
  ownedChapters: number[]
  onClose: () => void
  onNavigate: (slug: string) => void
}

interface LockedScreenProps {
  onUnlock: () => void
  isProcessing: boolean
  onClose: () => void
}

interface ErrorScreenProps {
  onRetry: () => void
  onClose: () => void
}

interface ChapterListSidebarProps {
  isOpen: boolean
  onClose: () => void
  currentChapterSlug: string
  userTier: 'free' | 'complete'
  ownedChapters: number[]
  onNavigate: (slug: string) => void
}

interface ChapterListItemProps {
  chapter: Chapter
  isActive: boolean
  isLocked: boolean
  onNavigate: (slug: string) => void
  onClose: () => void
}

type Chapter = typeof chapters[number]
type FontSize = "small" | "medium" | "large"

// ============================================================================
// Constants
// ============================================================================
const LOAD_TIMEOUT_MS = 15000
const FOCUSABLE_ELEMENTS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * STRATEGY FOR ALIGNMENT:
 * 1. Parent containers (Header/Footer/Main) must be flex-col with items-center.
 * 2. Inner "Width Guards" must have the same Max-Width.
 * 3. Iframe body must have box-sizing: border-box and identical padding to the Header.
 */
const CONTENT_MAX_WIDTH = "42rem" 

const CONTENT_PADDING = {
  mobile: "px-6",   // 1.5rem
  desktop: "sm:px-8" // 2rem
}

const FONT_CONFIG = {
  small: { prose: "1.18rem", line: "2.1", drop: "4.2rem", scream: "5.8rem" },
  medium: { prose: "1.35rem", line: "2.3", drop: "5rem", scream: "7rem" },
  large: { prose: "1.55rem", line: "2.5", drop: "5.8rem", scream: "8.5rem" }
}

// ============================================================================
// Utility Hooks
// ============================================================================

function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const previouslyFocused = document.activeElement as HTMLElement | null
    firstElement?.focus()

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)

    return () => {
      container.removeEventListener('keydown', handleTabKey)
      previouslyFocused?.focus()
    }
  }, [containerRef, isActive])
}

function useModalHistory(isOpen: boolean, onClose: () => void) {
  const hasAddedHistoryRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    if (!hasAddedHistoryRef.current) {
      window.history.pushState({ modal: 'chapter-reader' }, '')
      hasAddedHistoryRef.current = true
    }

    const handlePopState = () => {
      onClose()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (hasAddedHistoryRef.current && window.history.state?.modal === 'chapter-reader') {
        window.history.back()
      }
      hasAddedHistoryRef.current = false
    }
  }, [isOpen, onClose])
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// ============================================================================
// Sub-components
// ============================================================================

const ChapterListItem = memo(function ChapterListItem({
  chapter,
  isActive,
  isLocked,
  onNavigate,
  onClose
}: ChapterListItemProps) {
  const handleClick = useCallback(() => {
    if (!isLocked) {
      onNavigate(chapter.slug)
      onClose()
    }
  }, [chapter.slug, isLocked, onNavigate, onClose])

  return (
    <button
      onClick={handleClick}
      disabled={isLocked}
      className={`
        w-full text-left px-4 py-3 rounded-lg transition-all duration-200
        ${isActive
          ? 'bg-[#9f1239]/20 border border-[#9f1239]/40 text-white'
          : isLocked
            ? 'bg-neutral-900/30 border border-neutral-800/30 text-neutral-600 cursor-not-allowed'
            : 'bg-neutral-900/50 border border-neutral-800/50 text-neutral-300 hover:bg-neutral-800/70 hover:border-neutral-700 hover:text-white'
        }
        active:scale-[0.98]
      `}
      aria-label={`${chapter.number}: ${chapter.title}${isLocked ? ' (locked)' : ''}${isActive ? ' (current)' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              text-[9px] font-ui tracking-wider uppercase
              ${isActive ? 'text-[#9f1239]' : 'text-neutral-500'}
            `}>
              {chapter.number}
            </span>
            {isActive && (
              <Check className="w-3 h-3 text-[#9f1239]" aria-hidden="true" />
            )}
          </div>
          <h3 className="text-sm font-heading leading-tight truncate">
            {chapter.title}
          </h3>
        </div>

        <div className="flex-shrink-0 pt-0.5">
          {isLocked ? (
            <div className="w-5 h-5 rounded-full bg-neutral-800/50 flex items-center justify-center">
              <Lock className="w-3 h-3 text-neutral-600" aria-hidden="true" />
            </div>
          ) : isActive ? (
            <div className="w-5 h-5 rounded-full bg-[#9f1239]/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#9f1239]" aria-hidden="true" />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  )
})

const ChapterListSidebar = memo(function ChapterListSidebar({
  isOpen,
  onClose,
  currentChapterSlug,
  userTier,
  ownedChapters,
  onNavigate
}: ChapterListSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  useFocusTrap(sidebarRef, isOpen)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const { freeChapters, lockedChapters } = useMemo(() => {
    const free: Chapter[] = []
    const locked: Chapter[] = []

    chapters.forEach(chapter => {
      if (isChapterLocked(chapter.id, userTier, ownedChapters)) {
        locked.push(chapter)
      } else {
        free.push(chapter)
      }
    })

    return { freeChapters: free, lockedChapters: locked }
  }, [userTier, ownedChapters])

  if (!isOpen) return null

  const sidebarContent = (
    <>
      {!isDesktop && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 right-0 h-full w-full sm:w-96 bg-black border-l border-neutral-800
          z-[111] flex flex-col
          ${isDesktop ? 'lg:w-80' : ''}
        `}
        role="complementary"
        aria-label="Chapter list"
      >
        <header className="flex-shrink-0 px-5 py-4 border-b border-neutral-800/50 bg-neutral-950/50 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9f1239] to-[#7f1d1d] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-base font-heading text-white tracking-wide">
                Chapters
              </h2>
            </div>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors p-1.5 -mr-1.5 rounded-lg hover:bg-neutral-800/50"
              aria-label="Close chapter list"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-ui">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <div className="w-2 h-2 rounded-full bg-green-500/50" aria-hidden="true" />
              <span>{freeChapters.length} unlocked</span>
            </div>
            {lockedChapters.length > 0 && (
              <div className="flex items-center gap-1.5 text-neutral-600">
                <Lock className="w-3 h-3" aria-hidden="true" />
                <span>{lockedChapters.length} locked</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="space-y-2">
            {freeChapters.map((chapter) => (
              <ChapterListItem
                key={chapter.id}
                chapter={chapter}
                isActive={chapter.slug === currentChapterSlug}
                isLocked={false}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            ))}

            {lockedChapters.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-1">
                  <div className="flex items-center gap-2 text-xs font-ui tracking-wider uppercase text-neutral-600">
                    <Crown className="w-3.5 h-3.5 text-[#9f1239]/50" aria-hidden="true" />
                    <span>Premium Chapters</span>
                  </div>
                </div>

                {lockedChapters.map((chapter) => (
                  <ChapterListItem
                    key={chapter.id}
                    chapter={chapter}
                    isActive={chapter.slug === currentChapterSlug}
                    isLocked={true}
                    onNavigate={onNavigate}
                    onClose={onClose}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {lockedChapters.length > 0 && (
          <footer className="flex-shrink-0 p-4 border-t border-neutral-800/50 bg-neutral-950/50">
            <button
              onClick={() => {
                onClose()
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
                  }, 100)
                })
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-wider hover:from-red-500 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-red-900/20 active:scale-[0.98]"
            >
              <Crown className="w-4 h-4" aria-hidden="true" />
              <span>Unlock All Chapters</span>
            </button>
          </footer>
        )}
      </aside>
    </>
  )

  return createPortal(sidebarContent, document.body)
})

const LockedScreen = memo(function LockedScreen({
  onUnlock,
  isProcessing,
  onClose
}: LockedScreenProps) {
  const handleViewPlans = useCallback(() => {
    onClose()
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    })
  }, [onClose])

  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 py-12 overflow-y-auto">
      <div className="max-w-lg w-full" role="region" aria-labelledby="locked-title">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-900/20 to-purple-900/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
            <Lock className="w-9 h-9 text-neutral-400" aria-hidden="true" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#9f1239] animate-pulse" aria-hidden="true" />
        </div>

        <div className="text-center mb-6">
          <h2
            id="locked-title"
            className="text-2xl md:text-3xl font-heading text-neutral-100 mb-3 leading-tight"
          >
            Premium Chapter
          </h2>

          <p className="text-neutral-400 font-body mb-2">
            Unlock with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 font-heading font-semibold">
              Complete Pack
            </span>
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900/40 border border-neutral-800/60 rounded-full">
            <Zap className="w-3.5 h-3.5 text-[#9f1239]" aria-hidden="true" />
            <span className="text-neutral-500 text-xs font-body">
              {PRICING.COMPLETE_PACK.chapters} chapters • ₹{PRICING.COMPLETE_PACK.price}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 mb-6">
          <button
            onClick={onUnlock}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl font-heading tracking-wider hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 uppercase text-sm flex items-center justify-center gap-2.5 shadow-lg hover:shadow-red-900/20 active:scale-[0.98] group"
            aria-busy={isProcessing}
          >
            {isProcessing ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 group-hover:rotate-12 transition-transform" aria-hidden="true" />
                <span>Unlock Complete Access</span>
              </>
            )}
          </button>

          <button
            onClick={handleViewPlans}
            className="w-full px-6 py-3 bg-transparent border-2 border-neutral-700 text-neutral-300 rounded-xl font-heading tracking-wider hover:bg-neutral-800/50 hover:border-neutral-600 hover:text-white transition-all duration-300 text-sm uppercase active:scale-[0.98]"
          >
            Compare All Plans
          </button>
        </div>

        <div className="relative overflow-hidden p-5 bg-gradient-to-br from-neutral-900/60 to-neutral-900/40 border border-neutral-800/60 rounded-xl shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#9f1239]/5 rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-heading text-neutral-100 uppercase tracking-wider">
                Complete Pack Benefits
              </h3>
            </div>

            <ul className="text-xs text-neutral-300 space-y-2.5 font-body" aria-label="Benefits list">
              {[
                { text: `All ${PRICING.COMPLETE_PACK.chapters} premium chapters`, suffix: '' },
                { text: `One-time payment of ₹${PRICING.COMPLETE_PACK.price}`, suffix: '' },
                { text: `Best value at ₹${PRICING.COMPLETE_PACK.pricePerChapter}/chapter`, suffix: '' },
                { text: 'Lifetime access', suffix: ' • No subscriptions' },
                { text: 'Read offline', suffix: ' anytime, anywhere' },
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2.5 group">
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9f1239]/20 flex items-center justify-center mt-0.5 group-hover:bg-[#9f1239]/30 transition-colors"
                    aria-hidden="true"
                  >
                    <span className="text-[#9f1239] text-[10px]">✓</span>
                  </span>
                  <span className="leading-relaxed">
                    <strong className="text-white">{benefit.text}</strong>
                    {benefit.suffix && <span>{benefit.suffix}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
})

const ErrorScreen = memo(function ErrorScreen({
  onRetry,
  onClose
}: ErrorScreenProps) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-6 py-12"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-900/20 border border-red-800/50 flex items-center justify-center">
          <X className="w-8 h-8 text-red-400" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-heading text-neutral-100 mb-3">
          Failed to Load Chapter
        </h2>
        <p className="text-neutral-400 font-body mb-6 text-sm">
          There was a problem loading this chapter. Please check your connection and try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-wider hover:bg-[#881337] transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-neutral-800 text-neutral-300 rounded-lg font-heading text-sm tracking-wider hover:bg-neutral-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
})

const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-[#050505] z-10"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#9f1239] animate-spin mx-auto mb-3" aria-hidden="true" />
        <p className="text-neutral-400 font-body text-xs">Loading chapter...</p>
      </div>
    </div>
  )
})

interface NavigationButtonProps {
  direction: 'prev' | 'next'
  chapter: Chapter | null
  isLocked: boolean
  onNavigate: (slug: string) => void
  onViewPricing: () => void
}

const NavigationButton = memo(function NavigationButton({
  direction,
  chapter,
  isLocked,
  onNavigate,
  onViewPricing
}: NavigationButtonProps) {
  const isPrev = direction === 'prev'

  if (!chapter) {
    if (isPrev) {
      return <div className="w-16" aria-hidden="true" />
    }
    return (
      <div className="flex items-center gap-1.5 text-neutral-500 text-xs p-1.5 font-ui">
        <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">End</span>
      </div>
    )
  }

  if (isLocked) {
    if (isPrev) {
      return (
        <div
          className="flex items-center gap-1.5 text-neutral-700 p-1.5 rounded-lg bg-neutral-900/30"
          aria-label={`${chapter.title} is locked`}
        >
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-xs hidden sm:inline font-ui">Locked</span>
        </div>
      )
    }
    return (
      <button
        onClick={onViewPricing}
        className="flex items-center gap-1.5 text-[#9f1239] hover:text-white transition-all group p-1.5 -mr-1.5 rounded-lg hover:bg-[#9f1239]/10 border border-[#9f1239]/20 hover:border-[#9f1239]/40 active:scale-95"
        aria-label="Unlock next chapter"
      >
        <Crown className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" aria-hidden="true" />
        <span className="text-xs font-heading">Unlock</span>
      </button>
    )
  }

  const handleClick = () => onNavigate(chapter.slug)
  const Icon = isPrev ? ArrowLeft : ArrowRight

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 text-neutral-400 hover:text-white transition-all group p-1.5 ${isPrev ? '-ml-1.5' : '-mr-1.5'
        } rounded-lg hover:bg-neutral-800/50 active:scale-95`}
      aria-label={`Go to ${chapter.title}`}
    >
      {isPrev ? (
        <>
          <Icon className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
          <div className="text-left hidden sm:block">
            <div className="text-[8px] font-ui tracking-wider uppercase text-neutral-600">Prev</div>
            <div className="text-xs font-heading leading-tight">{chapter.number}</div>
          </div>
          <span className="sm:hidden text-xs font-ui">Prev</span>
        </>
      ) : (
        <>
          <span className="sm:hidden text-xs font-ui">Next</span>
          <div className="text-right hidden sm:block">
            <div className="text-[8px] font-ui tracking-wider uppercase text-neutral-600">Next</div>
            <div className="text-xs font-heading leading-tight">{chapter.number}</div>
          </div>
          <Icon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </>
      )}
    </button>
  )
})

// ============================================================================
// Main Component
// ============================================================================

export default function ChapterReader({
  chapterSlug,
  userTier,
  ownedChapters,
  onClose,
  onNavigate
}: ChapterReaderProps) {
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [fontSize, setFontSize] = useState<FontSize>("medium")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFontMenu, setShowFontMenu] = useState(false)

  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingChapterRef = useRef<string>(chapterSlug)

  // Hooks
  const { initializePayment, isProcessing } = useRazorpay()

  const stableOnClose = useLatestRef(onClose)
  const stableOnNavigate = useLatestRef(onNavigate)

  useFocusTrap(containerRef, mounted && !isLoading && !isSidebarOpen)
  useModalHistory(mounted, onClose)

  // Load saved font size
  useEffect(() => {
    const saved = localStorage.getItem("reader-font-size") as FontSize | null
    if (saved && ["small", "medium", "large"].includes(saved)) {
      setFontSize(saved)
    }
  }, [])

  // Fullscreen handler
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen().catch(() => { })
    }
  }, [])

  // Memoized Values
  const currentChapter = useMemo(
    () => chapters.find(ch => ch.slug === chapterSlug),
    [chapterSlug]
  )

  const currentIndex = useMemo(
    () => chapters.findIndex(ch => ch.slug === chapterSlug),
    [chapterSlug]
  )

  const prevChapter = useMemo(
    () => currentIndex > 0 ? chapters[currentIndex - 1] : null,
    [currentIndex]
  )

  const nextChapter = useMemo(
    () => currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null,
    [currentIndex]
  )

  const isLocked = useMemo(
    () => currentChapter ? isChapterLocked(currentChapter.id, userTier, ownedChapters) : false,
    [currentChapter, userTier, ownedChapters]
  )

  const isNextLocked = useMemo(
    () => nextChapter ? isChapterLocked(nextChapter.id, userTier, ownedChapters) : false,
    [nextChapter, userTier, ownedChapters]
  )

  const isPrevLocked = useMemo(
    () => prevChapter ? isChapterLocked(prevChapter.id, userTier, ownedChapters) : false,
    [prevChapter, userTier, ownedChapters]
  )

  const chapterPath = useMemo(
    () => currentChapter?.path ?? "",
    [currentChapter]
  )

  // Callbacks
  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
  }, [])

  const applyFontSize = useCallback((doc: Document) => {
    if (!doc) return
    const config = FONT_CONFIG[fontSize]
    let style = doc.getElementById("reader-font-styles") as HTMLStyleElement
    if (!style) {
      style = doc.createElement("style")
      style.id = "reader-font-styles"
      doc.head.appendChild(style)
    }

    style.textContent = `
      .prose p, .dialogue, .quote-block blockquote, .vow-box p, 
      .hero-quote, .end-card-quote, .highlight-box p {
        font-size: ${config.prose} !important;
        line-height: ${config.line} !important;
      }
      .drop-cap::first-letter {
        font-size: ${config.drop} !important;
      }
      .scream-text {
        font-size: clamp(3.5rem, 12vw, ${config.scream}) !important;
      }
      .hero-title {
        font-size: clamp(3.5rem, 10vw, 7.5rem) !important;
      }
      @media (max-width: 640px) {
        .prose p, .dialogue, .quote-block blockquote {
          font-size: calc(${config.prose} * 0.9) !important;
        }
      }
    `
  }, [fontSize])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setIsLoading(true)
    loadingChapterRef.current = chapterSlug

    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src
      iframeRef.current.src = ''
      requestAnimationFrame(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc
        }
      })
    }
  }, [chapterSlug])

  const handleIframeLoad = useCallback(() => {
    if (loadingChapterRef.current !== chapterSlug) {
      return
    }

    clearLoadTimeout()
    setIsLoading(false)
    setHasError(false)

    if (iframeRef.current?.contentWindow) {
      try {
        const iframeDoc = iframeRef.current.contentDocument
        if (iframeDoc?.head && !iframeDoc.getElementById('reader-injected-styles')) {
          const style = iframeDoc.createElement("style")
          style.id = 'reader-injected-styles'
          
          style.textContent = `
            .fixed-nav,
            .ambient-indicator,
            .fog-container,
            [data-reader-hide] {
              display: none !important;
            }
            
            html {
              scroll-behavior: smooth;
              scrollbar-gutter: stable; /* CRITICAL: Prevents layout shift when scrollbar appears */
            }
            
            html, body {
              min-height: 100%;
              display: flex;
              flex-direction: column;
            }
            
            body {
              padding-bottom: 180px !important;
              margin: 0 auto !important;
              max-width: ${CONTENT_MAX_WIDTH} !important;
              width: 100% !important;
              box-sizing: border-box !important; /* Ensure padding doesn't add to width */
              padding-left: 2rem !important;   /* Matches desktop padding */
              padding-right: 2rem !important;
              background: #050505;
              overflow-x: hidden;
            }
            
            body > main,
            body > article,
            body > div:first-child,
            .content,
            .chapter-content,
            .prose {
              margin: 0 auto !important;
              max-width: 100% !important;
              width: 100% !important;
            }
            
            .container {
              padding: 0 !important;
              max-width: 100% !important;
            }
            
            .hero {
              min-height: 60vh !important;
            }
            
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            
            ::-webkit-scrollbar-track {
              background: transparent;
            }
            
            ::-webkit-scrollbar-thumb {
              background: rgba(159, 18, 57, 0.3);
              border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
              background: rgba(159, 18, 57, 0.6);
            }

            @media (max-width: 640px) {
              body {
                padding-left: 1.5rem !important; /* Matches mobile padding */
                padding-right: 1.5rem !important;
                padding-bottom: 160px !important;
              }
            }
          `
          iframeDoc.head.appendChild(style)

          iframeDoc.documentElement.scrollTop = 0
          iframeDoc.body.scrollTop = 0
        }

        applyFontSize(iframeDoc!)
      } catch {
        console.debug("Could not inject iframe styles (CORS)")
      }
    }
  }, [chapterSlug, clearLoadTimeout, applyFontSize])

  const handleIframeError = useCallback(() => {
    if (loadingChapterRef.current !== chapterSlug) {
      return
    }
    clearLoadTimeout()
    setIsLoading(false)
    setHasError(true)
  }, [chapterSlug, clearLoadTimeout])

  const handleUnlock = useCallback(async () => {
    try {
      await initializePayment('complete', { tier: 'complete' })
    } catch (error) {
      console.error('Payment initialization failed:', error)
    }
  }, [initializePayment])

  const handleViewPricing = useCallback(() => {
    stableOnClose.current()
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    })
  }, [stableOnClose])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  const handleFontSizeChange = useCallback((size: FontSize) => {
    setFontSize(size)
    localStorage.setItem("reader-font-size", size)
    setShowFontMenu(false)

    if (!isLoading && !hasError && iframeRef.current?.contentDocument) {
      applyFontSize(iframeRef.current.contentDocument)
    }
  }, [isLoading, hasError, applyFontSize])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isSidebarOpen || showFontMenu) return

    if (e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)) {
      return
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault()
        stableOnClose.current()
        break
      case "ArrowLeft":
        if (prevChapter && !isPrevLocked) {
          e.preventDefault()
          stableOnNavigate.current(prevChapter.slug)
        }
        break
      case "ArrowRight":
        if (nextChapter && !isNextLocked) {
          e.preventDefault()
          stableOnNavigate.current(nextChapter.slug)
        }
        break
      case "m":
      case "M":
        e.preventDefault()
        setIsSidebarOpen(prev => !prev)
        break
      case "f":
      case "F":
        e.preventDefault()
        toggleFullscreen()
        break
    }
  }, [prevChapter, nextChapter, isNextLocked, isPrevLocked, isSidebarOpen, showFontMenu, stableOnClose, stableOnNavigate, toggleFullscreen])

  // Effects
  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = ""
      clearLoadTimeout()
    }
  }, [clearLoadTimeout])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    loadingChapterRef.current = chapterSlug
    setIsLoading(true)
    setHasError(false)

    loadTimeoutRef.current = setTimeout(() => {
      if (loadingChapterRef.current === chapterSlug) {
        setIsLoading(false)
        setHasError(true)
      }
    }, LOAD_TIMEOUT_MS)

    return clearLoadTimeout
  }, [chapterSlug, clearLoadTimeout])

  useEffect(() => {
    if (isLocked || hasError) return

    const prefetchLinks: HTMLLinkElement[] = []

    const addPrefetch = (chapter: Chapter | null, locked: boolean) => {
      if (chapter?.path && !locked) {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = chapter.path
        link.as = 'document'
        document.head.appendChild(link)
        prefetchLinks.push(link)
      }
    }

    addPrefetch(nextChapter, isNextLocked)
    addPrefetch(prevChapter, isPrevLocked)

    return () => {
      prefetchLinks.forEach(link => link.remove())
    }
  }, [nextChapter, prevChapter, isNextLocked, isPrevLocked, isLocked, hasError])

  if (!mounted) return null
  if (!currentChapter) return null

  const readerContent = (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-title"
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading && `Loading ${currentChapter.title}`}
          {!isLoading && !hasError && !isLocked && `${currentChapter.title} loaded`}
        </div>

 {/* Top Navigation Bar - FIXED */}
<header className="w-full flex-shrink-0 bg-black/95 backdrop-blur-xl border-b border-neutral-800/60 z-20 flex justify-center">
  <div 
    className={`w-full ${CONTENT_PADDING.mobile} ${CONTENT_PADDING.desktop} py-3 flex items-center justify-between relative`}
    style={{ maxWidth: CONTENT_MAX_WIDTH }}
  >
    {/* Left - Back */}
    <div className="flex-shrink-0 z-10">
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all p-2 -ml-2 rounded-lg hover:bg-neutral-800/50 active:scale-95"
        aria-label="Back to chapters"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span className="text-xs font-ui tracking-wide hidden sm:inline">Back</span>
      </button>
    </div>

 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div className="text-center w-full max-w-[120px] sm:max-w-[180px] md:max-w-[260px] lg:max-w-[320px]">
    <div className="text-[9px] font-ui tracking-[0.2em] sm:tracking-[0.3em] uppercase text-neutral-600 mb-0.5 truncate">
      {currentChapter.number}
    </div>
    <h1
      id="chapter-title"
      className="text-xs sm:text-sm md:text-base font-heading text-neutral-200 leading-tight truncate"
      title={currentChapter.title} /* Shows full title on hover */
    >
      {currentChapter.title}
    </h1>
  </div>
</div>

    {/* Right - Controls */}
    <div className="flex-shrink-0 flex items-center gap-0.5 z-10">
      {/* Font Size +/- Control */}
      <div className="flex items-center bg-neutral-900/50 rounded-lg border border-neutral-800/50 overflow-hidden">
        <button
          onClick={() => {
            const sizes: FontSize[] = ["small", "medium", "large"]
            const currentIdx = sizes.indexOf(fontSize)
            if (currentIdx > 0) {
              handleFontSizeChange(sizes[currentIdx - 1])
            }
          }}
          disabled={fontSize === "small"}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
          aria-label="Decrease font size"
        >
          <span className="text-sm font-medium leading-none">A-</span>
        </button>
        
        <div className="w-px h-4 bg-neutral-800" aria-hidden="true" />
        
        <button
          onClick={() => {
            const sizes: FontSize[] = ["small", "medium", "large"]
            const currentIdx = sizes.indexOf(fontSize)
            if (currentIdx < sizes.length - 1) {
              handleFontSizeChange(sizes[currentIdx + 1])
            }
          }}
          disabled={fontSize === "large"}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
          aria-label="Increase font size"
        >
          <span className="text-base font-medium leading-none">A+</span>
        </button>
      </div>

      <button
        onClick={toggleFullscreen}
        className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/50 transition active:scale-95"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      <button
        onClick={toggleSidebar}
        className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/50 transition active:scale-95"
        aria-label="Toggle chapter list"
      >
        <Menu className="w-4 h-4" aria-hidden="true" />
      </button>

      <button
        onClick={onClose}
        className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/50 transition active:scale-95"
        aria-label="Close reader"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</header>

        {/* Main Content */}
        <main className="w-full flex-1 relative overflow-hidden bg-gradient-to-b from-[#050505] to-black flex justify-center">
          <div className="w-full h-full relative" style={{ maxWidth: "100%" }}>
            {isLocked ? (
              <LockedScreen
                onUnlock={handleUnlock}
                isProcessing={isProcessing}
                onClose={onClose}
              />
            ) : hasError ? (
              <ErrorScreen
                onRetry={handleRetry}
                onClose={onClose}
              />
            ) : (
              <>
                {isLoading && <LoadingScreen />}
                <iframe
                  ref={iframeRef}
                  src={chapterPath}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  className="w-full h-full border-0"
                  title={`${currentChapter.number}: ${currentChapter.title}`}
                  loading="eager"
                  sandbox="allow-scripts allow-same-origin"
                  style={{
                    opacity: isLoading ? 0 : 1,
                    transition: "opacity 0.4s ease-in-out"
                  }}
                />
              </>
            )}
          </div>
        </main>

        {/* Bottom Navigation - FIXED */}
        <nav
          className="w-full flex-shrink-0 bg-black/95 backdrop-blur-xl border-t border-neutral-800/60 z-20 flex justify-center"
          aria-label="Chapter navigation"
        >
          <div 
            className={`w-full ${CONTENT_PADDING.mobile} ${CONTENT_PADDING.desktop} py-3 flex items-center justify-between`}
            style={{ maxWidth: CONTENT_MAX_WIDTH }}
          >
            <NavigationButton
              direction="prev"
              chapter={prevChapter}
              isLocked={isPrevLocked}
              onNavigate={onNavigate}
              onViewPricing={handleViewPricing}
            />

            <div className="text-center" aria-label={`Chapter ${currentIndex + 1} of ${chapters.length}`}>
              <div className="text-[9px] font-ui text-neutral-500 tracking-wider">
                {currentIndex + 1} / {chapters.length}
              </div>
            </div>

            <NavigationButton
              direction="next"
              chapter={nextChapter}
              isLocked={isNextLocked}
              onNavigate={onNavigate}
              onViewPricing={handleViewPricing}
            />
          </div>
        </nav>
      </div>

      <ChapterListSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentChapterSlug={chapterSlug}
        userTier={userTier}
        ownedChapters={ownedChapters}
        onNavigate={onNavigate}
      />
    </>
  )

  return createPortal(readerContent, document.body)
}