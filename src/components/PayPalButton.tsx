// components/PayPalButton.tsx
"use client"

import { useCallback, useRef, useState } from 'react'
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js'
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
// Constants
// ============================================================================

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

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
  const { location } = useCurrency()
  
  const [isCreating, setIsCreating] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const orderIdRef = useRef<string | null>(null)

  const isButtonDisabled = disabled || isPending || isCreating || isCapturing

  const createOrder = useCallback(async (): Promise<string> => {
    console.log('=== PayPal createOrder called ===')
    console.log('purchaseType:', purchaseType)
    console.log('chapters:', chapters)
    console.log('amountINR:', amountINR)
    console.log('location:', location)
    
    setIsCreating(true)
    onProcessing?.(true)

    try {
      const requestBody = {
        purchaseType,
        customChapters: chapters,
        amountINR,
        currency: location?.currency || 'USD',
        country: location?.country,
      }
      
      console.log('Request body:', requestBody)

      const response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      
      const data: CreateOrderResponse = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        console.error('Response not OK:', response.status, data)
        throw new Error(data.error?.message || `HTTP ${response.status}`)
      }

      if (!data.success) {
        console.error('API returned success: false', data)
        throw new Error(data.error?.message || 'Failed to create PayPal order')
      }

      if (!data.data?.orderId) {
        console.error('No orderId in response', data)
        throw new Error('No order ID returned')
      }

      console.log('Order created successfully:', data.data.orderId)
      orderIdRef.current = data.data.orderId
      return data.data.orderId
      
    } catch (error) {
      console.error('=== PayPal createOrder ERROR ===', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order'
      onError(new Error(errorMessage))
      throw error // Important: must throw to close PayPal popup
    } finally {
      setIsCreating(false)
    }
  }, [purchaseType, chapters, amountINR, location, onError, onProcessing])

  const onApprove = useCallback(async (data: { orderID: string }) => {
    console.log('=== PayPal onApprove called ===', data.orderID)
    
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
      console.log('Capture response:', result)

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Payment capture failed')
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
    console.log('=== PayPal cancelled ===')
    orderIdRef.current = null
    onProcessing?.(false)
    onCancel?.()
  }, [onCancel, onProcessing])

  const handleError = useCallback((err: Record<string, unknown>) => {
    console.error('=== PayPal error ===', err)
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
  const { location } = useCurrency()

  console.log('PayPalButton render - Client ID exists:', !!PAYPAL_CLIENT_ID)

  if (!PAYPAL_CLIENT_ID) {
    console.error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set')
    return <ErrorState message="PayPal is not configured" />
  }

  const currency = location?.currency || 'USD'

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency,
        intent: 'capture',
        components: 'buttons',
      }}
    >
      <PayPalButtonInner {...props} />
    </PayPalScriptProvider>
  )
}