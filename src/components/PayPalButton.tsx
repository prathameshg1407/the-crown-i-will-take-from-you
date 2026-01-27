// components/PayPalButton.tsx
"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePayPal } from '@/lib/paypal/hooks'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import type { PurchaseType } from '@/lib/supabase/database.types'

interface PayPalButtonProps {
  purchaseType: PurchaseType
  tier?: 'complete'
  customChapters?: number[]
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
}

export default function PayPalButton({
  purchaseType,
  tier,
  customChapters,
  onSuccess,
  onError,
  className = '',
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderAttempt, setRenderAttempt] = useState(0)
  const [renderError, setRenderError] = useState<string | null>(null)
  const hasRenderedRef = useRef(false)

  const { 
    isLoading, 
    isReady, 
    isProcessing, 
    error: hookError,
    currency,
    renderButton,
  } = usePayPal({
    onSuccess,
    onError,
  })

  // Render buttons when ready
  const handleRender = useCallback(async () => {
    if (!containerRef.current || !isReady || hasRenderedRef.current) {
      return
    }

    hasRenderedRef.current = true
    setRenderError(null)

    const success = await renderButton(
      containerRef.current, 
      purchaseType, 
      { tier, customChapters }
    )

    if (!success) {
      setRenderError('Failed to load PayPal button')
      hasRenderedRef.current = false
    }
  }, [isReady, renderButton, purchaseType, tier, customChapters])

  useEffect(() => {
    handleRender()
  }, [handleRender, renderAttempt])

  // Re-render when options change
  useEffect(() => {
    hasRenderedRef.current = false
    handleRender()
  }, [purchaseType, tier, customChapters?.length, handleRender])

  const handleRetry = () => {
    hasRenderedRef.current = false
    setRenderError(null)
    setRenderAttempt(prev => prev + 1)
  }

  const displayError = renderError || hookError

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-6 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
        <span className="text-sm text-neutral-400">Loading PayPal...</span>
      </div>
    )
  }

  // Error state
  if (displayError && !isReady) {
    return (
      <div className={`text-center py-4 px-4 bg-red-900/20 border border-red-800/50 rounded-lg ${className}`}>
        <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-300 mb-3">{displayError}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-800/50 hover:bg-red-800/70 text-red-200 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center z-10 rounded-lg backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-3" />
          <span className="text-sm text-white font-medium">Processing payment...</span>
          <span className="text-xs text-neutral-400 mt-1">Please wait</span>
        </div>
      )}
      
      {/* PayPal Button Container */}
      <div 
        ref={containerRef} 
        className="paypal-button-container min-h-[50px]"
        data-currency={currency}
      />
      
      {/* Currency Info */}
      <p className="text-xs text-neutral-500 text-center mt-3">
        Secure payment via PayPal • {currency}
      </p>

      {/* Render Error with Retry */}
      {renderError && isReady && (
        <div className="mt-3 text-center">
          <p className="text-xs text-red-400 mb-2">{renderError}</p>
          <button
            onClick={handleRetry}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Click to retry
          </button>
        </div>
      )}
    </div>
  )
}