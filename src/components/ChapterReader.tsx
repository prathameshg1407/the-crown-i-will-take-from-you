// components/ChapterReader.tsx
"use client"

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react"
import { createPortal } from "react-dom"
import { chapters, isChapterLocked, PRICING } from "@/data"
import { X, ArrowLeft, ArrowRight, Lock, Loader2, Crown, BookOpen, Sparkles, Zap } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthContext"
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

type Chapter = typeof chapters[number]

// ============================================================================
// Constants
// ============================================================================

const LOAD_TIMEOUT_MS = 15000
const FOCUSABLE_ELEMENTS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to maintain a ref that always has the latest value
 * Useful for accessing current state in callbacks without causing re-renders
 */
function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

/**
 * Hook to trap focus within a container element
 */
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Store previously focused element to restore later
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Focus first element
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
      // Restore focus to previously focused element
      previouslyFocused?.focus()
    }
  }, [containerRef, isActive])
}

/**
 * Hook to manage browser history for modal
 */
function useModalHistory(isOpen: boolean, onClose: () => void) {
  const hasAddedHistoryRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    // Push state when modal opens
    if (!hasAddedHistoryRef.current) {
      window.history.pushState({ modal: 'chapter-reader' }, '')
      hasAddedHistoryRef.current = true
    }

    const handlePopState = (e: PopStateEvent) => {
      // Only close if this is our modal state
      onClose()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Clean up history state if modal closes normally (not via back button)
      if (hasAddedHistoryRef.current && window.history.state?.modal === 'chapter-reader') {
        window.history.back()
      }
      hasAddedHistoryRef.current = false
    }
  }, [isOpen, onClose])
}

// ============================================================================
// Sub-components
// ============================================================================

const LockedScreen = memo(function LockedScreen({
  onUnlock,
  isProcessing,
  onClose
}: LockedScreenProps) {
  const handleViewPlans = useCallback(() => {
    onClose()
    // Use requestAnimationFrame for smoother transition
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    })
  }, [onClose])

  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 py-12 overflow-y-auto">
      <div className="max-w-lg w-full" role="region" aria-labelledby="locked-title">
        {/* Animated Lock Icon */}
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

        {/* Benefits Card */}
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
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)

  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingChapterRef = useRef<string>(chapterSlug)

  // -------------------------------------------------------------------------
  // Hooks
  // -------------------------------------------------------------------------
  const { initializePayment, isProcessing } = useRazorpay()

  // Use latest refs for stable callbacks
  const stableOnClose = useLatestRef(onClose)
  const stableOnNavigate = useLatestRef(onNavigate)

  // Focus trap for accessibility
  useFocusTrap(containerRef, mounted && !isLoading)

  // Browser history management
  useModalHistory(mounted, onClose)

  // -------------------------------------------------------------------------
  // Memoized Values
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Callbacks
  // -------------------------------------------------------------------------
  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
  }, [])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setIsLoading(true)
    loadingChapterRef.current = chapterSlug

    // Force iframe reload by clearing and resetting src
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
  // Verify this load event is for the current chapter
  if (loadingChapterRef.current !== chapterSlug) {
    return
  }

  clearLoadTimeout()
  setIsLoading(false)
  setHasError(false)

  // Inject styles into iframe
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
          }
          
          /* Center the content */
          html, body {
            min-height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          body {
            padding-bottom: 80px !important;
            margin: 0 auto !important;
            max-width: 65ch !important; /* Optimal reading width */
            width: 100% !important;
            padding-left: 1.5rem !important;
            padding-right: 1.5rem !important;
            box-sizing: border-box !important;
          }
          
          /* If your content has a main wrapper, center it too */
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
          
          .prose p,
          article p {
            line-height: 1.9 !important;
          }
          
          ::-webkit-scrollbar {
            display: none;
          }
          
          * {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .reveal,
          .reveal.active {
            opacity: 1 !important;
            transform: none !important;
          }
        `
        iframeDoc.head.appendChild(style)

        // Scroll to top
        iframeDoc.documentElement.scrollTop = 0
        iframeDoc.body.scrollTop = 0
      }
    } catch {
      // CORS restrictions - styles in chapter HTML will be used
      console.debug("Could not inject iframe styles (CORS)")
    }
  }
}, [chapterSlug, clearLoadTimeout])

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

  // Stable keyboard handler using refs
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if target is an interactive element
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
    }
  }, [prevChapter, nextChapter, isNextLocked, isPrevLocked, stableOnClose, stableOnNavigate])

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Mount effect
  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = ""
      clearLoadTimeout()
    }
  }, [clearLoadTimeout])

  // Keyboard listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Chapter change effect
  useEffect(() => {
    loadingChapterRef.current = chapterSlug
    setIsLoading(true)
    setHasError(false)

    // Set loading timeout
    loadTimeoutRef.current = setTimeout(() => {
      // Only trigger error if still loading the same chapter
      if (loadingChapterRef.current === chapterSlug) {
        setIsLoading(false)
        setHasError(true)
      }
    }, LOAD_TIMEOUT_MS)

    return clearLoadTimeout
  }, [chapterSlug, clearLoadTimeout])

  // Prefetch adjacent chapters
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

  // -------------------------------------------------------------------------
  // Early Returns
  // -------------------------------------------------------------------------

  if (!mounted) return null
  if (!currentChapter) return null

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const readerContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#050505] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-title"
    >
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading && `Loading ${currentChapter.title}`}
        {!isLoading && !hasError && !isLocked && `${currentChapter.title} loaded`}
      </div>

      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 bg-black/95 backdrop-blur-md border-b border-neutral-800/50 z-20">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-2 md:py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Back button */}
            <div className="flex-shrink-0 w-[100px] md:w-[120px]">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-all p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-800/50"
                aria-label="Back to chapters"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-ui tracking-wide hidden sm:inline">Back</span>
              </button>
            </div>

            {/* Center - Chapter info */}
            <div className="text-center flex-1 px-2 min-w-0">
              <div className="text-[8px] md:text-[9px] font-ui tracking-[0.3em] uppercase text-neutral-500 mb-0.5">
                {currentChapter.number}
              </div>
              <h1
                id="chapter-title"
                className="text-xs md:text-sm font-heading text-neutral-200 truncate leading-tight"
              >
                {currentChapter.title}
              </h1>
            </div>

            {/* Right side - Close button */}
            <div className="flex-shrink-0 w-[100px] md:w-[120px] flex items-center justify-end">
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-all p-1.5 -mr-1.5 rounded-lg hover:bg-neutral-800/50"
                aria-label="Close reader"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#050505] to-black">
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

            {/* Chapter Content Iframe */}
            <iframe
              ref={iframeRef}
              src={chapterPath}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full border-0"
              title={`${currentChapter.number}: ${currentChapter.title}`}
              loading="eager"
              sandbox="allow-scripts"
              style={{
                opacity: isLoading ? 0 : 1,
                transition: "opacity 0.3s ease-in-out"
              }}
            />
          </>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        className="flex-shrink-0 bg-black/95 backdrop-blur-md border-t border-neutral-800/50 z-20"
        aria-label="Chapter navigation"
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-2 md:py-2.5">
          <div className="flex items-center justify-between">
            <NavigationButton
              direction="prev"
              chapter={prevChapter}
              isLocked={isPrevLocked}
              onNavigate={onNavigate}
              onViewPricing={handleViewPricing}
            />

            {/* Center - Chapter Counter */}
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
        </div>
      </nav>
    </div>
  )

  return createPortal(readerContent, document.body)
}