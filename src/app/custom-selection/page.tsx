// app/custom-selection/page.tsx
"use client"

import { Suspense, useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { useRazorpay } from '@/lib/razorpay/hooks'
import { useCurrency } from '@/lib/currency/CurrencyContext'
import { chapters, PRICING } from '@/data/chapters'
import { 
  Check, 
  ShoppingCart, 
  ArrowLeft, 
  Search, 
  Crown, 
  CreditCard, 
  X, 
  Sparkles, 
  Globe, 
  RefreshCw,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'

// ============================================================================
// Dynamic Imports
// ============================================================================

const PayPalButton = dynamic(() => import('@/components/PayPalButton'), {
  ssr: false,
  loading: () => (
    <div className="h-12 bg-neutral-800/50 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-neutral-500 text-sm">Loading PayPal...</span>
    </div>
  ),
})

// ============================================================================
// Types
// ============================================================================

type PaymentMethod = 'razorpay' | 'paypal'

interface ChapterCardProps {
  chapter: typeof chapters[number]
  isSelected: boolean
  onToggle: (id: number) => void
  convertedPrice: string | null
  isInternational: boolean
}

interface ConvertedPrices {
  perChapter: string | null
  total: string | null
  completePack: string | null
}

// ============================================================================
// Price Display Component
// ============================================================================

function PriceDisplay({ 
  inrPrice, 
  showBoth = false,
  className = ""
}: { 
  inrPrice: number
  showBoth?: boolean
  className?: string
}) {
  const { isLoading, isInternational, convertFromINR } = useCurrency()
  const [converted, setConverted] = useState<{
    formatted: string
    currency: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    if (isInternational && inrPrice > 0) {
      convertFromINR(inrPrice).then((result) => {
        if (!cancelled) {
          setConverted({
            formatted: result.formatted,
            currency: result.currency,
          })
        }
      }).catch((error) => {
        console.error('Price conversion failed:', error)
      })
    } else {
      setConverted(null)
    }

    return () => {
      cancelled = true
    }
  }, [inrPrice, isInternational, convertFromINR])

  if (inrPrice === 0) return <span className={className}>Free</span>

  if (isLoading) {
    return <span className={`animate-pulse ${className}`}>...</span>
  }

  if (!isInternational) {
    return <span className={className}>₹{inrPrice.toLocaleString('en-IN')}</span>
  }

  if (converted) {
    return (
      <span className={className}>
        {converted.formatted}
        {showBoth && (
          <span className="text-neutral-500 ml-1">
            (₹{inrPrice.toLocaleString('en-IN')})
          </span>
        )}
      </span>
    )
  }

  return <span className={className}>₹{inrPrice.toLocaleString('en-IN')}</span>
}

// ============================================================================
// Chapter Card Component (Memoized)
// ============================================================================

const ChapterCard = memo(function ChapterCard({ 
  chapter, 
  isSelected, 
  onToggle,
  convertedPrice,
  isInternational
}: ChapterCardProps) {
  const priceINR = PRICING.CUSTOM_SELECTION.pricePerChapter

  const handleClick = useCallback(() => {
    onToggle(chapter.id)
  }, [onToggle, chapter.id])

  return (
    <button
      onClick={handleClick}
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
            {isInternational && convertedPrice ? (
              <>
                {convertedPrice}
                <span className="text-neutral-500 ml-1">(₹{priceINR})</span>
              </>
            ) : (
              <>₹{priceINR}</>
            )}
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
// Payment Method Selector Component
// ============================================================================

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  isInternational: boolean
}

function PaymentMethodSelector({ 
  paymentMethod, 
  onMethodChange,
  isInternational 
}: PaymentMethodSelectorProps) {
  return (
    <div className="mt-6 inline-flex bg-neutral-900/60 border border-neutral-800 rounded-xl p-1.5">
      <button
        onClick={() => onMethodChange('razorpay')}
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
        onClick={() => onMethodChange('paypal')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-ui text-sm transition-all ${
          paymentMethod === 'paypal'
            ? 'bg-[#0070ba] text-white shadow-lg'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Globe className="w-4 h-4" />
        <span>International (PayPal)</span>
      </button>
      
      {/* Auto-selected indicator for international users */}
      {isInternational && paymentMethod === 'paypal' && (
        <span className="ml-2 px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full self-center">
          Recommended
        </span>
      )}
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
  const { 
    location, 
    isLoading: isCurrencyLoading, 
    isInternational,
    convertFromINR,
    refreshLocation 
  } = useCurrency()
  const router = useRouter()
  
  // State
  const [selectedChapters, setSelectedChapters] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false)
  const [isPayPalProcessing, setIsPayPalProcessing] = useState(false)
  const [convertedPrices, setConvertedPrices] = useState<ConvertedPrices>({
    perChapter: null,
    total: null,
    completePack: null
  })
  
  // Payment method - auto-select PayPal for international users
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (searchParams.get('payment') as PaymentMethod) || 'razorpay'
  )

  const userTier = user?.tier || 'free'
  const hasCompletePack = userTier === 'complete'

  // Auto-select PayPal for international users
  useEffect(() => {
    if (isInternational && !searchParams.get('payment')) {
      setPaymentMethod('paypal')
    }
  }, [isInternational, searchParams])

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

  // Convert prices when international
  useEffect(() => {
    let cancelled = false

    if (isInternational && !isCurrencyLoading) {
      const convertPrices = async () => {
        try {
          const [perChapter, total, completePack] = await Promise.all([
            convertFromINR(PRICING.CUSTOM_SELECTION.pricePerChapter),
            convertFromINR(costs.totalINR),
            convertFromINR(PRICING.COMPLETE_PACK.price),
          ])
          
          if (!cancelled) {
            setConvertedPrices({
              perChapter: perChapter.formatted,
              total: total.formatted,
              completePack: completePack.formatted,
            })
          }
        } catch (error) {
          console.error('Failed to convert prices:', error)
        }
      }
      convertPrices()
    } else if (!isInternational) {
      setConvertedPrices({
        perChapter: null,
        total: null,
        completePack: null
      })
    }

    return () => {
      cancelled = true
    }
  }, [isInternational, isCurrencyLoading, costs.totalINR, convertFromINR])

  const canPurchase = selectedChapters.length >= PRICING.CUSTOM_SELECTION.minChapters
  const isProcessing = isRazorpayProcessing || isPayPalProcessing

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

  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method)
  }, [])

  const handleRefreshLocation = useCallback(async () => {
    setIsRefreshingLocation(true)
    try {
      await refreshLocation()
    } catch (error) {
      console.error('Failed to refresh location:', error)
      toast.error('Failed to detect location')
    } finally {
      setIsRefreshingLocation(false)
    }
  }, [refreshLocation])

  const handleRazorpayPurchase = useCallback(async () => {
    if (!canPurchase || isProcessing) return
    
    try {
      await initializePayment('custom', {
        customChapters: selectedChapters,
      })
    } catch (error) {
      console.error('Razorpay purchase failed:', error)
      toast.error('Failed to start checkout. Please try again.')
    }
  }, [canPurchase, isProcessing, initializePayment, selectedChapters])

  const handlePayPalSuccess = useCallback(async () => {
    setIsPayPalProcessing(false)
    
    try {
      await refreshUser?.()
      toast.success('🎉 Payment successful! Your chapters have been unlocked.', {
        duration: 6000,
        style: { background: '#065f46', color: '#fff' },
      })
      router.push('/#chapters')
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // Still redirect, the user data will refresh eventually
      router.push('/#chapters')
    }
  }, [refreshUser, router])

  const handlePayPalError = useCallback((error: Error) => {
    console.error('PayPal error:', error)
    setIsPayPalProcessing(false)
    toast.error(error.message || 'Payment failed. Please try again.')
  }, [])

  const handlePayPalCancel = useCallback(() => {
    setIsPayPalProcessing(false)
    toast('Payment cancelled', { icon: 'ℹ️', duration: 3000 })
  }, [])

  const handlePayPalProcessing = useCallback((processing: boolean) => {
    setIsPayPalProcessing(processing)
  }, [])

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
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-ui">Back to Home</span>
          </Link>
          <div className="bg-neutral-900/40 border border-green-800/60 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-3xl font-heading text-neutral-100 mb-4">
              You Already Have Complete Access
            </h1>
            <p className="text-neutral-400 font-body mb-8">
              You have unlimited access to all chapters with your Complete Pack.
            </p>
            <Link 
              href="/#chapters" 
              className="inline-block px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all active:scale-95"
            >
              Start Reading
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const alreadyOwnedCount = ownedChapters.length
  const showRecommendation = selectedChapters.length >= 50

  // Get display price for button
  const buttonPrice = isInternational && convertedPrices.total 
    ? convertedPrices.total 
    : `₹${costs.totalINR}`

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />
      
      {/* Scrollable Content */}
      <div className="relative min-h-screen pb-72 md:pb-56">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-ui">Back to Home</span>
            </Link>
            
            <h1 className="text-4xl md:text-6xl font-heading text-neutral-100 mb-4 tracking-tight">
              Custom Chapter Selection
            </h1>
            
            <p className="text-lg text-neutral-400 font-body">
              Pick exactly which chapters you want • <PriceDisplay inrPrice={PRICING.CUSTOM_SELECTION.pricePerChapter} />/chapter
            </p>

            {/* Location Indicator */}
            {location && !isCurrencyLoading && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-neutral-900/60 border border-neutral-800 rounded-full">
                <Globe className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-400">
                  {location.country} • Prices shown in {location.currency}
                </span>
                <button 
                  onClick={handleRefreshLocation}
                  disabled={isRefreshingLocation}
                  className="ml-2 p-1 hover:bg-neutral-800 rounded-full transition-colors disabled:opacity-50"
                  title="Refresh location"
                >
                  <RefreshCw className={`w-3 h-3 text-neutral-500 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
            
            {/* Payment Method Selector */}
            <PaymentMethodSelector
              paymentMethod={paymentMethod}
              onMethodChange={handlePaymentMethodChange}
              isInternational={isInternational}
            />

            {/* Payment Info */}
            <div className="mt-4 flex items-center gap-2 text-neutral-500 text-sm">
              <CreditCard className="w-4 h-4" />
              <span>
                {paymentMethod === 'razorpay' 
                  ? 'Pay with UPI, Credit/Debit Cards, Net Banking'
                  : 'Pay securely with PayPal'
                }
                {isInternational && paymentMethod === 'razorpay' && ' • Payment processed in INR'}
              </span>
            </div>

            {/* International User Note */}
            {isInternational && paymentMethod === 'razorpay' && (
              <p className="mt-2 text-xs text-amber-500/80">
                💡 Prices shown in {location?.currency}. Payment will be processed in INR — your bank will handle conversion.
              </p>
            )}

            {/* PayPal recommendation for international */}
            {isInternational && paymentMethod === 'razorpay' && (
              <p className="mt-2 text-xs text-blue-400">
                💳 For smoother international payments, consider using PayPal.
              </p>
            )}
            
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
                      You&apos;re selecting {selectedChapters.length} chapters for{' '}
                      <PriceDisplay inrPrice={costs.totalINR} />. 
                      The Complete Pack gives you all {PRICING.COMPLETE_PACK.chapters} chapters for just{' '}
                      <PriceDisplay inrPrice={costs.completePackINR} /> — that&apos;s only{' '}
                      <PriceDisplay inrPrice={PRICING.COMPLETE_PACK.pricePerChapter} />/chapter!
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
              <div className="text-2xl font-heading text-neutral-100 mb-1">
                {availableChapters.length}
              </div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
                Available
              </div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
              <div className="text-2xl font-heading text-[#9f1239] mb-1">
                {selectedChapters.length}
              </div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
                Selected
              </div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
              <div className="text-2xl font-heading text-neutral-100 mb-1">
                {isInternational && convertedPrices.total ? (
                  <span title={`₹${costs.totalINR}`}>{convertedPrices.total}</span>
                ) : (
                  <>₹{costs.totalINR}</>
                )}
              </div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
                Total Cost
              </div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
              <div className="text-2xl font-heading text-green-400 mb-1">
                {alreadyOwnedCount}
              </div>
              <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
                Owned
              </div>
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
              <h3 className="text-xl font-heading text-neutral-100 mb-2">
                All Premium Chapters Owned!
              </h3>
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
              <h3 className="text-xl font-heading text-neutral-300 mb-2">
                No chapters found
              </h3>
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
                  convertedPrice={convertedPrices.perChapter}
                  isInternational={isInternational}
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
                  <span className="text-red-400 ml-2">
                    (min {PRICING.CUSTOM_SELECTION.minChapters} required)
                  </span>
                )}
              </div>
              <div className="text-2xl font-heading text-neutral-100">
                Total:{' '}
                {isInternational && convertedPrices.total ? (
                  <>
                    {convertedPrices.total}
                    <span className="text-base text-neutral-500 ml-2">
                      (₹{costs.totalINR})
                    </span>
                  </>
                ) : (
                  <>₹{costs.totalINR}</>
                )}
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="w-full md:w-auto">
              {paymentMethod === 'razorpay' ? (
                <button
                  onClick={handleRazorpayPurchase}
                  disabled={!canPurchase || isProcessing}
                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  {isRazorpayProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Pay {buttonPrice}
                    </>
                  )}
                </button>
              ) : (
                <div className={`w-full md:w-64 ${!canPurchase ? 'opacity-50 pointer-events-none' : ''}`}>
                  <PayPalButton
                    purchaseType="custom"
                    chapters={selectedChapters}
                    amountINR={costs.totalINR}
                    disabled={!canPurchase || isProcessing}
                    onSuccess={handlePayPalSuccess}
                    onError={handlePayPalError}
                    onCancel={handlePayPalCancel}
                    onProcessing={handlePayPalProcessing}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Payment method info */}
          <div className="mt-3 text-center md:text-right">
            <p className="text-xs text-neutral-500">
              {paymentMethod === 'razorpay' ? (
                <>
                  🔒 Secure payment powered by Razorpay • UPI, Cards, Net Banking
                  {isInternational && ' • Payment in INR'}
                </>
              ) : (
                <>
                  🔒 Secure payment powered by PayPal
                  {isInternational && location && ` • Pay in ${location.currency}`}
                </>
              )}
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