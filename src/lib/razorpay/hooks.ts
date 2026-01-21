// lib/razorpay/hooks.ts
"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import toast from 'react-hot-toast'
import { PurchaseType } from './payment.types'

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: {
    name?: string
    email: string
  }
  theme: {
    color: string
  }
  modal: {
    ondismiss: () => void
    escape: boolean
    confirm_close: boolean
  }
  handler: (response: any) => void
}

declare global {
  interface Window {
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const existingScript = document.querySelector('script[src*="razorpay"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true))
      existingScript.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function useRazorpay() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRazorpayReady, setIsRazorpayReady] = useState(false)
  const { user, refreshUser } = useAuth()

  useEffect(() => {
    loadRazorpayScript().then(setIsRazorpayReady)
  }, [])

  const initializePayment = async (
    purchaseType: PurchaseType,
    options: {
      tier?: 'complete'
      customChapters?: number[]
    }
  ) => {
    if (!user) {
      toast.error('Please login to continue')
      return
    }

    setIsProcessing(true)
    const loadingToast = toast.loading('Preparing checkout...')

    try {
      if (!isRazorpayReady) {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          throw new Error('Failed to load payment gateway. Please refresh the page and try again.')
        }
        setIsRazorpayReady(true)
      }

      if (!window.Razorpay) {
        throw new Error('Payment gateway not available. Please refresh the page.')
      }

      toast.loading('Creating order...', { id: loadingToast })

      // Create order
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          purchaseType,
          tier: options.tier,
          customChapters: options.customChapters,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to create order')
      }

      const { orderId, amount, currency, keyId } = data.data

      toast.dismiss(loadingToast)

      const razorpayOptions: RazorpayOptions = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'The Crown I Will Take From You',
        description: purchaseType === 'complete' 
          ? 'Complete Story Pack'
          : `Custom Selection (${options.customChapters?.length} chapters)`,
        order_id: orderId,
        prefill: {
          name: user.name || undefined,
          email: user.email,
        },
        theme: {
          color: '#9f1239',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            toast('Payment cancelled', { icon: 'ℹ️' })
          },
          escape: true,
          confirm_close: false,
        },
        handler: async (response) => {
          await handlePaymentSuccess(response)
        },
      }

      const razorpayInstance = new window.Razorpay(razorpayOptions)
      
      razorpayInstance.on('payment.failed', (response: any) => {
        handlePaymentFailure(response.error)
      })

      razorpayInstance.open()

    } catch (error) {
      console.error('Payment initialization error:', error)
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Payment initialization failed')
      setIsProcessing(false)
    }
  }

  const handlePaymentSuccess = async (response: any) => {
    const verifyingToast = toast.loading('Verifying payment...')
    
    try {
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      toast.success('🎉 Payment successful! Your content has been unlocked.', {
        duration: 6000,
      })
      
      setTimeout(() => {
        const chaptersSection = document.getElementById('chapters')
        if (chaptersSection) {
          chaptersSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 1500)

    } catch (error) {
      console.error('Payment verification error:', error)
      toast.dismiss(verifyingToast)
      toast.error(error instanceof Error ? error.message : 'Payment verification failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failure:', error)
    toast.error(error.description || error.reason || 'Payment failed. Please try again.', {
      duration: 5000,
    })
    setIsProcessing(false)
  }

  return {
    initializePayment,
    isProcessing,
    isRazorpayReady,
  }
}