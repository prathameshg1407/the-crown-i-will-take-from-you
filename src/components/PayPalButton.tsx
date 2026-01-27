// components/PayPalButton.tsx
"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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
  const [hasRendered, setHasRendered] = useState(false)
  
  // Refs to track component lifecycle
  const isMountedRef = useRef(true)
  const isRenderingRef = useRef(false)
  const renderIdRef = useRef(0)

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

  // Create stable key for options to detect changes
  const optionsKey = useMemo(() => {
    const chaptersKey = customChapters ? customChapters.sort().join(',') : ''
    return `${purchaseType}-${tier || ''}-${chaptersKey}`
  }, [purchaseType, tier, customChapters])

  // Store latest options in ref for access in async operations
  const optionsRef = useRef({ purchaseType, tier, customChapters })
  optionsRef.current = { purchaseType, tier, customChapters }

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Main render effect
  useEffect(() => {
    // Generate unique ID for this render attempt
    const currentRenderId = ++renderIdRef.current

    const performRender = async () => {
      // Skip if already rendering or already rendered
      if (isRenderingRef.current || hasRendered) {
        return
      }

      // Wait for SDK to be ready
      if (!isReady) {
        return
      }

      // Check container exists
      const container = containerRef.current
      if (!container) {
        return
      }

      // Verify container is in DOM
      if (!document.body.contains(container)) {
        console.warn('[PayPal] Container not in DOM, skipping render')
        return
      }

      isRenderingRef.current = true
      setRenderError(null)

      try {
        // Small delay to ensure DOM stability after React updates
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if this render is still valid
        if (currentRenderId !== renderIdRef.current) {
          console.log('[PayPal] Render superseded by newer attempt')
          return
        }

        // Check if still mounted
        if (!isMountedRef.current) {
          console.log('[PayPal] Component unmounted, aborting render')
          return
        }

        // Re-verify container is still in DOM after delay
        if (!container || !document.body.contains(container)) {
          console.warn('[PayPal] Container removed during delay, aborting render')
          return
        }

        // Clear any existing content
        container.innerHTML = ''

        // Get current options from ref
        const { purchaseType: currentType, tier: currentTier, customChapters: currentChapters } = optionsRef.current

        const success = await renderButton(container, currentType, {
          tier: currentTier,
          customChapters: currentChapters,
        })

        // Verify render is still valid after async operation
        if (currentRenderId !== renderIdRef.current || !isMountedRef.current) {
          return
        }

        if (success) {
          setHasRendered(true)
        } else {
          setRenderError('Failed to load PayPal button')
        }
      } catch (error) {
        console.error('[PayPal] Render error:', error)
        
        // Only set error if this render is still valid
        if (currentRenderId === renderIdRef.current && isMountedRef.current) {
          setRenderError(
            error instanceof Error ? error.message : 'Failed to load PayPal button'
          )
        }
      } finally {
        isRenderingRef.current = false
      }
    }

    performRender()
  }, [isReady, renderAttempt, hasRendered, renderButton])

  // Reset when options change
  useEffect(() => {
    // Only reset if we've already rendered
    if (hasRendered) {
      // Increment render ID to invalidate any in-progress renders
      renderIdRef.current++
      
      setHasRendered(false)
      isRenderingRef.current = false
      
      // Clear container safely
      if (containerRef.current && document.body.contains(containerRef.current)) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [optionsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Invalidate any pending renders
      renderIdRef.current++
      
      // Clear container if it exists
      if (containerRef.current) {
        try {
          containerRef.current.innerHTML = ''
        } catch {
          // Container may already be removed
        }
      }
    }
  }, [])

  const handleRetry = useCallback(() => {
    // Invalidate any in-progress renders
    renderIdRef.current++
    
    setHasRendered(false)
    setRenderError(null)
    isRenderingRef.current = false
    
    // Clear container safely
    if (containerRef.current && document.body.contains(containerRef.current)) {
      containerRef.current.innerHTML = ''
    }
    
    // Trigger new render attempt
    setRenderAttempt(prev => prev + 1)
  }, [])

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

  // Error state (when SDK fails to load)
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
        data-options-key={optionsKey}
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