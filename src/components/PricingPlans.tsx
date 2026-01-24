// components/PricingPlans.tsx
"use client"

import { pricingPlans, PRICING } from "@/data/chapters"
import { Check, Crown, Sparkles, Zap, CreditCard, Globe } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthContext"
import { useRazorpay } from "@/lib/razorpay/hooks"
import { useState, useEffect } from "react"
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

// Loading skeleton that matches server render structure
function PricingPlansSkeleton() {
  return (
    <section id="pricing" className="max-w-7xl mx-auto px-6 md:px-8 py-32 reveal">
      {/* Header */}
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

      {/* Payment Method Selector Skeleton */}
      <div className="flex justify-center gap-4 mb-8">
        <div className="inline-flex bg-neutral-900/60 border border-neutral-800 rounded-xl p-1.5">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-800/50 animate-pulse">
            <div className="w-4 h-4 bg-neutral-700 rounded" />
            <div className="w-24 h-4 bg-neutral-700 rounded" />
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg">
            <div className="w-4 h-4 bg-neutral-800 rounded" />
            <div className="w-28 h-4 bg-neutral-800 rounded" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex justify-center gap-4 mb-12">
        <div className="px-6 py-3 rounded-lg bg-neutral-800/50 animate-pulse w-28 h-12" />
        <div className="px-6 py-3 rounded-lg bg-neutral-900/40 border border-neutral-800 w-36 h-12" />
      </div>

      {/* Cards Skeleton */}
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

export default function PricingPlans() {
  const [mounted, setMounted] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { initializePayment, isProcessing: isRazorpayProcessing } = useRazorpay()
  const [activeTab, setActiveTab] = useState<'packages' | 'custom'>('packages')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay')

  // Handle hydration - only render interactive content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Safe user tier access
  const userTier = user?.tier || 'free'
  const hasCompletePack = userTier === 'complete'
  const ownedChaptersCount = user?.ownedChapters?.length ?? 0

  const handleRazorpayPurchase = async () => {
    await initializePayment('complete', { tier: 'complete' })
  }

  const handlePaymentSuccess = () => {
    // Refresh user data or redirect
    window.location.reload()
  }

  // Show skeleton during SSR and initial hydration
  if (!mounted) {
    return <PricingPlansSkeleton />
  }

  return (
    <section id="pricing" className="max-w-7xl mx-auto px-6 md:px-8 py-32 reveal">
      {/* Header */}
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
                <>{ownedChaptersCount} Custom Chapters Owned</>
              ) : (
                <>Free Tier</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <div className="flex justify-center gap-4 mb-8">
        <div className="inline-flex bg-neutral-900/60 border border-neutral-800 rounded-xl p-1.5">
          <button
            onClick={() => setPaymentMethod('razorpay')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-ui text-sm transition-all ${
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
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-ui text-sm transition-all ${
              paymentMethod === 'paypal'
                ? 'bg-[#0070ba] text-white shadow-lg'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>International (PayPal)</span>
          </button>
        </div>
      </div>

      {/* Payment Method Info */}
      <div className="text-center mb-12">
        {paymentMethod === 'razorpay' ? (
          <p className="text-sm text-neutral-500">
            Pay with UPI, Credit/Debit Cards, Net Banking • Prices in INR
          </p>
        ) : (
          <p className="text-sm text-neutral-500">
            Pay with PayPal, Credit/Debit Cards • Prices in USD
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-12">
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-6 py-3 rounded-lg font-heading text-sm uppercase tracking-wider transition-all ${
            activeTab === 'packages'
              ? 'bg-[#9f1239] text-white'
              : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          Packages
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-6 py-3 rounded-lg font-heading text-sm uppercase tracking-wider transition-all ${
            activeTab === 'custom'
              ? 'bg-[#9f1239] text-white'
              : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          Custom Selection
        </button>
      </div>

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan) => {
            const isPurchased = hasCompletePack && plan.id === 'complete'
            const isFree = plan.id === 'free'
            const usdPrice = plan.price > 0 ? (plan.price / 83.5).toFixed(2) : '0'

            return (
              <div
                key={plan.id}
                className={`relative bg-neutral-900/40 backdrop-blur-sm border rounded-2xl p-8 transition-all duration-300 ${
                  isPurchased
                    ? 'border-green-800/60 shadow-xl shadow-green-900/20'
                    : plan.popular
                    ? 'border-[#9f1239] shadow-2xl shadow-[#9f1239]/30 md:scale-105'
                    : 'border-neutral-800/60'
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
                  <h3 className="text-2xl md:text-3xl font-heading text-neutral-100 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-neutral-500 text-sm font-body">
                    {plan.chapterRange}
                  </p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    {paymentMethod === 'razorpay' ? (
                      <span className="text-5xl md:text-6xl font-heading text-neutral-100">
                        {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                      </span>
                    ) : (
                      <span className="text-5xl md:text-6xl font-heading text-neutral-100">
                        {plan.price === 0 ? 'Free' : `$${usdPrice}`}
                      </span>
                    )}
                  </div>
                  {plan.pricePerChapter && paymentMethod === 'razorpay' && (
                    <div className="text-sm text-neutral-500 font-body">
                      ₹{plan.pricePerChapter}/chapter
                    </div>
                  )}
                  {plan.pricePerChapter && paymentMethod === 'paypal' && (
                    <div className="text-sm text-neutral-500 font-body">
                      ${(plan.pricePerChapter / 83.5).toFixed(2)}/chapter
                    </div>
                  )}
                </div>

                <div className="mb-6 p-4 bg-gradient-to-br from-[#9f1239]/10 to-transparent border border-[#9f1239]/30 rounded-xl">
                  <div className="text-3xl font-heading text-[#9f1239] mb-1">
                    {plan.chaptersCount}
                  </div>
                  <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
                    Chapters
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#9f1239] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-neutral-400 font-body">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Action Buttons */}
                {isFree ? (
                  <Link
                    href="#chapters"
                    className="block w-full py-3 px-6 bg-neutral-800 text-neutral-300 rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-neutral-700 transition-all text-center"
                  >
                    Start Reading
                  </Link>
                ) : isPurchased ? (
                  <button
                    disabled
                    className="w-full py-3 px-6 bg-green-900/30 text-green-400 border border-green-800/50 rounded-lg font-heading text-sm tracking-[0.2em] uppercase cursor-default"
                  >
                    ✓ Purchased
                  </button>
                ) : paymentMethod === 'razorpay' ? (
                  <button
                    onClick={handleRazorpayPurchase}
                    disabled={isRazorpayProcessing}
                    className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isRazorpayProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Pay with Razorpay
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
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-8 text-center">
            <Zap className="w-12 h-12 text-[#9f1239] mx-auto mb-4" />
            <h3 className="text-2xl font-heading text-neutral-100 mb-3">
              Custom Chapter Selection
            </h3>
            {paymentMethod === 'razorpay' ? (
              <>
                <p className="text-neutral-400 font-body mb-6">
                  Pick exactly which chapters you want • ₹{PRICING.CUSTOM_SELECTION.pricePerChapter}/chapter
                </p>
                <p className="text-sm text-neutral-500 font-body mb-8">
                  Minimum {PRICING.CUSTOM_SELECTION.minChapters} chapters (₹{PRICING.CUSTOM_SELECTION.minAmount})
                </p>
              </>
            ) : (
              <>
                <p className="text-neutral-400 font-body mb-6">
                  Pick exactly which chapters you want • ${(PRICING.CUSTOM_SELECTION.pricePerChapter / 83.5).toFixed(2)}/chapter
                </p>
                <p className="text-sm text-neutral-500 font-body mb-8">
                  Minimum {PRICING.CUSTOM_SELECTION.minChapters} chapters (${(PRICING.CUSTOM_SELECTION.minAmount / 83.5).toFixed(2)})
                </p>
              </>
            )}
            <Link
              href={`/custom-selection?payment=${paymentMethod}`}
              className="inline-block px-8 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-[#881337] transition-all"
            >
              Select Chapters
            </Link>
          </div>
        </div>
      )}

      {/* Trust Badges */}
      <div className="mt-16 text-center space-y-4">
        <p className="text-sm text-neutral-500 font-body">
          All purchases are one-time payments with lifetime access. No subscriptions.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs text-neutral-600">
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Razorpay (India)
          </span>
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            PayPal (International)
          </span>
        </div>
        <p className="text-xs text-neutral-600 font-body">
          100% secure and encrypted payments
        </p>
      </div>
    </section>
  )
}