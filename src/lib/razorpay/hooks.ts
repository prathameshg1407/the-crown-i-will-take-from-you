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
  image?: string
  order_id: string
  prefill: {
    name?: string
    email: string
    contact?: string
  }
  notes?: {
    purchaseType: string
    tier?: string
    chapterCount?: number
  }
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

      // Build cleaner description
      const chapterCount = options.customChapters?.length
      const description = purchaseType === 'complete' 
        ? 'Complete Story Access - All Chapters'
        : `${chapterCount} Custom ${chapterCount === 1 ? 'Chapter' : 'Chapters'}`

      const razorpayOptions: RazorpayOptions = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'The Crown I Will Take',
        description: description,
        
        // Add your logo/icon here (square PNG, min 256x256)
        image: '/logo-square.png', // Place in /public folder
        
        order_id: orderId,
        
        // Prefill all available user data
        prefill: {
          name: user.name || user.email.split('@')[0] || '',
          email: user.email,
        },
        
        // Add metadata for tracking
        notes: {
          purchaseType,
          tier: options.tier || '',
          chapterCount: chapterCount || 0,
        },
        
        // Brand colors matching your site
        theme: {
          color: '#9f1239',           // Your primary red
          backdrop_color: '#0a0a0a',  // Dark backdrop matching your BG
        },
        
        // Better modal behavior
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            toast('Payment cancelled', { 
              icon: 'ℹ️',
              duration: 3000 
            })
          },
          escape: true,          // Allow ESC to close
          confirm_close: false,  // Don't ask for confirmation
          backdropclose: true,   // Allow clicking outside to close
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
      const verifyResponse = await fetch('/api/payments/razorpay-verify', {
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
      
      // Refresh user data to get updated tier/chapters
      await refreshUser()

      // Success feedback
      toast.success('🎉 Payment successful! Your content has been unlocked.', {
        duration: 6000,
        style: {
          background: '#065f46',
          color: '#fff',
        },
      })
      
      // Smooth scroll to chapters after short delay
      setTimeout(() => {
        const chaptersSection = document.getElementById('chapters')
        if (chaptersSection) {
          chaptersSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          })
        }
      }, 1500)

    } catch (error) {
      console.error('Payment verification error:', error)
      toast.dismiss(verifyingToast)
      toast.error(
        error instanceof Error ? error.message : 'Payment verification failed. Please contact support if amount was deducted.',
        { duration: 7000 }
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failure:', error)
    
    // Better error messages
    let errorMessage = 'Payment failed. Please try again.'
    
    if (error.code === 'BAD_REQUEST_ERROR') {
      errorMessage = 'Invalid payment details. Please check and retry.'
    } else if (error.code === 'GATEWAY_ERROR') {
      errorMessage = 'Payment gateway error. Please try again in a moment.'
    } else if (error.code === 'SERVER_ERROR') {
      errorMessage = 'Server error. Please try again or contact support.'
    } else if (error.description) {
      errorMessage = error.description
    } else if (error.reason) {
      errorMessage = error.reason
    }
    
    toast.error(errorMessage, {
      duration: 5000,
      style: {
        background: '#7f1d1d',
        color: '#fff',
      },
    })
    
    setIsProcessing(false)
  }

  return {
    initializePayment,
    isProcessing,
    isRazorpayReady,
  }
}