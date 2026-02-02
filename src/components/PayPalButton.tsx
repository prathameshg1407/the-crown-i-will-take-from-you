// components/PayPalButton.tsx
"use client"

import { useCallback, useRef, useState } from 'react'
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js'
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
  }
  error?: {
    message: string
  }
}

interface CaptureOrderResponse {
  success: boolean
  data?: {
    message: string
  }
  error?: {
    message: string
  }
}

// ============================================================================
// Constants
// ============================================================================

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

// Always use USD for PayPal - it's most widely supported
const PAYPAL_CURRENCY = 'USD'

// ============================================================================
// State Components
// ============================================================================

function LoadingState({ message }: { message: string }) {
  return (
    <div className="h-12 bg-neutral-800/50 rounded-lg flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
      <span className="ml-2 text-neutral-400 text-sm">{message}</span>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="h-12 bg-red-900/20 border border-red-800/50 rounded-lg flex items-center justify-center">
      <span className="text-red-400 text-sm">{message}</span>
    </div>
  )
}

function ProcessingState() {
  return (
    <div className="h-12 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      <span className="ml-2 text-blue-400 text-sm">Processing payment...</span>
    </div>
  )
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
  const [{ isPending, isRejected }] = usePayPalScriptReducer()
  
  const [isCreating, setIsCreating] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const orderIdRef = useRef<string | null>(null)

  const isButtonDisabled = disabled || isPending || isCreating || isCapturing

  const createOrder = useCallback(async (): Promise<string> => {
    console.log('=== PayPal createOrder called ===')
    
    setIsCreating(true)
    onProcessing?.(true)

    try {
      const requestBody = {
        purchaseType,
        customChapters: chapters,
        amountINR,
        currency: PAYPAL_CURRENCY, // Always USD
      }
      
      console.log('Request body:', requestBody)

      const response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      const data: CreateOrderResponse = await response.json()
      console.log('Response:', data)

      if (!response.ok || !data.success || !data.data?.orderId) {
        throw new Error(data.error?.message || 'Failed to create order')
      }

      console.log('Order created:', data.data.orderId)
      orderIdRef.current = data.data.orderId
      return data.data.orderId
      
    } catch (error) {
      console.error('PayPal createOrder error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order'
      onError(new Error(errorMessage))
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [purchaseType, chapters, amountINR, onError, onProcessing])

  const onApprove = useCallback(async (data: { orderID: string }) => {
    console.log('=== PayPal onApprove ===', data.orderID)
    
    setIsCapturing(true)
    onProcessing?.(true)

    try {
      const response = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: data.orderID }),
      })

      const result: CaptureOrderResponse = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Payment failed')
      }

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

  const handleCancel = useCallback(() => {
    console.log('PayPal cancelled')
    orderIdRef.current = null
    onProcessing?.(false)
    onCancel?.()
  }, [onCancel, onProcessing])

  const handleError = useCallback((err: Record<string, unknown>) => {
    console.error('PayPal error:', err)
    onProcessing?.(false)
    onError(new Error('PayPal encountered an error. Please try again.'))
  }, [onError, onProcessing])

  if (isPending) {
    return <LoadingState message="Loading PayPal..." />
  }

  if (isRejected) {
    return <ErrorState message="Failed to load PayPal" />
  }

  if (isCapturing) {
    return <ProcessingState />
  }

  return (
    <div className={isButtonDisabled ? 'opacity-50 pointer-events-none' : ''}>
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
// PayPal Button Wrapper
// ============================================================================

export default function PayPalButton(props: PayPalButtonProps) {
  if (!PAYPAL_CLIENT_ID) {
    return <ErrorState message="PayPal is not configured" />
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency: PAYPAL_CURRENCY, // Always USD
        intent: 'capture',
        components: 'buttons',
      }}
    >
      <PayPalButtonInner {...props} />
    </PayPalScriptProvider>
  )
}