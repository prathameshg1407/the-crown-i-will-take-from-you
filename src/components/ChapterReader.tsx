// components/ChapterReader.tsx
"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { chapters, isChapterLocked, PRICING } from "@/data/chapters"
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

export default function ChapterReader({ 
  chapterSlug, 
  userTier,
  ownedChapters,
  onClose, 
  onNavigate 
}: ChapterReaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { user } = useAuth()
  const { initializePayment, isProcessing } = useRazorpay()

  const currentChapter = chapters.find(ch => ch.slug === chapterSlug)
  const currentIndex = chapters.findIndex(ch => ch.slug === chapterSlug)
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  const isLocked = currentChapter ? isChapterLocked(currentChapter.id, userTier, ownedChapters) : false
  const isNextLocked = nextChapter ? isChapterLocked(nextChapter.id, userTier, ownedChapters) : false
  const isPrevLocked = prevChapter ? isChapterLocked(prevChapter.id, userTier, ownedChapters) : false

  const getChapterPath = useCallback((slug: string) => {
    const chapter = chapters.find(ch => ch.slug === slug)
    if (!chapter) return ""
    
    if (chapter.id === 1) {
      return "/chapters/a-drizzle-of-blood-prologue.html"
    }
    return `/chapters/chapter-${chapter.id - 1}.html`
  }, [])

  const chapterPath = currentChapter ? getChapterPath(chapterSlug) : ""

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false)
    
    if (iframeRef.current?.contentWindow) {
      try {
        const iframeDoc = iframeRef.current.contentDocument
        if (iframeDoc) {
          const style = iframeDoc.createElement("style")
          style.textContent = `
            .fixed-nav, .ambient-indicator { display: none !important; }
            html { scroll-behavior: smooth; }
            body { 
              padding-bottom: 60px !important;
              line-height: 1.8 !important;
            }
            p { margin-bottom: 1.5em !important; }
            
            /* Hide scrollbar for Chrome, Safari and Opera */
            ::-webkit-scrollbar {
              display: none;
            }
            
            /* Hide scrollbar for IE, Edge and Firefox */
            * {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;  /* Firefox */
            }
          `
          iframeDoc.head.appendChild(style)
        }
      } catch (e) {
        console.log("Could not inject styles into iframe")
      }
    }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    } else if (e.key === "ArrowLeft" && prevChapter && !isPrevLocked) {
      onNavigate(prevChapter.slug)
    } else if (e.key === "ArrowRight" && nextChapter && !isNextLocked) {
      onNavigate(nextChapter.slug)
    }
  }, [prevChapter, nextChapter, isNextLocked, isPrevLocked, onClose, onNavigate])

  const handleUnlock = async () => {
    await initializePayment('complete', { tier: 'complete' })
  }

  useEffect(() => {
    setMounted(true)
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [chapterSlug, handleKeyDown])

  useEffect(() => {
    const handlePopState = () => {
      onClose()
    }
    
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [onClose])

  useEffect(() => {
    setIsLoading(true)
  }, [chapterSlug])

  useEffect(() => {
    handleIframeLoad()
  }, [handleIframeLoad])

  if (!mounted) return null
  if (!currentChapter) return null

  const readerContent = (
    <div 
      className="fixed inset-0 z-[100] bg-[#050505] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-title"
    >
      {/* Top Navigation Bar - Compact */}
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
            <div className="text-center flex-1 px-2">
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
                  onClick={handleUnlock}
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl font-heading tracking-wider hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 uppercase text-sm flex items-center justify-center gap-2.5 shadow-lg hover:shadow-red-900/20 active:scale-98 group"
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
                  className="w-full px-6 py-3 bg-transparent border-2 border-neutral-700 text-neutral-300 rounded-xl font-heading tracking-wider hover:bg-neutral-800/50 hover:border-neutral-600 hover:text-white transition-all duration-300 text-sm uppercase active:scale-98"
                >
                  Compare All Plans
                </button>
              </div>

              {/* Benefits Card - Compact */}
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
                    <li className="flex items-start gap-2.5 group">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9f1239]/20 flex items-center justify-center mt-0.5 group-hover:bg-[#9f1239]/30 transition-colors">
                        <span className="text-[#9f1239] text-[10px]">✓</span>
                      </span>
                      <span className="leading-relaxed">
                        All <strong className="text-white">{PRICING.COMPLETE_PACK.chapters} premium chapters</strong> instantly unlocked
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 group">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9f1239]/20 flex items-center justify-center mt-0.5 group-hover:bg-[#9f1239]/30 transition-colors">
                        <span className="text-[#9f1239] text-[10px]">✓</span>
                      </span>
                      <span className="leading-relaxed">
                        One-time payment of <strong className="text-white">₹{PRICING.COMPLETE_PACK.price}</strong> only
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 group">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9f1239]/20 flex items-center justify-center mt-0.5 group-hover:bg-[#9f1239]/30 transition-colors">
                        <span className="text-[#9f1239] text-[10px]">✓</span>
                      </span>
                      <span className="leading-relaxed">
                        Best value at <strong className="text-white">₹{PRICING.COMPLETE_PACK.pricePerChapter}/chapter</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 group">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9f1239]/20 flex items-center justify-center mt-0.5 group-hover:bg-[#9f1239]/30 transition-colors">
                        <span className="text-[#9f1239] text-[10px]">✓</span>
                      </span>
                      <span className="leading-relaxed">
                        <strong className="text-white">Lifetime access</strong> • No subscriptions
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 group">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9f1239]/20 flex items-center justify-center mt-0.5 group-hover:bg-[#9f1239]/30 transition-colors">
                        <span className="text-[#9f1239] text-[10px]">✓</span>
                      </span>
                      <span className="leading-relaxed">
                        Read <strong className="text-white">offline</strong> anytime, anywhere
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#050505] z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-[#9f1239] animate-spin mx-auto mb-3" />
                  <p className="text-neutral-400 font-body text-xs">Loading chapter...</p>
                </div>
              </div>
            )}
            
            <iframe
              ref={iframeRef}
              src={chapterPath}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0"
              title={`${currentChapter.number}: ${currentChapter.title}`}
              style={{ 
                opacity: isLoading ? 0 : 1,
                transition: "opacity 0.4s ease-in-out"
              }}
            />
          </>
        )}
      </div>

      {/* Bottom Navigation Bar - Compact, No Progress */}
      <nav className="flex-shrink-0 bg-black/95 backdrop-blur-md border-t border-neutral-800/50 z-20">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-2 md:py-2.5">
          <div className="flex items-center justify-between">
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