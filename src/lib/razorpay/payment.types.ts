// lib/razorpay/payment.types.ts

import type { Json } from '@/lib/supabase/database.types'

export type TierType = 'free' | 'complete'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PurchaseType = 'complete' | 'custom'

export interface CreateOrderParams {
  userId: string
  email: string
  name?: string
  purchaseType: PurchaseType
  tier?: 'complete'
  customChapters?: number[]
}

export interface VerifyPaymentParams {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

// Purchase data types
export interface CustomPurchaseData {
  chapters: number[]
  chapterCount: number
  pricePerChapter: number
  expectedAmount: number
}

export interface CompletePurchaseData {
  tier: 'complete'
  expectedAmount: number
}

export type PurchaseData = CustomPurchaseData | CompletePurchaseData

// Database record (matches what comes from Supabase)
export interface PurchaseRecord {
  id: string
  user_id: string
  purchase_type: PurchaseType
  purchase_data: Json
  amount: number
  currency: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_signature?: string | null
  status: PaymentStatus
  payment_method?: string | null
  payment_email?: string | null
  verified_at?: string | null
  verified_via?: string | null
  failure_reason?: string | null
  refund_id?: string | null
  refund_amount?: number | null
  refunded_at?: string | null
  created_at: string
  updated_at: string
}

// Type guards
export function isCustomPurchaseData(data: unknown): data is CustomPurchaseData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'chapters' in data &&
    Array.isArray((data as CustomPurchaseData).chapters) &&
    'chapterCount' in data &&
    typeof (data as CustomPurchaseData).chapterCount === 'number'
  )
}

export function isCompletePurchaseData(data: unknown): data is CompletePurchaseData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tier' in data &&
    (data as CompletePurchaseData).tier === 'complete'
  )
}

export function isPurchaseData(data: unknown): data is PurchaseData {
  return isCustomPurchaseData(data) || isCompletePurchaseData(data)
}