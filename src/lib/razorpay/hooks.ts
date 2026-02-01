// lib/razorpay/hooks.ts
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useCurrency } from '@/lib/currency/CurrencyContext'
import toast from 'react-hot-toast'
import { PurchaseType } from './payment.types'
import { formatAmount, type PaymentCurrency } from './config'
import { nanoid } from 'nanoid'

// ============================================================================
// Types
// ============================================================================

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayError {
  code: string
  description: string
  source: string
  step: string
  reason: string
  metadata?: {
    order_id: string
    payment_id: string
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  image?: string
  order_id: string
  prefill: {
    name?: string
    email: string
    contact?: string
  }
  notes?: Record<string, string | number>
  theme: {
    color: string
    backdrop_color?: string
  }
  modal: {
    ondismiss: () => void
    escape: boolean
    confirm_close: boolean
    backdropclose: boolean
  }
  handler: (response: RazorpayResponse) => void
  method?: {
    netbanking?: boolean
    card?: boolean
    upi?: boolean
    wallet?: boolean
    emi?: boolean
    paypal?: boolean
  }
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (response: { error: RazorpayError }) => void) => void
  close: () => void
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance
}

declare global {
  interface Window {
    Razorpay: RazorpayConstructor
  }
}

interface PaymentOptions {
  tier?: 'complete'
  customChapters?: number[]
}

// ============================================================================
// Script Loading
// ============================================================================

let scriptLoadPromise: Promise<boolean> | null = null
let isScriptLoaded = false

function loadRazorpayScript(): Promise<boolean> {
  if (isScriptLoaded && typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true)
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    if (window.Razorpay) {
      isScriptLoaded = true
      resolve(true)
      return
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    ) as HTMLScriptElement | null

    if (existingScript) {
      if (window.Razorpay) {
        isScriptLoaded = true
        resolve(true)
      } else {
        existingScript.addEventListener('load', () => {
          isScriptLoaded = true
          resolve(true)
        })
        existingScript.addEventListener('error', () => resolve(false))
      }
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true

    script.onload = () => {
      isScriptLoaded = true
      resolve(true)
    }

    script.onerror = () => {
      scriptLoadPromise = null
      resolve(false)
    }

    document.body.appendChild(script)
  })

  return scriptLoadPromise
}

// ============================================================================
// Error Messages
// ============================================================================

const ERROR_MESSAGES: Record<string, string> = {
  BAD_REQUEST_ERROR: 'Invalid payment details. Please check and retry.',
  GATEWAY_ERROR: 'Payment gateway error. Please try again in a moment.',
  SERVER_ERROR: 'Server error. Please try again or contact support.',
  NETWORK_ERROR: 'Network error. Please check your connection and retry.',
  PAYMENT_CANCELLED: 'Payment was cancelled.',
}

// ============================================================================
// Main Hook
// ============================================================================

export function useRazorpay() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRazorpayReady, setIsRazorpayReady] = useState(false)
  const { user, refreshUser } = useAuth()
  const { location, isInternational } = useCurrency()

  const processingRef = useRef(false)
  const razorpayInstanceRef = useRef<RazorpayInstance | null>(null)
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Preload script with cleanup
  useEffect(() => {
    preloadTimeoutRef.current = setTimeout(() => {
      loadRazorpayScript().then(setIsRazorpayReady)
    }, 2000)

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
      if (razorpayInstanceRef.current) {
        try {
          razorpayInstanceRef.current.close()
        } catch {
          // Ignore close errors
        }
      }
    }
  }, [])

  // Handle successful payment
  const handlePaymentSuccess = useCallback(async (response: RazorpayResponse) => {
    const verifyingToast = toast.loading('Verifying payment...')

    try {
      const verifyResponse = await fetch('/api/payments/razorpay-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      })

      const data = await verifyResponse.json()

      if (!verifyResponse.ok || !data.success) {
        throw new Error(data.error?.message || 'Payment verification failed')
      }

      toast.dismiss(verifyingToast)
      
      // Refresh user data
      try {
        await refreshUser()
      } catch (refreshError) {
        console.warn('Failed to refresh user, will retry:', refreshError)
      }

      toast.success(
        data.data?.message || '🎉 Payment successful! Your content has been unlocked.',
        {
          duration: 6000,
          style: { background: '#065f46', color: '#fff' },
        }
      )

      // Scroll to chapters section
      setTimeout(() => {
        const chaptersSection = document.getElementById('chapters')
        if (chaptersSection) {
          chaptersSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 1500)

    } catch (error) {
      console.error('Payment verification error:', error)
      toast.dismiss(verifyingToast)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Payment verification failed. Please contact support if amount was deducted.'
      
      toast.error(errorMessage, { duration: 7000 })
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      razorpayInstanceRef.current = null
    }
  }, [refreshUser])

  // Handle payment failure
  const handlePaymentFailure = useCallback((error: RazorpayError) => {
    console.error('Payment failure:', error)

    const errorMessage =
      ERROR_MESSAGES[error.code] ||
      error.description ||
      error.reason ||
      'Payment failed. Please try again.'

    toast.error(errorMessage, {
      duration: 5000,
      style: { background: '#7f1d1d', color: '#fff' },
    })

    processingRef.current = false
    setIsProcessing(false)
    razorpayInstanceRef.current = null
  }, [])

  // Handle modal dismiss
  const handleModalDismiss = useCallback(() => {
    processingRef.current = false
    setIsProcessing(false)
    razorpayInstanceRef.current = null
    toast('Payment cancelled', { icon: 'ℹ️', duration: 3000 })
  }, [])

  // Initialize payment
  const initializePayment = useCallback(async (
    purchaseType: PurchaseType,
    options: PaymentOptions = {}
  ) => {
    // Prevent double-clicks using only ref (synchronous check)
    if (processingRef.current) {
      console.warn('Payment already in progress')
      return
    }

    if (!user) {
      toast.error('Please login to continue')
      return
    }

    processingRef.current = true
    setIsProcessing(true)
    const loadingToast = toast.loading('Preparing checkout...')

    const idempotencyKey = `${user.id}-${purchaseType}-${Date.now()}-${nanoid(6)}`

    try {
      // Ensure Razorpay is loaded
      if (!isRazorpayReady) {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          throw new Error('Failed to load payment gateway. Please refresh and try again.')
        }
        setIsRazorpayReady(true)
      }

      if (typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Payment gateway not available. Please refresh the page.')
      }

      toast.loading('Creating order...', { id: loadingToast })

      // Create order with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          purchaseType,
          tier: options.tier,
          customChapters: options.customChapters,
          isInternational,
          userCountry: location?.country,
          userCurrency: location?.currency,
        }),
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to create order')
      }

      const { 
        orderId, 
        amount, 
        currency, 
        keyId, 
        paypalOnly 
      } = data.data

      toast.dismiss(loadingToast)

      // Build description
      const chapterCount = options.customChapters?.length
      const formattedAmount = formatAmount(amount, currency as PaymentCurrency)
      
      const description = purchaseType === 'complete'
        ? `Complete Story Pack - ${formattedAmount}`
        : `${chapterCount} Chapters - ${formattedAmount}`

      // Configure Razorpay options
      const razorpayOptions: RazorpayOptions = {
        key: keyId,
        amount,
        currency,
        name: 'The Crown I Will Take',
        description,
        image: '/logo-square.png',
        order_id: orderId,
        prefill: {
          name: user.name || user.email.split('@')[0] || '',
          email: user.email,
        },
        notes: {
          purchaseType,
          tier: options.tier || '',
          chapterCount: chapterCount || 0,
          userCountry: location?.country || 'Unknown',
          currency,
        },
        theme: {
          color: '#9f1239',
          backdrop_color: '#0a0a0a',
        },
        modal: {
          ondismiss: handleModalDismiss,
          escape: true,
          confirm_close: false,
          backdropclose: false,
        },
        handler: handlePaymentSuccess,
      }

      // For international orders (PayPal only), disable other methods
      if (paypalOnly) {
        razorpayOptions.method = {
          netbanking: false,
          card: false,
          upi: false,
          wallet: false,
          emi: false,
          paypal: true,
        }

        toast(
          `International payment via PayPal (${currency})`,
          {
            icon: '💱',
            duration: 5000,
            style: { background: '#1e3a5f', color: '#fff' },
          }
        )
      }

      // Create and open Razorpay instance
      const razorpayInstance = new window.Razorpay(razorpayOptions)
      razorpayInstanceRef.current = razorpayInstance

      razorpayInstance.on('payment.failed', (response) => {
        handlePaymentFailure(response.error)
      })

      razorpayInstance.open()

    } catch (error) {
      console.error('Payment initialization error:', error)
      toast.dismiss(loadingToast)

      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.')
      } else {
        toast.error(
          error instanceof Error ? error.message : 'Payment initialization failed'
        )
      }

      processingRef.current = false
      setIsProcessing(false)
    }
  }, [
    user, 
    isRazorpayReady, 
    isInternational, 
    location, 
    handlePaymentSuccess, 
    handlePaymentFailure,
    handleModalDismiss
  ])

  // Close Razorpay modal programmatically
  const closePayment = useCallback(() => {
    if (razorpayInstanceRef.current) {
      try {
        razorpayInstanceRef.current.close()
      } catch {
        // Ignore
      }
      razorpayInstanceRef.current = null
    }
    processingRef.current = false
    setIsProcessing(false)
  }, [])

  return {
    initializePayment,
    closePayment,
    isProcessing,
    isRazorpayReady,
  }
}