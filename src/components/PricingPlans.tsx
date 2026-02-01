// components/PricingPlans.tsx
"use client"

import { pricingPlans, PRICING } from "@/data/chapters"
import { Check, Crown, Sparkles, Zap, CreditCard, AlertCircle, Globe, RefreshCw, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthContext"
import { useRazorpay } from "@/lib/razorpay/hooks"
import { useCurrency } from "@/lib/currency/CurrencyContext"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import dynamic from 'next/dynamic'
import PaymentMethodSelector, { PaymentMethod } from './PaymentMethodSelector'
import toast from 'react-hot-toast'

// ============================================================================
// Dynamic Imports
// ============================================================================

const PayPalButton = dynamic(() => import('./PayPalButton'), {
  ssr: false,
  loading: () => (
    <div className="h-12 bg-neutral-800/50 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-neutral-500 text-sm">Loading PayPal...</span>
    </div>
  ),
})

// ============================================================================
// Constants
// ============================================================================

// USD prices for PayPal (pre-calculated to avoid runtime conversion issues)
const USD_PRICES = {
  complete: 18.47,
  free: 0,
  perChapter: 0.25,
  minCustom: 2.50,
} as const

// ============================================================================
// Skeleton Component
// ============================================================================

function PricingPlansSkeleton() {
  return (
    <section id="pricing" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-32">
      <div className="text-center mb-16">
        <div className="mb-6 inline-flex items-center gap-2 px-5 py-2 border border-amber-900/30 rounded-full bg-amber-950/10 backdrop-blur-sm">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-amber-200/60 text-[9px] font-ui tracking-[0.45em] uppercase font-light">
            Premium Access
          </span>
        </div>
        
        <h2 className="text-4xl md:text-6xl font-heading text-neutral-100 mb-6 tracking-tight">
          Unlock the Complete <span className="gradient-text italic">Story</span>
        </h2>
        
        <p className="text-lg md:text-xl text-neutral-400 font-body max-w-2xl mx-auto">
          One-time payment. Lifetime access. No subscriptions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/60 rounded-2xl p-8"
          >
            <div className="h-8 bg-neutral-800/50 rounded w-32 mb-4 animate-pulse" />
            <div className="h-16 bg-neutral-800/50 rounded w-24 mb-6 animate-pulse" />
            <div className="space-y-3 mb-8">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-4 bg-neutral-800/50 rounded animate-pulse" />
              ))}
            </div>
            <div className="h-12 bg-neutral-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// Price Display Component
// ============================================================================

function PriceDisplay({ 
  inrPrice,
  usdPrice,
  showBoth = false,
  isInternational = false,
  className = ""
}: { 
  inrPrice: number
  usdPrice?: number
  showBoth?: boolean
  isInternational?: boolean
  className?: string
}) {
  const { isLoading, convertFromINR } = useCurrency()
  const [converted, setConverted] = useState<{
    formatted: string
    currency: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    if (isInternational && inrPrice > 0) {
      if (usdPrice !== undefined) {
        // Use pre-defined USD price
        setConverted({
          formatted: `$${usdPrice.toFixed(2)}`,
          currency: 'USD',
        })
      } else {
        // Convert dynamically
        convertFromINR(inrPrice)
          .then((result) => {
            if (!cancelled) {
              setConverted({
                formatted: result.formatted,
                currency: result.currency,
              })
            }
          })
          .catch((error) => {
            console.error('Price conversion failed:', error)
          })
      }
    } else {
      setConverted(null)
    }

    return () => {
      cancelled = true
    }
  }, [inrPrice, usdPrice, isInternational, convertFromINR])

  if (inrPrice === 0) return <span className={className}>Free</span>

  if (isLoading) {
    return <span className={`animate-pulse ${className}`}>...</span>
  }

  if (isInternational && converted) {
    return (
      <span className={className}>
        {converted.formatted}
        {showBoth && (
          <span className="text-sm text-neutral-500 ml-2">
            (₹{inrPrice.toLocaleString('en-IN')})
          </span>
        )}
      </span>
    )
  }

  return <span className={className}>₹{inrPrice.toLocaleString('en-IN')}</span>
}

// ============================================================================
// Main Component
// ============================================================================

export default function PricingPlans() {
  const [mounted, setMounted] = useState(false)
  const { user, isAuthenticated, refreshUser } = useAuth()
  const { initializePayment, isProcessing: isRazorpayProcessing } = useRazorpay()
  const { 
    location, 
    isLoading: isCurrencyLoading, 
    isInternational,
    refreshLocation 
  } = useCurrency()
  
  const [activeTab, setActiveTab] = useState<'packages' | 'custom'>('packages')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay')
  const [error, setError] = useState<string | null>(null)
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false)
  const [isPayPalProcessing, setIsPayPalProcessing] = useState(false)

  // Hydration fix
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-select payment method based on location
  useEffect(() => {
    if (mounted && !isCurrencyLoading) {
      setPaymentMethod(isInternational ? 'paypal' : 'razorpay')
    }
  }, [mounted, isCurrencyLoading, isInternational])

  // Derived state
  const userTier = mounted ? (user?.tier || 'free') : 'free'
  const hasCompletePack = mounted ? (userTier === 'complete') : false
  const ownedChaptersCount = mounted ? (user?.ownedChapters?.length ?? 0) : 0
  const isPayPal = paymentMethod === 'paypal'
  const isProcessing = isRazorpayProcessing || isPayPalProcessing

  // Handlers
  const handleRefreshLocation = useCallback(async () => {
    setIsRefreshingLocation(true)
    try {
      await refreshLocation()
    } catch (err) {
      console.error('Failed to refresh location:', err)
      toast.error('Failed to detect location')
    } finally {
      setIsRefreshingLocation(false)
    }
  }, [refreshLocation])

  const handleRazorpayPurchase = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please login to make a purchase')
      setTimeout(() => {
        document.getElementById('pricing-error')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }, 100)
      return
    }

    try {
      setError(null)
      await initializePayment('complete', { tier: 'complete' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.')
    }
  }, [isAuthenticated, initializePayment])

  const handlePaymentSuccess = useCallback(async () => {
    setIsPayPalProcessing(false)
    
    try {
      await refreshUser?.()
      toast.success('🎉 Payment successful! Complete Pack unlocked.', {
        duration: 6000,
        style: { background: '#065f46', color: '#fff' },
      })
    } catch (err) {
      console.error('Failed to refresh user:', err)
    }
    
    // Scroll to chapters
    setTimeout(() => {
      const chaptersSection = document.getElementById('chapters')
      chaptersSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 1500)
  }, [refreshUser])

  const handlePaymentError = useCallback((error: Error) => {
    setIsPayPalProcessing(false)
    setError(error.message || 'Payment failed. Please try again.')
  }, [])

  const handlePaymentCancel = useCallback(() => {
    setIsPayPalProcessing(false)
    toast('Payment cancelled', { icon: 'ℹ️', duration: 3000 })
  }, [])

  const handlePaymentProcessing = useCallback((processing: boolean) => {
    setIsPayPalProcessing(processing)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  // Loading state
  if (!mounted) {
    return <PricingPlansSkeleton />
  }

  return (
    <section 
      id="pricing" 
      className="w-full max-w-7xl mx-auto px-6 md:px-8 py-20 md:py-32 relative z-10"
    >
      {/* Header */}
      <div className="text-center mb-12 md:mb-16">
        <div className="mb-6 inline-flex items-center gap-2 px-5 py-2 border border-amber-900/30 rounded-full bg-amber-950/10 backdrop-blur-sm">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-amber-200/60 text-[9px] font-ui tracking-[0.45em] uppercase font-light">
            Premium Access
          </span>
        </div>
        
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading text-neutral-100 mb-6 tracking-tight px-4">
          Unlock the Complete <span className="gradient-text italic">Story</span>
        </h2>
        
        <p className="text-base md:text-lg lg:text-xl text-neutral-400 font-body max-w-2xl mx-auto px-4">
          One-time payment. Lifetime access. No subscriptions.
        </p>

        {/* Location Indicator */}
        {location && !isCurrencyLoading && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-neutral-900/60 border border-neutral-800 rounded-full">
            <Globe className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-400">
              {location.country} • {isInternational ? 'PayPal (International)' : 'Razorpay (India)'}
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

        {/* User Status */}
        {isAuthenticated && user && (
          <div className="mt-4 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800/50 rounded-full">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
            </div>
            <span className="text-sm text-green-400 font-ui uppercase tracking-wider">
              {hasCompletePack ? (
                <>✓ Complete Pack Active</>
              ) : ownedChaptersCount > 0 ? (
                <>{ownedChaptersCount} Custom Chapter{ownedChaptersCount > 1 ? 's' : ''} Owned</>
              ) : (
                <>Free Tier</>
              )}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div 
            id="pricing-error"
            className="mt-6 max-w-md mx-auto px-4 py-3 bg-red-900/20 border border-red-800/50 rounded-lg flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-400 hover:text-red-300 mt-1 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <PaymentMethodSelector
        selected={paymentMethod}
        onChange={setPaymentMethod}
        isInternational={isInternational}
        className="mb-8"
      />

      {/* Payment Method Info */}
      <div className="text-center mb-12">
        {paymentMethod === 'razorpay' ? (
          <p className="text-xs md:text-sm text-neutral-500 font-body">
            Pay with UPI, Credit/Debit Cards, Net Banking • Prices in INR (₹)
          </p>
        ) : (
          <>
            <p className="text-xs md:text-sm text-neutral-500 font-body">
              Pay securely with PayPal • Prices in USD ($)
            </p>
            <p className="text-xs text-blue-400/80 mt-2">
              💳 PayPal accepts all major international credit/debit cards
            </p>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-3 md:gap-4 mb-12">
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-heading text-xs md:text-sm uppercase tracking-wider transition-all ${
            activeTab === 'packages'
              ? 'bg-[#9f1239] text-white shadow-lg'
              : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          Packages
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-heading text-xs md:text-sm uppercase tracking-wider transition-all ${
            activeTab === 'custom'
              ? 'bg-[#9f1239] text-white shadow-lg'
              : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          Custom Selection
        </button>
      </div>

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan) => {
            const isPurchased = hasCompletePack && plan.id === 'complete'
            const isFree = plan.id === 'free'
            const planUsdPrice = USD_PRICES[plan.id as keyof typeof USD_PRICES] ?? 0

            return (
              <div
                key={plan.id}
                className={`relative bg-neutral-900/40 backdrop-blur-sm border rounded-2xl p-6 md:p-8 transition-all duration-300 ${
                  isPurchased
                    ? 'border-green-800/60 shadow-xl shadow-green-900/20'
                    : plan.popular
                    ? 'border-[#9f1239] shadow-2xl shadow-[#9f1239]/30 md:scale-105'
                    : 'border-neutral-800/60 hover:border-neutral-700/60'
                }`}
              >
                {/* Badge */}
                {isPurchased ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-green-600 to-emerald-700 rounded-full border border-green-500/50 shadow-lg">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-white" />
                      <span className="text-[9px] font-ui tracking-[0.3em] uppercase text-white">
                        Purchased
                      </span>
                    </div>
                  </div>
                ) : plan.popular ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-red-600 to-red-800 rounded-full border border-red-500/50 shadow-lg">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-[9px] font-ui tracking-[0.3em] uppercase text-white">
                        Best Value
                      </span>
                    </div>
                  </div>
                ) : isFree ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-full border border-emerald-500/50">
                    <span className="text-[9px] font-ui tracking-[0.3em] uppercase text-white">
                      Free Forever
                    </span>
                  </div>
                ) : null}

                {/* Content */}
                <div className="mb-6 mt-4">
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-heading text-neutral-100 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-neutral-500 text-xs md:text-sm font-body">
                    {plan.chapterRange}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6 md:mb-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl md:text-5xl lg:text-6xl font-heading text-neutral-100">
                      {plan.price === 0 ? (
                        'Free'
                      ) : isPayPal ? (
                        `$${planUsdPrice.toFixed(2)}`
                      ) : (
                        <PriceDisplay inrPrice={plan.price} />
                      )}
                    </span>
                  </div>
                  {plan.pricePerChapter && (
                    <div className="text-xs md:text-sm text-neutral-500 font-body">
                      {isPayPal ? (
                        `~$${(planUsdPrice / plan.chaptersCount).toFixed(2)}/chapter`
                      ) : (
                        <>~<PriceDisplay inrPrice={plan.pricePerChapter} />/chapter</>
                      )}
                    </div>
                  )}
                </div>

                {/* Chapter Count */}
                <div className="mb-6 p-4 bg-gradient-to-br from-[#9f1239]/10 to-transparent border border-[#9f1239]/30 rounded-xl">
                  <div className="text-2xl md:text-3xl font-heading text-[#9f1239] mb-1">
                    {plan.chaptersCount}
                  </div>
                  <div className="text-[10px] md:text-xs text-neutral-500 font-ui uppercase tracking-wider">
                    Chapter{plan.chaptersCount > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 md:mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-4 md:w-5 h-4 md:h-5 text-[#9f1239] flex-shrink-0 mt-0.5" />
                      <span className="text-xs md:text-sm text-neutral-400 font-body">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action Buttons */}
                {isFree ? (
                  <Link
                    href="#chapters"
                    className="block w-full py-3 px-6 bg-neutral-800 text-neutral-300 rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-neutral-700 transition-all text-center"
                  >
                    Start Reading
                  </Link>
                ) : isPurchased ? (
                  <button
                    disabled
                    className="w-full py-3 px-6 bg-green-900/30 text-green-400 border border-green-800/50 rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase cursor-default"
                  >
                    ✓ Purchased
                  </button>
                ) : !isAuthenticated ? (
                  <Link
                    href="/login"
                    className="block w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 transition-all text-center shadow-lg"
                  >
                    Login to Purchase
                  </Link>
                ) : isPayPal ? (
                  <PayPalButton
                    purchaseType="complete"
                    amountINR={plan.price}
                    disabled={isProcessing}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    onCancel={handlePaymentCancel}
                    onProcessing={handlePaymentProcessing}
                  />
                ) : (
                  <button
                    onClick={handleRazorpayPurchase}
                    disabled={isProcessing}
                    className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isRazorpayProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Pay ₹{plan.price.toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Custom Selection Tab */}
      {activeTab === 'custom' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 md:p-8 text-center">
            <Zap className="w-10 h-10 md:w-12 md:h-12 text-[#9f1239] mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-heading text-neutral-100 mb-3">
              Custom Chapter Selection
            </h3>
            <p className="text-sm md:text-base text-neutral-400 font-body mb-4 md:mb-6">
              Pick exactly which chapters you want •{' '}
              {isPayPal ? (
                `$${USD_PRICES.perChapter}`
              ) : (
                <PriceDisplay inrPrice={PRICING.CUSTOM_SELECTION.pricePerChapter} />
              )}
              /chapter
            </p>
            <p className="text-xs md:text-sm text-neutral-500 font-body mb-6 md:mb-8">
              Minimum {PRICING.CUSTOM_SELECTION.minChapters} chapters (
              {isPayPal ? (
                `$${USD_PRICES.minCustom}`
              ) : (
                <PriceDisplay inrPrice={PRICING.CUSTOM_SELECTION.minAmount} />
              )}
              )
            </p>
            
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="inline-block px-6 md:px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all shadow-lg"
              >
                Login to Select Chapters
              </Link>
            ) : (
              <Link
                href={`/custom-selection?payment=${paymentMethod}`}
                className="inline-block px-6 md:px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all shadow-lg"
              >
                Select Chapters
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Trust Badges */}
      <div className="mt-12 md:mt-16 text-center space-y-4">
        <p className="text-xs md:text-sm text-neutral-500 font-body px-4">
          All purchases are one-time payments with lifetime access. No subscriptions.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[10px] md:text-xs text-neutral-600 px-4">
          {paymentMethod === 'razorpay' ? (
            <span className="flex items-center gap-2">
              <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
              UPI • Cards • Net Banking
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Globe className="w-3 h-3 md:w-4 md:h-4" />
              PayPal • International Cards
            </span>
          )}
        </div>
        <p className="text-[10px] md:text-xs text-neutral-600 font-body px-4">
          🔒 100% secure payments powered by {paymentMethod === 'razorpay' ? 'Razorpay' : 'PayPal'}
        </p>
      </div>
    </section>
  )
}