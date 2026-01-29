// lib/paypal/hooks.ts
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useCurrency } from '@/lib/currency/CurrencyContext'
import toast from 'react-hot-toast'
import type { PurchaseType } from '@/lib/supabase/database.types'

// ======================
// Types
// ======================

interface PayPalButtonsComponent {
  render: (container: HTMLElement) => Promise<void>
  close: () => Promise<void>
  isEligible: () => boolean
}

interface PayPalNamespace {
  Buttons: (options: PayPalButtonOptions) => PayPalButtonsComponent
  FUNDING: {
    PAYPAL: string
    CARD: string
  }
}

interface PayPalButtonOptions {
  fundingSource?: string
  style?: {
    layout?: 'vertical' | 'horizontal'
    color?: 'gold' | 'blue' | 'silver' | 'black' | 'white'
    shape?: 'rect' | 'pill'
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay'
    height?: number
    tagline?: boolean
  }
  createOrder: () => Promise<string>
  onApprove: (data: { orderID: string; payerID?: string }) => Promise<void>
  onCancel?: (data: { orderID: string }) => void
  onError?: (err: Error) => void
}

declare global {
  interface Window {
    paypal?: PayPalNamespace
  }
}

// ======================
// Script Loading
// ======================

let scriptLoadPromise: Promise<boolean> | null = null
let currentCurrency: string | null = null

function loadPayPalScript(clientId: string, currency: string = 'USD'): Promise<boolean> {
  // If already loaded with same currency, return immediately
  if (
    scriptLoadPromise && 
    currentCurrency === currency && 
    typeof window !== 'undefined' && 
    window.paypal
  ) {
    return Promise.resolve(true)
  }

  // If currency changed, we need to reload
  if (currentCurrency !== currency && scriptLoadPromise) {
    const existingScripts = document.querySelectorAll('script[src*="paypal.com/sdk"]')
    existingScripts.forEach(script => script.remove())
    scriptLoadPromise = null
    if (window.paypal) {
      delete (window as { paypal?: PayPalNamespace }).paypal
    }
  }

  currentCurrency = currency

  scriptLoadPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    const script = document.createElement('script')
    // Added disable-funding=paylater,credit to remove PayLater and Credit options
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture&components=buttons&disable-funding=paylater,credit`
    script.async = true
    script.id = 'paypal-sdk'

    script.onload = () => {
      console.log('PayPal SDK loaded successfully')
      resolve(true)
    }

    script.onerror = (error) => {
      console.error('Failed to load PayPal SDK:', error)
      scriptLoadPromise = null
      resolve(false)
    }

    document.body.appendChild(script)
  })

  return scriptLoadPromise
}

// ======================
// Hook
// ======================

export interface UsePayPalOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function usePayPal(options: UsePayPalOptions = {}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user, refreshUser } = useAuth()
  const { location, isInternational } = useCurrency()
  
  const processingRef = useRef(false)
  const buttonsRef = useRef<PayPalButtonsComponent | null>(null)

  // Determine currency
  const currency = location?.currency && ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'].includes(location.currency)
    ? location.currency
    : 'USD'

  // Load PayPal SDK
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    
    if (!clientId) {
      console.error('PayPal client ID not configured')
      setError('PayPal is not configured')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    loadPayPalScript(clientId, currency)
      .then((loaded) => {
        setIsReady(loaded)
        if (!loaded) {
          setError('Failed to load PayPal')
        }
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      if (buttonsRef.current) {
        try {
          buttonsRef.current.close()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [currency])

  // Create order API call
  const createOrder = useCallback(async (
    purchaseType: PurchaseType,
    orderOptions: { tier?: 'complete'; customChapters?: number[] }
  ): Promise<string> => {
    const response = await fetch('/api/payments/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        purchaseType,
        tier: orderOptions.tier,
        customChapters: orderOptions.customChapters,
        currency,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to create PayPal order')
    }

    return data.data.orderId
  }, [currency])

  // Capture order API call
  const captureOrder = useCallback(async (orderId: string): Promise<void> => {
    const toastId = toast.loading('Processing payment...')
    
    try {
      const response = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Payment capture failed')
      }

      toast.dismiss(toastId)

      // Refresh user data to get updated access
      await refreshUser()

      // Success notification
      toast.success('🎉 Payment successful! Your content has been unlocked.', {
        duration: 6000,
        style: { 
          background: '#065f46', 
          color: '#fff',
          padding: '16px',
        },
      })

      // Call success callback
      options.onSuccess?.()

      // Scroll to chapters section
      setTimeout(() => {
        const chaptersSection = document.getElementById('chapters')
        if (chaptersSection) {
          chaptersSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 1500)

    } catch (error) {
      toast.dismiss(toastId)
      const message = error instanceof Error ? error.message : 'Payment failed'
      toast.error(message, { duration: 5000 })
      options.onError?.(message)
      throw error
    }
  }, [refreshUser, options])

  // Render PayPal button
  const renderButton = useCallback(async (
    container: HTMLElement,
    purchaseType: PurchaseType,
    orderOptions: { tier?: 'complete'; customChapters?: number[] }
  ): Promise<boolean> => {
    if (!window.paypal || !isReady) {
      console.error('PayPal not ready')
      return false
    }

    // Clear container
    container.innerHTML = ''

    try {
      const buttons = window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          height: 48,
          tagline: false,
        },
        
        createOrder: async () => {
          if (processingRef.current) {
            throw new Error('Payment already in progress')
          }
          
          processingRef.current = true
          setIsProcessing(true)
          setError(null)

          try {
            const orderId = await createOrder(purchaseType, orderOptions)
            return orderId
          } catch (error) {
            processingRef.current = false
            setIsProcessing(false)
            const message = error instanceof Error ? error.message : 'Failed to create order'
            setError(message)
            throw error
          }
        },

        onApprove: async (data) => {
          try {
            await captureOrder(data.orderID)
          } catch {
            // Error already handled in captureOrder
          } finally {
            processingRef.current = false
            setIsProcessing(false)
          }
        },

        onCancel: () => {
          processingRef.current = false
          setIsProcessing(false)
          toast('Payment cancelled', { 
            icon: 'ℹ️', 
            duration: 3000,
          })
        },

        onError: (err) => {
          console.error('PayPal error:', err)
          processingRef.current = false
          setIsProcessing(false)
          
          const message = err.message || 'Payment failed. Please try again.'
          setError(message)
          toast.error(message, { duration: 5000 })
          options.onError?.(message)
        },
      })

      // Check eligibility
      if (!buttons.isEligible()) {
        console.warn('PayPal buttons not eligible')
        setError('PayPal is not available for your region')
        return false
      }

      buttonsRef.current = buttons
      await buttons.render(container)
      return true

    } catch (error) {
      console.error('Failed to render PayPal buttons:', error)
      setError('Failed to initialize PayPal')
      return false
    }
  }, [isReady, createOrder, captureOrder, options])

  return {
    isLoading,
    isReady,
    isProcessing,
    isInternational,
    error,
    currency,
    renderButton,
  }
}