// app/custom-selection/page.tsx
"use client"

import { Suspense, useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { useRazorpay } from '@/lib/razorpay/hooks'
import { chapters, PRICING } from '@/data/chapters'
import { Check, ShoppingCart, ArrowLeft, Search, Crown, CreditCard, X, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// PayPal imports commented out
// import dynamic from 'next/dynamic'
// import { Globe } from 'lucide-react'
// const PayPalButton = dynamic(() => import('@/components/PayPalButton'), {
//   ssr: false,
//   loading: () => (
//     <div className="h-12 bg-neutral-800/50 rounded-lg animate-pulse flex items-center justify-center">
//       <span className="text-neutral-500 text-sm">Loading PayPal...</span>
//     </div>
//   ),
// })

// ============================================================================
// Types
// ============================================================================

// type PaymentMethod = 'razorpay' | 'paypal'

interface ChapterCardProps {
  chapter: typeof chapters[number]
  isSelected: boolean
  onToggle: (id: number) => void
}

// ============================================================================
// Chapter Card Component (Memoized)
// ============================================================================

const ChapterCard = memo(function ChapterCard({ 
  chapter, 
  isSelected, 
  onToggle
}: ChapterCardProps) {
  const priceINR = PRICING.CUSTOM_SELECTION.pricePerChapter

  return (
    <button
      onClick={() => onToggle(chapter.id)}
      className={`text-left p-4 rounded-xl border transition-all group active:scale-[0.98] ${
        isSelected 
          ? 'bg-[#9f1239]/10 border-[#9f1239] shadow-lg shadow-[#9f1239]/20' 
          : 'bg-neutral-900/40 border-neutral-800/60 hover:border-neutral-700 hover:bg-neutral-900/60'
      }`}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${chapter.number}: ${chapter.title}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-[#9f1239] border-[#9f1239]' : 'border-neutral-700 group-hover:border-neutral-500'
        }`}>
          {isSelected && <Check className="w-4 h-4 text-white" aria-hidden="true" />}
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
            ₹{priceINR}
          </div>
        </div>
      </div>
    </button>
  )
})

// ============================================================================
// Loading Screen Component
// ============================================================================

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#9f1239] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-400 font-body">Loading...</p>
      </div>
    </div>
  )
}

// ============================================================================
// Custom Selection Inner Component
// ============================================================================

function CustomSelectionInner() {
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth()
  const { initializePayment, isProcessing: isRazorpayProcessing } = useRazorpay()
  const router = useRouter()
  
  const [selectedChapters, setSelectedChapters] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  // const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
  //   (searchParams.get('payment') as PaymentMethod) || 'razorpay'
  // )

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

  // Filter available chapters
  const availableChapters = useMemo(() => {
    return chapters.filter(chapter => {
      if (chapter.id <= PRICING.FREE_CHAPTERS) return false
      if (hasCompletePack) return false
      if (ownedChapters.includes(chapter.id)) return false
      
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

  // Calculate costs
  const costs = useMemo(() => {
    const totalINR = selectedChapters.length * PRICING.CUSTOM_SELECTION.pricePerChapter
    const completePackINR = PRICING.COMPLETE_PACK.price
    const savings = completePackINR - totalINR
    
    return { totalINR, completePackINR, savings }
  }, [selectedChapters.length])

  const canPurchase = selectedChapters.length >= PRICING.CUSTOM_SELECTION.minChapters

  // Callbacks
  const toggleChapter = useCallback((chapterId: number) => {
    setSelectedChapters(prev => 
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    )
  }, [])

  const selectAll = useCallback(() => {
    setSelectedChapters(availableChapters.map(ch => ch.id))
  }, [availableChapters])

  const clearSelection = useCallback(() => {
    setSelectedChapters([])
  }, [])

  const handleRazorpayPurchase = useCallback(async () => {
    if (!canPurchase) return
    await initializePayment('custom', {
      customChapters: selectedChapters,
    })
  }, [canPurchase, initializePayment, selectedChapters])

  // PayPal success handler commented out
  // const handlePaymentSuccess = useCallback(() => {
  //   refreshUser?.()
  //   router.push('/#chapters')
  // }, [refreshUser, router])

  const clearSearch = useCallback(() => setSearchQuery(''), [])

  // Loading state
  if (authLoading || isAuthenticated === null) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) return null

  // Complete pack view
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
            <Link href="/#chapters" className="inline-block px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all active:scale-95">
              Start Reading
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const alreadyOwnedCount = ownedChapters.length
  const showRecommendation = selectedChapters.length >= 50

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />
      
      {/* Scrollable Content */}
      <div className="relative min-h-screen pb-72 md:pb-56">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8 active:scale-95">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-ui">Back to Home</span>
            </Link>
            <h1 className="text-4xl md:text-6xl font-heading text-neutral-100 mb-4 tracking-tight">
              Custom Chapter Selection
            </h1>
            <p className="text-lg text-neutral-400 font-body">
              Pick exactly which chapters you want • ₹{PRICING.CUSTOM_SELECTION.pricePerChapter}/chapter
            </p>
            
            {/* Payment Method Selector - Commented out, only Razorpay now */}
            {/* <div className="mt-6 inline-flex bg-neutral-900/60 border border-neutral-800 rounded-xl p-1.5">
              <button
                onClick={() => setPaymentMethod('razorpay')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-ui text-sm transition-all ${
                  paymentMethod === 'razorpay'
                    ? 'bg-[#9f1239] text-white shadow-lg'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>India (UPI/Cards)</span>
              </button>
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-ui text-sm transition-all ${
                  paymentMethod === 'paypal'
                    ? 'bg-[#0070ba] text-white shadow-lg'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>International (PayPal)</span>
              </button>
            </div> */}

            {/* Payment Info */}
            <div className="mt-6 flex items-center gap-2 text-neutral-500 text-sm">
              <CreditCard className="w-4 h-4" />
              <span>Pay with UPI, Credit/Debit Cards, Net Banking</span>
            </div>
            
            {/* Recommendation Banner */}
            {showRecommendation && (
              <div className="mt-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-heading text-sm mb-1">
                      💡 Consider the Complete Pack!
                    </p>
                    <p className="text-amber-200/70 text-sm font-body">
                      You're selecting {selectedChapters.length} chapters for ₹{costs.totalINR}. 
                      The Complete Pack gives you all {PRICING.COMPLETE_PACK.chapters} chapters for just 
                      ₹{costs.completePackINR} — that's only ₹{PRICING.COMPLETE_PACK.pricePerChapter}/chapter!
                    </p>
                    <Link 
                      href="/#pricing" 
                      className="inline-flex items-center gap-1 mt-2 text-amber-400 hover:text-amber-300 text-sm font-ui underline"
                    >
                      View Complete Pack
                      <Sparkles className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
              <div className="text-2xl font-heading text-neutral-100 mb-1">{availableChapters.length}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Available</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
              <div className="text-2xl font-heading text-[#9f1239] mb-1">{selectedChapters.length}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Selected</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
              <div className="text-2xl font-heading text-neutral-100 mb-1">₹{costs.totalINR}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Total Cost</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
              <div className="text-2xl font-heading text-green-400 mb-1">{alreadyOwnedCount}</div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">Owned</div>
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
                className="w-full pl-11 pr-11 py-3 bg-neutral-900/40 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-800 rounded transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={selectAll} 
                disabled={availableChapters.length === 0} 
                className="px-4 py-3 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm uppercase tracking-wider hover:bg-neutral-700 disabled:opacity-50 transition-all border border-neutral-700 active:scale-95"
              >
                Select All
              </button>
              <button 
                onClick={clearSelection} 
                disabled={selectedChapters.length === 0} 
                className="px-4 py-3 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm uppercase tracking-wider hover:bg-neutral-700 disabled:opacity-50 transition-all border border-neutral-700 active:scale-95"
              >
                Clear
              </button>
            </div>
          </div>

          {/* All Premium Chapters Owned */}
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
                className="inline-block px-6 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all active:scale-95"
              >
                Start Reading
              </Link>
            </div>
          )}

          {/* Search No Results */}
          {availableChapters.length === 0 && searchQuery && (
            <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
              <Search className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-heading text-neutral-300 mb-2">No chapters found</h3>
              <p className="text-neutral-500 font-body mb-4">
                No chapters match &quot;{searchQuery}&quot;
              </p>
              <button
                onClick={clearSearch}
                className="px-6 py-2 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm hover:bg-neutral-700 transition-colors active:scale-95"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Chapters Grid */}
          {availableChapters.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {availableChapters.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  isSelected={selectedChapters.includes(chapter.id)}
                  onToggle={toggleChapter}
                />
              ))}
            </div>
          )}

          {/* Mobile Spacer */}
          <div className="h-20 md:hidden" aria-hidden="true" />
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 p-6 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <div className="text-sm text-neutral-400 font-body mb-1">
                {selectedChapters.length} chapter{selectedChapters.length !== 1 ? 's' : ''} selected
                {selectedChapters.length > 0 && !canPurchase && (
                  <span className="text-red-400 ml-2">(min {PRICING.CUSTOM_SELECTION.minChapters} required)</span>
                )}
              </div>
              <div className="text-2xl font-heading text-neutral-100">
                Total: ₹{costs.totalINR}
              </div>
            </div>

            {/* Payment Button - Only Razorpay */}
            <div className="w-full md:w-auto">
              <button
                onClick={handleRazorpayPurchase}
                disabled={!canPurchase || isRazorpayProcessing}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                {isRazorpayProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Pay with Razorpay
                  </>
                )}
              </button>
              
              {/* PayPal button commented out */}
              {/* {paymentMethod === 'paypal' && (
                <div className={`w-full md:w-64 ${!canPurchase ? 'opacity-50 pointer-events-none' : ''}`}>
                  <PayPalButton
                    purchaseType="custom"
                    chapters={selectedChapters}
                    disabled={!canPurchase}
                    onSuccess={handlePaymentSuccess}
                    onError={(error) => console.error('PayPal error:', error)}
                  />
                </div>
              )} */}
            </div>
          </div>
          
          {/* Payment method info */}
          <div className="mt-3 text-center md:text-right">
            <p className="text-xs text-neutral-500">
              🔒 Secure payment powered by Razorpay • UPI, Cards, Net Banking
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Export with Suspense
// ============================================================================

export default function CustomSelectionPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CustomSelectionInner />
    </Suspense>
  )
}