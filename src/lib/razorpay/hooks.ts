// lib/razorpay/hooks.ts
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useCurrency } from '@/lib/currency/CurrencyContext'
import toast from 'react-hot-toast'
import { PurchaseType } from './payment.types'
import { formatAmount, type PaymentCurrency } from './config'
import { nanoid } from 'nanoid'

// Types
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
  // Method-specific options
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

// Script loading state
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

// Preload script
if (typeof window !== 'undefined') {
  setTimeout(() => loadRazorpayScript(), 2000)
}

export function useRazorpay() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRazorpayReady, setIsRazorpayReady] = useState(false)
  const { user, refreshUser } = useAuth()
  const { location, isInternational } = useCurrency()

  const processingRef = useRef(false)
  const razorpayInstanceRef = useRef<RazorpayInstance | null>(null)

  useEffect(() => {
    loadRazorpayScript().then(setIsRazorpayReady)

    return () => {
      if (razorpayInstanceRef.current) {
        try {
          razorpayInstanceRef.current.close()
        } catch {
          // Ignore
        }
      }
    }
  }, [])

  const handlePaymentSuccess = useCallback(async (response: RazorpayResponse) => {
    const verifyingToast = toast.loading('Verifying payment...')

    try {
      const verifyResponse = await fetch('/api/payments/verify', {
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
      await refreshUser()

      toast.success(data.data?.message || '🎉 Payment successful! Your content has been unlocked.', {
        duration: 6000,
        style: { background: '#065f46', color: '#fff' },
      })

      setTimeout(() => {
        const chaptersSection = document.getElementById('chapters')
        chaptersSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 1500)

    } catch (error) {
      console.error('Payment verification error:', error)
      toast.dismiss(verifyingToast)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Payment verification failed. Please contact support if amount was deducted.',
        { duration: 7000 }
      )
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      razorpayInstanceRef.current = null
    }
  }, [refreshUser])

  const handlePaymentFailure = useCallback((error: RazorpayError) => {
    console.error('Payment failure:', error)

    const errorMessages: Record<string, string> = {
      BAD_REQUEST_ERROR: 'Invalid payment details. Please check and retry.',
      GATEWAY_ERROR: 'Payment gateway error. Please try again in a moment.',
      SERVER_ERROR: 'Server error. Please try again or contact support.',
    }

    const errorMessage =
      errorMessages[error.code] ||
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

  const initializePayment = useCallback(async (
    purchaseType: PurchaseType,
    options: {
      tier?: 'complete'
      customChapters?: number[]
    }
  ) => {
    if (processingRef.current || isProcessing) {
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

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      // Include international info in request
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
          // Pass location info for currency selection
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
      
      let description: string
      if (purchaseType === 'complete') {
        description = `Complete Story Pack - ${formattedAmount}`
      } else {
        description = `${chapterCount} Chapters - ${formattedAmount}`
      }

      // Configure payment options based on region
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
          ondismiss: () => {
            processingRef.current = false
            setIsProcessing(false)
            toast('Payment cancelled', { icon: 'ℹ️', duration: 3000 })
          },
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
        toast.error(error instanceof Error ? error.message : 'Payment initialization failed')
      }

      processingRef.current = false
      setIsProcessing(false)
    }
  }, [user, isRazorpayReady, isInternational, location, isProcessing, handlePaymentSuccess, handlePaymentFailure])

  return {
    initializePayment,
    isProcessing,
    isRazorpayReady,
  }
}