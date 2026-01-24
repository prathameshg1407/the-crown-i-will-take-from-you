// app/custom-selection/page.tsx
"use client"

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useRazorpay } from '@/lib/razorpay/hooks'
import { chapters, PRICING } from '@/data/chapters'
import { Check, ShoppingCart, ArrowLeft, Search, Crown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CustomSelectionPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { initializePayment, isProcessing } = useRazorpay()
  const router = useRouter()
  
  const [selectedChapters, setSelectedChapters] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // User tier
  const userTier = user?.tier || 'free'
  const hasCompletePack = userTier === 'complete'

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated === false) {
      router.push('/login?redirect=/custom-selection')
    }
  }, [isAuthenticated, authLoading, router])

  // Memoize owned chapters
  const ownedChapters = useMemo(() => {
    if (!user?.ownedChapters) return []
    if (!Array.isArray(user.ownedChapters)) return []
    return user.ownedChapters
  }, [user?.ownedChapters])

  // Filter available chapters (only premium chapters that aren't owned)
  const availableChapters = useMemo(() => {
    return chapters.filter(chapter => {
      // Skip free chapters
      if (chapter.id <= PRICING.FREE_CHAPTERS) return false
      // Skip if user has complete pack
      if (hasCompletePack) return false
      // Skip if already owned
      if (ownedChapters.includes(chapter.id)) return false
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = chapter.title.toLowerCase().includes(query)
        const matchesNumber = chapter.number.toLowerCase().includes(query)
        const matchesId = chapter.id.toString().includes(query)
        if (!matchesTitle && !matchesNumber && !matchesId) {
          return false
        }
      }
      return true
    })
  }, [ownedChapters, hasCompletePack, searchQuery])

  // Loading state
  if (authLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#9f1239] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 font-body">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const toggleChapter = (chapterId: number) => {
    setSelectedChapters(prev => 
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    )
  }

  const selectAll = () => setSelectedChapters(availableChapters.map(ch => ch.id))
  const clearSelection = () => setSelectedChapters([])

  const totalCost = selectedChapters.length * PRICING.CUSTOM_SELECTION.pricePerChapter
  const canPurchase = selectedChapters.length >= PRICING.CUSTOM_SELECTION.minChapters

  const handlePurchase = async () => {
    if (!canPurchase) return
    await initializePayment('custom', {
      customChapters: selectedChapters,
    })
  }

  // Complete pack view - user already has access
  if (hasCompletePack) {
    return (
      <div className="min-h-screen bg-[#050505] relative overflow-hidden">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />
        <div className="max-w-4xl mx-auto px-6 py-24">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-ui">Back to Home</span>
          </Link>
          <div className="bg-neutral-900/40 border border-green-800/60 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-3xl font-heading text-neutral-100 mb-4">You Already Have Complete Access</h1>
            <p className="text-neutral-400 font-body mb-8">You have unlimited access to all chapters with your Complete Pack.</p>
            <Link href="/#chapters" className="inline-block px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all">
              Start Reading
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate total premium chapters available
  const totalPremiumChapters = chapters.filter(ch => ch.id > PRICING.FREE_CHAPTERS).length
  const alreadyOwnedCount = ownedChapters.length

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />
      
      {/* SCROLLABLE CONTENT */}
      <div className="relative min-h-screen pb-64 md:pb-48">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-ui">Back to Home</span>
            </Link>
            <h1 className="text-4xl md:text-6xl font-heading text-neutral-100 mb-4 tracking-tight">Custom Chapter Selection</h1>
            <p className="text-lg text-neutral-400 font-body">Pick exactly which chapters you want • ₹{PRICING.CUSTOM_SELECTION.pricePerChapter}/chapter</p>
            
            {/* Recommendation Banner */}
            {selectedChapters.length >= 50 && (
              <div className="mt-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-heading text-sm mb-1">
                      💡 Consider the Complete Pack!
                    </p>
                    <p className="text-amber-200/70 text-sm font-body">
                      You're selecting {selectedChapters.length} chapters for ₹{totalCost}. 
                      The Complete Pack gives you all {PRICING.COMPLETE_PACK.chapters} chapters for just ₹{PRICING.COMPLETE_PACK.price} 
                      (₹{PRICING.COMPLETE_PACK.pricePerChapter}/chapter).
                    </p>
                    <Link 
                      href="/#pricing" 
                      className="inline-block mt-2 text-amber-400 hover:text-amber-300 text-sm font-ui underline"
                    >
                      View Complete Pack →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
              <div className="text-2xl font-heading text-neutral-100 mb-1">{availableChapters.length}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Available</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
              <div className="text-2xl font-heading text-[#9f1239] mb-1">{selectedChapters.length}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Selected</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
              <div className="text-2xl font-heading text-neutral-100 mb-1">₹{totalCost}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Total Cost</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
              <div className="text-2xl font-heading text-green-400 mb-1">{alreadyOwnedCount}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Already Owned</div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search chapters by title or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-neutral-900/40 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={selectAll} 
                disabled={availableChapters.length === 0} 
                className="px-4 py-3 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm uppercase tracking-wider hover:bg-neutral-700 disabled:opacity-50 transition-all border border-neutral-700"
              >
                Select All
              </button>
              <button 
                onClick={clearSelection} 
                disabled={selectedChapters.length === 0} 
                className="px-4 py-3 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm uppercase tracking-wider hover:bg-neutral-700 disabled:opacity-50 transition-all border border-neutral-700"
              >
                Clear
              </button>
            </div>
          </div>

          {/* No chapters available message */}
          {availableChapters.length === 0 && !searchQuery && (
            <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-heading text-neutral-100 mb-2">All Premium Chapters Owned!</h3>
              <p className="text-neutral-400 font-body mb-6">
                You already own all {alreadyOwnedCount} premium chapters.
              </p>
              <Link 
                href="/#chapters" 
                className="inline-block px-6 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all"
              >
                Start Reading
              </Link>
            </div>
          )}

          {/* Search no results */}
          {availableChapters.length === 0 && searchQuery && (
            <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
              <Search className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-heading text-neutral-300 mb-2">No chapters found</h3>
              <p className="text-neutral-500 font-body mb-4">
                No chapters match "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm hover:bg-neutral-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Chapters Grid */}
          {availableChapters.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {availableChapters.map((chapter) => {
                const isSelected = selectedChapters.includes(chapter.id)
                return (
                  <button
                    key={chapter.id}
                    onClick={() => toggleChapter(chapter.id)}
                    className={`text-left p-4 rounded-xl border transition-all group ${
                      isSelected 
                        ? 'bg-[#9f1239]/10 border-[#9f1239] shadow-lg shadow-[#9f1239]/20' 
                        : 'bg-neutral-900/40 border-neutral-800/60 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-[#9f1239] border-[#9f1239]' : 'border-neutral-700 group-hover:border-neutral-500'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-neutral-500 font-ui uppercase tracking-wider mb-1">
                          {chapter.number}
                        </div>
                        <h3 className={`text-sm font-heading mb-2 line-clamp-2 transition-colors ${
                          isSelected ? 'text-white' : 'text-neutral-100 group-hover:text-white'
                        }`}>
                          {chapter.title}
                        </h3>
                        <div className="text-xs text-[#9f1239] font-ui">
                          ₹{PRICING.CUSTOM_SELECTION.pricePerChapter}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Spacer for mobile */}
          <div className="h-20 md:hidden" aria-hidden="true" />
        </div>
      </div>

      {/* FIXED FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 p-6 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-sm text-neutral-400 font-body mb-1">
              {selectedChapters.length} chapter{selectedChapters.length !== 1 ? 's' : ''} selected
              {selectedChapters.length > 0 && !canPurchase && (
                <span className="text-red-400 ml-2">(min {PRICING.CUSTOM_SELECTION.minChapters} required)</span>
              )}
            </div>
            <div className="text-2xl font-heading text-neutral-100">Total: ₹{totalCost}</div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={!canPurchase || isProcessing}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Purchase Selected
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}