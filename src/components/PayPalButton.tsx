// components/PayPalButton.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { useCurrency } from '@/lib/currency/CurrencyContext'
import { Loader2 } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface PayPalButtonProps {
  purchaseType: 'complete' | 'custom'
  chapters?: number[]
  amountINR: number
  disabled?: boolean
  onSuccess: () => void
  onError: (error: Error) => void
  onCancel?: () => void
  onProcessing?: (processing: boolean) => void
}

interface CreateOrderResponse {
  success: boolean
  data?: {
    orderId: string
    approvalUrl?: string
  }
  error?: {
    message: string
  }
}

interface CaptureOrderResponse {
  success: boolean
  data?: {
    message: string
    tier?: string
    chaptersUnlocked?: number[]
  }
  error?: {
    message: string
  }
}

// ============================================================================
// PayPal Button Inner Component
// ============================================================================

function PayPalButtonInner({
  purchaseType,
  chapters,
  amountINR,
  disabled = false,
  onSuccess,
  onError,
  onCancel,
  onProcessing,
}: PayPalButtonProps) {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer()
  const { location } = useCurrency()
  const [isCreating, setIsCreating] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const orderIdRef = useRef<string | null>(null)

  const isButtonDisabled = disabled || isPending || isCreating || isCapturing

  // Create PayPal order
  const createOrder = useCallback(async (): Promise<string> => {
    setIsCreating(true)
    onProcessing?.(true)

    try {
      const response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          purchaseType,
          customChapters: chapters,
          amountINR,
          currency: location?.currency || 'USD',
          country: location?.country,
        }),
      })

      const data: CreateOrderResponse = await response.json()

      if (!response.ok || !data.success || !data.data?.orderId) {
        throw new Error(data.error?.message || 'Failed to create PayPal order')
      }

      orderIdRef.current = data.data.orderId
      return data.data.orderId

    } catch (error) {
      console.error('PayPal create order error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order'
      onError(new Error(errorMessage))
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [purchaseType, chapters, amountINR, location, onError, onProcessing])

  // Capture PayPal order (on approval)
  const onApprove = useCallback(async (data: { orderID: string }) => {
    setIsCapturing(true)
    onProcessing?.(true)

    try {
      const response = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId: data.orderID,
        }),
      })

      const result: CaptureOrderResponse = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Payment capture failed')
      }

      // Success!
      onSuccess()

    } catch (error) {
      console.error('PayPal capture error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      onError(new Error(errorMessage))
    } finally {
      setIsCapturing(false)
      onProcessing?.(false)
    }
  }, [onSuccess, onError, onProcessing])

  // Handle cancel
  const handleCancel = useCallback(() => {
    orderIdRef.current = null
    onProcessing?.(false)
    onCancel?.()
  }, [onCancel, onProcessing])

  // Handle error
  const handleError = useCallback((error: Record<string, unknown>) => {
    console.error('PayPal error:', error)
    onProcessing?.(false)
    onError(new Error('PayPal encountered an error. Please try again.'))
  }, [onError, onProcessing])

  // Loading state
  if (isPending) {
    return (
      <div className="h-12 bg-neutral-800/50 rounded-lg flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
        <span className="ml-2 text-neutral-400 text-sm">Loading PayPal...</span>
      </div>
    )
  }

  // Error state
  if (isRejected) {
    return (
      <div className="h-12 bg-red-900/20 border border-red-800/50 rounded-lg flex items-center justify-center">
        <span className="text-red-400 text-sm">Failed to load PayPal</span>
      </div>
    )
  }

  // Processing state
  if (isCapturing) {
    return (
      <div className="h-12 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="ml-2 text-blue-400 text-sm">Processing payment...</span>
      </div>
    )
  }

  return (
    <div className={`paypal-button-container ${isButtonDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <PayPalButtons
        style={{
          layout: 'horizontal',
          color: 'blue',
          shape: 'rect',
          label: 'pay',
          height: 48,
        }}
        disabled={isButtonDisabled}
        forceReRender={[amountINR, purchaseType, chapters?.join(',')]}
        createOrder={createOrder}
        onApprove={onApprove}
        onCancel={handleCancel}
        onError={handleError}
      />
    </div>
  )
}

// ============================================================================
// PayPal Button Wrapper with Provider
// ============================================================================

export default function PayPalButton(props: PayPalButtonProps) {
  const { location } = useCurrency()
  const [clientId, setClientId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch PayPal client ID
  useEffect(() => {
    let cancelled = false

    async function fetchClientId() {
      try {
        const response = await fetch('/api/payments/paypal/client-id')
        const data = await response.json()

        if (!cancelled) {
          if (data.success && data.clientId) {
            setClientId(data.clientId)
          } else {
            setError('PayPal is not configured')
          }
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch PayPal client ID:', err)
          setError('Failed to load PayPal')
          setIsLoading(false)
        }
      }
    }

    fetchClientId()

    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return (
      <div className="h-12 bg-neutral-800/50 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-neutral-500 text-sm">Loading PayPal...</span>
      </div>
    )
  }

  if (error || !clientId) {
    return (
      <div className="h-12 bg-red-900/20 border border-red-800/50 rounded-lg flex items-center justify-center">
        <span className="text-red-400 text-sm">{error || 'PayPal unavailable'}</span>
      </div>
    )
  }

  // Determine currency for PayPal
  const currency = location?.currency || 'USD'

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency,
        intent: 'capture',
        components: 'buttons',
      }}
    >
      <PayPalButtonInner {...props} />
    </PayPalScriptProvider>
  )
}