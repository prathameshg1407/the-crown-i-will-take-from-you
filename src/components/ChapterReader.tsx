// components/ChapterReader.tsx
"use client"

import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react"
import { createPortal } from "react-dom"
import { chapters, isChapterLocked, PRICING } from "@/data"
import { X, ArrowLeft, ArrowRight, Lock, Loader2, Crown, BookOpen, Sparkles, Zap } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthContext"
import { useRazorpay } from "@/lib/razorpay/hooks"

interface ChapterReaderProps {
  chapterSlug: string
  userTier: 'free' | 'complete'
  ownedChapters: number[]
  onClose: () => void
  onNavigate: (slug: string) => void
}

// Memoized locked screen component
const LockedScreen = memo(({
  onUnlock,
  isProcessing,
  onClose
}: {
  onUnlock: () => void
  isProcessing: boolean
  onClose: () => void
}) => (
  <div className="absolute inset-0 flex items-center justify-center px-6 py-12 overflow-y-auto">
    <div className="max-w-lg w-full">
      {/* Animated Lock Icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-900/20 to-purple-900/20 animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
          <Lock className="w-9 h-9 text-neutral-400" />
        </div>
        <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#9f1239] animate-pulse" />
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-heading text-neutral-100 mb-3 leading-tight">
          Premium Chapter
        </h2>

        <p className="text-neutral-400 font-body mb-2">
          Unlock with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 font-heading font-semibold">
            Complete Pack
          </span>
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900/40 border border-neutral-800/60 rounded-full">
          <Zap className="w-3.5 h-3.5 text-[#9f1239]" />
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
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>Unlock Complete Access</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            onClose()
            setTimeout(() => {
              document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
            }, 100)
          }}
          className="w-full px-6 py-3 bg-transparent border-2 border-neutral-700 text-neutral-300 rounded-xl font-heading tracking-wider hover:bg-neutral-800/50 hover:border-neutral-600 hover:text-white transition-all duration-300 text-sm uppercase active:scale-[0.98]"
        >
          Compare All Plans
        </button>
      </div>

      {/* Benefits Card */}
      <div className="relative overflow-hidden p-5 bg-gradient-to-br from-neutral-900/60 to-neutral-900/40 border border-neutral-800/60 rounded-xl shadow-xl">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#9f1239]/5 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-sm font-heading text-neutral-100 uppercase tracking-wider">
              Complete Pack Benefits
            </h3>
          </div>

          <ul className="text-xs text-neutral-300 space-y-2.5 font-body">
            {[
              { text: `All ${PRICING.COMPLETE_PACK.chapters} premium chapters`, highlight: true },
              { text: `One-time payment of ₹${PRICING.COMPLETE_PACK.price}`, highlight: true },
              { text: `Best value at ₹${PRICING.COMPLETE_PACK.pricePerChapter}/chapter`, highlight: true },
              { text: 'Lifetime access', highlight: true, suffix: ' • No subscriptions' },
              { text: 'Read offline', highlight: true, suffix: ' anytime, anywhere' },
            ].map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2.5 group">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9f1239]/20 flex items-center justify-center mt-0.5 group-hover:bg-[#9f1239]/30 transition-colors">
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
))
LockedScreen.displayName = 'LockedScreen'

// Error screen component
const ErrorScreen = memo(({
  onRetry,
  onClose
}: {
  onRetry: () => void
  onClose: () => void
}) => (
  <div className="absolute inset-0 flex items-center justify-center px-6 py-12">
    <div className="max-w-md w-full text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-900/20 border border-red-800/50 flex items-center justify-center">
        <X className="w-8 h-8 text-red-400" />
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
))
ErrorScreen.displayName = 'ErrorScreen'

export default function ChapterReader({
  chapterSlug,
  userTier,
  ownedChapters,
  onClose,
  onNavigate
}: ChapterReaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { initializePayment, isProcessing } = useRazorpay()

  // Memoize chapter lookups
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

  // Memoize lock states
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

  // Chapter path from chapter object
  const chapterPath = useMemo(() => {
    return currentChapter ? currentChapter.path : ""
  }, [currentChapter])

  // Retry loading
  const handleRetry = useCallback(() => {
    setHasError(false)
    setIsLoading(true)
    
    // Force iframe reload
    if (iframeRef.current) {
      iframeRef.current.src = chapterPath
    }
  }, [chapterPath])

  // Iframe load handler with style injection
  const handleIframeLoad = useCallback(() => {
    // Clear timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }

    setIsLoading(false)
    setHasError(false)

    if (iframeRef.current?.contentWindow) {
      try {
        const iframeDoc = iframeRef.current.contentDocument
        if (iframeDoc && iframeDoc.head) {
          // Check if styles already injected
          if (iframeDoc.getElementById('reader-injected-styles')) {
            return
          }

          const style = iframeDoc.createElement("style")
          style.id = 'reader-injected-styles'
          style.textContent = `
            /* Hide fixed elements that might interfere */
            .fixed-nav,
            .ambient-indicator,
            .fog-container,
            [data-reader-hide] {
              display: none !important;
            }
            
            /* Smooth scrolling */
            html {
              scroll-behavior: smooth;
            }
            
            /* Add padding for bottom navigation */
            body {
              padding-bottom: 80px !important;
            }
            
            /* Improve readability */
            .prose p,
            article p {
              line-height: 1.9 !important;
            }
            
            /* Hide scrollbars */
            ::-webkit-scrollbar {
              display: none;
            }
            
            * {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            
            /* Ensure reveal animations work */
            .reveal {
              opacity: 1 !important;
              transform: none !important;
            }
            
            .reveal.active {
              opacity: 1 !important;
              transform: none !important;
            }
          `
          iframeDoc.head.appendChild(style)

          // Scroll to top of chapter
          iframeDoc.documentElement.scrollTop = 0
          iframeDoc.body.scrollTop = 0
        }
      } catch (e) {
        // CORS restrictions - styles in chapter HTML will be used
        console.debug("Could not inject iframe styles (CORS)")
      }
    }
  }, [])

  // Iframe error handler
  const handleIframeError = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }
    setIsLoading(false)
    setHasError(true)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault()
        onClose()
        break
      case "ArrowLeft":
        if (prevChapter && !isPrevLocked) {
          e.preventDefault()
          onNavigate(prevChapter.slug)
        }
        break
      case "ArrowRight":
        if (nextChapter && !isNextLocked) {
          e.preventDefault()
          onNavigate(nextChapter.slug)
        }
        break
    }
  }, [prevChapter, nextChapter, isNextLocked, isPrevLocked, onClose, onNavigate])

  const handleUnlock = useCallback(async () => {
    await initializePayment('complete', { tier: 'complete' })
  }, [initializePayment])

  // Mount effect
  useEffect(() => {
    setMounted(true)
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
      
      // Clear timeout on unmount
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [handleKeyDown])

  // Popstate handler for browser back button
  useEffect(() => {
    const handlePopState = () => onClose()
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [onClose])

  // Reset state on chapter change
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)

    // Set timeout for loading (15 seconds)
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false)
        setHasError(true)
      }
    }, 15000)

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [chapterSlug])

  // Prefetch adjacent chapters
  useEffect(() => {
    if (!isLocked && !hasError) {
      const prefetchLinks: HTMLLinkElement[] = []

      const addPrefetch = (chapter: typeof nextChapter) => {
        if (chapter && chapter.path) {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = chapter.path
          link.as = 'document'
          document.head.appendChild(link)
          prefetchLinks.push(link)
        }
      }

      if (nextChapter && !isNextLocked) {
        addPrefetch(nextChapter)
      }

      if (prevChapter && !isPrevLocked) {
        addPrefetch(prevChapter)
      }

      return () => {
        prefetchLinks.forEach(link => {
          if (link.parentNode) {
            link.parentNode.removeChild(link)
          }
        })
      }
    }
  }, [nextChapter, prevChapter, isNextLocked, isPrevLocked, isLocked, hasError])

  // Don't render until mounted (SSR safety)
  if (!mounted) return null
  
  // Don't render if chapter not found
  if (!currentChapter) return null

  const readerContent = (
    <div
      className="fixed inset-0 z-[100] bg-[#050505] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-title"
    >
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
                <ArrowLeft className="w-4 h-4" />
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
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#050505] to-black">
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
            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#050505] z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-[#9f1239] animate-spin mx-auto mb-3" />
                  <p className="text-neutral-400 font-body text-xs">Loading chapter...</p>
                </div>
              </div>
            )}

            {/* Chapter Content Iframe */}
            <iframe
              ref={iframeRef}
              src={chapterPath}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full border-0"
              title={`${currentChapter.number}: ${currentChapter.title}`}
              loading="eager"
              sandbox="allow-same-origin allow-scripts"
              style={{
                opacity: isLoading ? 0 : 1,
                transition: "opacity 0.3s ease-in-out"
              }}
            />
          </>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="flex-shrink-0 bg-black/95 backdrop-blur-md border-t border-neutral-800/50 z-20">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-2 md:py-2.5">
          <div className="flex items-center justify-between">
            {/* Previous Chapter */}
            {prevChapter ? (
              isPrevLocked ? (
                <div className="flex items-center gap-1.5 text-neutral-700 p-1.5 rounded-lg bg-neutral-900/30">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs hidden sm:inline font-ui">Locked</span>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate(prevChapter.slug)}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all group p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-800/50 active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  <div className="text-left hidden sm:block">
                    <div className="text-[8px] font-ui tracking-wider uppercase text-neutral-600">Prev</div>
                    <div className="text-xs font-heading leading-tight">{prevChapter.number}</div>
                  </div>
                  <span className="sm:hidden text-xs font-ui">Prev</span>
                </button>
              )
            ) : (
              <div className="w-16" />
            )}

            {/* Center - Chapter Counter */}
            <div className="text-center">
              <div className="text-[9px] font-ui text-neutral-500 tracking-wider">
                {currentIndex + 1} / {chapters.length}
              </div>
            </div>

            {/* Next Chapter */}
            {nextChapter ? (
              isNextLocked ? (
                <button
                  onClick={() => {
                    onClose()
                    setTimeout(() => {
                      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
                    }, 100)
                  }}
                  className="flex items-center gap-1.5 text-[#9f1239] hover:text-white transition-all group p-1.5 -mr-1.5 rounded-lg hover:bg-[#9f1239]/10 border border-[#9f1239]/20 hover:border-[#9f1239]/40 active:scale-95"
                >
                  <Crown className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  <span className="text-xs font-heading">Unlock</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate(nextChapter.slug)}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-all group p-1.5 -mr-1.5 rounded-lg hover:bg-neutral-800/50 active:scale-95"
                >
                  <span className="sm:hidden text-xs font-ui">Next</span>
                  <div className="text-right hidden sm:block">
                    <div className="text-[8px] font-ui tracking-wider uppercase text-neutral-600">Next</div>
                    <div className="text-xs font-heading leading-tight">{nextChapter.number}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              )
            ) : (
              <div className="flex items-center gap-1.5 text-neutral-500 text-xs p-1.5 font-ui">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End</span>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  )

  return createPortal(readerContent, document.body)
}