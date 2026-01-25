// components/PricingPlans.tsx
"use client"

import { pricingPlans, PRICING } from "@/data/chapters"
import { Check, Crown, Sparkles, Zap, CreditCard, Globe, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthContext"
import { useRazorpay } from "@/lib/razorpay/hooks"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import dynamic from 'next/dynamic'

// Dynamic import for PayPal button to avoid SSR issues
const PayPalButton = dynamic(() => import('./PayPalButton'), {
  ssr: false,
  loading: () => (
    <div className="h-12 bg-neutral-800/50 rounded-lg animate-pulse" />
  ),
})

type PaymentMethod = 'razorpay' | 'paypal'

// Currency conversion rate (update periodically)
const USD_TO_INR = 83.5

export default function PricingPlans() {
  const [mounted, setMounted] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { initializePayment, isProcessing: isRazorpayProcessing } = useRazorpay()
  const [activeTab, setActiveTab] = useState<'packages' | 'custom'>('packages')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay')
  const [error, setError] = useState<string | null>(null)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Safe user tier access
  const userTier = user?.tier || 'free'
  const hasCompletePack = userTier === 'complete'
  const ownedChaptersCount = user?.ownedChapters?.length ?? 0

  const handleRazorpayPurchase = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please login to make a purchase')
      // Scroll to error
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

  const handlePaymentSuccess = useCallback(() => {
    // Show success message before reload
    const successMsg = document.createElement('div')
    successMsg.className = 'fixed top-4 right-4 z-[9999] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-top'
    successMsg.textContent = '✓ Purchase successful! Reloading...'
    document.body.appendChild(successMsg)
    
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }, [])

  const formatPrice = useCallback((inrPrice: number, method: PaymentMethod) => {
    if (inrPrice === 0) return 'Free'
    if (method === 'razorpay') return `₹${inrPrice.toLocaleString('en-IN')}`
    return `$${(inrPrice / USD_TO_INR).toFixed(2)}`
  }, [])

  const formatPricePerChapter = useCallback((inrPrice: number | undefined, method: PaymentMethod) => {
    if (!inrPrice) return null
    if (method === 'razorpay') return `₹${inrPrice}/chapter`
    return `$${(inrPrice / USD_TO_INR).toFixed(2)}/chapter`
  }, [])

  // Show loading state during hydration
  if (!mounted) {
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

        {/* Loading skeleton */}
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

        {/* User Status */}
        {isAuthenticated && user && (
          <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800/50 rounded-full">
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
                onClick={() => setError(null)}
                className="text-xs text-red-400 hover:text-red-300 mt-1 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-neutral-900/60 border border-neutral-800 rounded-xl p-1.5 gap-1">
          <button
            onClick={() => setPaymentMethod('razorpay')}
            className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-lg font-ui text-xs md:text-sm transition-all ${
              paymentMethod === 'razorpay'
                ? 'bg-[#9f1239] text-white shadow-lg'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            aria-label="Pay with Razorpay (India)"
          >
            <CreditCard className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">India (UPI/Cards)</span>
            <span className="sm:hidden">India</span>
          </button>
          <button
            onClick={() => setPaymentMethod('paypal')}
            className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-lg font-ui text-xs md:text-sm transition-all ${
              paymentMethod === 'paypal'
                ? 'bg-[#0070ba] text-white shadow-lg'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            aria-label="Pay with PayPal (International)"
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">International (PayPal)</span>
            <span className="sm:hidden">PayPal</span>
          </button>
        </div>
      </div>

      {/* Payment Method Info */}
      <div className="text-center mb-12">
        {paymentMethod === 'razorpay' ? (
          <p className="text-xs md:text-sm text-neutral-500 font-body">
            Pay with UPI, Credit/Debit Cards, Net Banking • Prices in <strong className="text-neutral-400">INR (₹)</strong>
          </p>
        ) : (
          <p className="text-xs md:text-sm text-neutral-500 font-body">
            Pay with PayPal, Credit/Debit Cards • Prices in <strong className="text-neutral-400">USD ($)</strong>
          </p>
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
          aria-label="View package plans"
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
          aria-label="Select custom chapters"
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
                      <Check className="w-3 h-3 text-white" aria-hidden="true" />
                      <span className="text-[9px] font-ui tracking-[0.3em] uppercase text-white">
                        Purchased
                      </span>
                    </div>
                  </div>
                ) : plan.popular ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-red-600 to-red-800 rounded-full border border-red-500/50 shadow-lg">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-white" aria-hidden="true" />
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

                <div className="mb-6 md:mb-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl md:text-5xl lg:text-6xl font-heading text-neutral-100">
                      {formatPrice(plan.price, paymentMethod)}
                    </span>
                  </div>
                  {plan.pricePerChapter && (
                    <div className="text-xs md:text-sm text-neutral-500 font-body">
                      {formatPricePerChapter(plan.pricePerChapter, paymentMethod)}
                    </div>
                  )}
                </div>

                <div className="mb-6 p-4 bg-gradient-to-br from-[#9f1239]/10 to-transparent border border-[#9f1239]/30 rounded-xl">
                  <div className="text-2xl md:text-3xl font-heading text-[#9f1239] mb-1">
                    {plan.chaptersCount}
                  </div>
                  <div className="text-[10px] md:text-xs text-neutral-500 font-ui uppercase tracking-wider">
                    Chapter{plan.chaptersCount > 1 ? 's' : ''}
                  </div>
                </div>

                <ul className="space-y-3 mb-6 md:mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-4 md:w-5 h-4 md:h-5 text-[#9f1239] flex-shrink-0 mt-0.5" aria-hidden="true" />
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
                    aria-label="Already purchased"
                  >
                    ✓ Purchased
                  </button>
                ) : !isAuthenticated ? (
                  <Link
                    href="/login"
                    className="block w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 transition-all text-center shadow-lg hover:shadow-red-900/20"
                  >
                    Login to Purchase
                  </Link>
                ) : paymentMethod === 'razorpay' ? (
                  <button
                    onClick={handleRazorpayPurchase}
                    disabled={isRazorpayProcessing}
                    className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-red-900/20"
                    aria-busy={isRazorpayProcessing}
                  >
                    {isRazorpayProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        <span className="hidden sm:inline">Processing...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Pay with Razorpay</span>
                        <span className="sm:hidden">Buy Now</span>
                      </>
                    )}
                  </button>
                ) : (
                  <PayPalButton
                    purchaseType="complete"
                    onSuccess={handlePaymentSuccess}
                  />
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
            <Zap className="w-10 h-10 md:w-12 md:h-12 text-[#9f1239] mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl md:text-2xl font-heading text-neutral-100 mb-3">
              Custom Chapter Selection
            </h3>
            <p className="text-sm md:text-base text-neutral-400 font-body mb-4 md:mb-6">
              Pick exactly which chapters you want • {formatPricePerChapter(PRICING.CUSTOM_SELECTION.pricePerChapter, paymentMethod)}
            </p>
            <p className="text-xs md:text-sm text-neutral-500 font-body mb-6 md:mb-8">
              Minimum {PRICING.CUSTOM_SELECTION.minChapters} chapters ({formatPrice(PRICING.CUSTOM_SELECTION.minAmount, paymentMethod)})
            </p>
            
            {!isAuthenticated ? (
              <Link
                href="/login"
                className="inline-block px-6 md:px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all shadow-lg hover:shadow-red-900/20"
              >
                Login to Select Chapters
              </Link>
            ) : (
              <Link
                href={`/custom-selection?payment=${paymentMethod}`}
                className="inline-block px-6 md:px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all shadow-lg hover:shadow-red-900/20"
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
          <span className="flex items-center gap-2">
            <CreditCard className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" />
            Razorpay (India)
          </span>
          <span className="flex items-center gap-2">
            <Globe className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" />
            PayPal (International)
          </span>
        </div>
        <p className="text-[10px] md:text-xs text-neutral-600 font-body px-4">
          🔒 100% secure and encrypted payments
        </p>
      </div>
    </section>
  )
}