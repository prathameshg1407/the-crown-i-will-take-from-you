// lib/razorpay/payment.types.ts

export type TierType = 'free' | 'complete'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PurchaseType = 'complete' | 'custom'

export interface CreateOrderParams {
  userId: string
  email: string
  name?: string
  purchaseType: PurchaseType
  // For complete pack
  tier?: 'complete'
  // For custom selection
  customChapters?: number[]
}

export interface VerifyPaymentParams {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface PurchaseRecord {
  id: string
  user_id: string
  purchase_type: PurchaseType
  purchase_data: any
  amount: number
  razorpay_order_id: string
  razorpay_payment_id: string | null
  status: PaymentStatus
  created_at: string
}