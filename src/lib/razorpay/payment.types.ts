// lib/razorpay/payment.types.ts

import type { Json } from '@/lib/supabase/database.types'
import type { PaymentCurrency } from './config'

export type TierType = 'free' | 'complete'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PurchaseType = 'complete' | 'custom'
export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'paypal' | 'emi' | string

export interface CreateOrderParams {
  userId: string
  email: string
  name?: string
  purchaseType: PurchaseType
  tier?: 'complete'
  customChapters?: number[]
  // New: International payment support
  currency?: PaymentCurrency
  isInternational?: boolean
  userCountry?: string
}

export interface VerifyPaymentParams {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

// Purchase data types
export interface BasePurchaseData {
  expectedAmount: number
  currency: PaymentCurrency
  originalAmountINR: number // Always store INR equivalent
}

export interface CustomPurchaseData extends BasePurchaseData {
  chapters: number[]
  chapterCount: number
  pricePerChapter: number
}

export interface CompletePurchaseData extends BasePurchaseData {
  tier: 'complete'
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
  payment_method?: PaymentMethod | null
  payment_email?: string | null
  verified_at?: string | null
  verified_via?: string | null
  failure_reason?: string | null
  refund_id?: string | null
  refund_amount?: number | null
  refunded_at?: string | null
  user_country?: string | null
  is_international?: boolean
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

// API Response types
export interface CreateOrderResponse {
  success: true
  data: {
    orderId: string
    amount: number
    currency: PaymentCurrency
    keyId: string
    purchaseId?: string
    isInternational: boolean
    paypalOnly?: boolean // True for international orders
  }
}

export interface CreateOrderError {
  success: false
  error: {
    message: string
    code?: string
  }
}