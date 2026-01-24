// lib/types/database.ts
export type TierType = 'free' | 'complete'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type TransactionType = 'purchase' | 'refund'
export type PaymentProvider = 'razorpay' | 'paypal'

export interface User {
  id: string
  email: string
  password_hash: string
  name: string | null
  password_reset_token: string | null
  password_reset_expires: string | null
  tier: TierType
  owned_chapters: number[]
  avatar_url: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  user_id: string
  purchase_type: 'complete' | 'custom'
  purchase_data: PurchaseData | null
  amount: number
  currency: string
  
  // Payment provider
  payment_provider: PaymentProvider
  
  // Razorpay fields
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  
  // PayPal fields
  paypal_order_id: string | null
  paypal_capture_id: string | null
  
  // Currency conversion (for PayPal USD → INR)
  original_currency: string | null
  original_amount: number | null
  
  status: PaymentStatus
  transaction_type: TransactionType
  payment_method: string | null
  payment_email: string | null
  payment_contact: string | null
  
  // Refund fields
  refund_id: string | null
  refund_amount: number | null
  refund_reason: string | null
  refunded_at: string | null
  
  // Metadata
  ip_address: string | null
  user_agent: string | null
  verified_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseData {
  chapters?: number[]
  chapterCount?: number
  [key: string]: unknown
}

export interface ReadingProgress {
  id: string
  user_id: string
  chapter_id: number
  chapter_slug: string
  is_completed: boolean
  last_position: number
  reading_time_seconds: number
  started_at: string
  completed_at: string | null
  last_read_at: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  refresh_token: string
  access_token_jti: string | null
  ip_address: string | null
  user_agent: string | null
  device_info: Record<string, unknown> | null
  expires_at: string
  last_used_at: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  event_type: string
  resource_type: string | null
  resource_id: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// Insert types (for creating new records)
export interface UserInsert {
  id?: string
  email: string
  password_hash: string
  name?: string | null
  tier?: TierType
  owned_chapters?: number[]
  avatar_url?: string | null
  is_active?: boolean
}

export interface PurchaseInsert {
  user_id: string
  purchase_type: 'complete' | 'custom'
  purchase_data?: PurchaseData | null
  amount: number
  currency?: string
  payment_provider?: PaymentProvider
  razorpay_order_id?: string | null
  paypal_order_id?: string | null
  original_currency?: string | null
  original_amount?: number | null
  status?: PaymentStatus
  ip_address?: string | null
  user_agent?: string | null
  expires_at?: string | null
}

export interface PurchaseUpdate {
  status?: PaymentStatus
  razorpay_payment_id?: string | null
  razorpay_signature?: string | null
  paypal_capture_id?: string | null
  payment_method?: string | null
  payment_email?: string | null
  payment_contact?: string | null
  verified_at?: string | null
  refund_id?: string | null
  refund_amount?: number | null
  refund_reason?: string | null
  refunded_at?: string | null
}

export interface ReadingProgressInsert {
  user_id: string
  chapter_id: number
  chapter_slug: string
  is_completed?: boolean
  last_position?: number
  reading_time_seconds?: number
}

export interface ReadingProgressUpdate {
  is_completed?: boolean
  last_position?: number
  reading_time_seconds?: number
  completed_at?: string | null
  last_read_at?: string
}

export interface SessionInsert {
  user_id: string
  refresh_token: string
  access_token_jti?: string | null
  ip_address?: string | null
  user_agent?: string | null
  device_info?: Record<string, unknown> | null
  expires_at: string
}

export interface AuditLogInsert {
  user_id?: string | null
  event_type: string
  resource_type?: string | null
  resource_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, unknown> | null
}

// API Response types
export interface UserPublic {
  id: string
  email: string
  name: string | null
  tier: TierType
  ownedChapters: number[]
  avatarUrl: string | null
  createdAt: string
}

export interface PurchasePublic {
  id: string
  purchaseType: 'complete' | 'custom'
  amount: number
  currency: string
  paymentProvider: PaymentProvider
  status: PaymentStatus
  createdAt: string
}

// Helper function to convert DB user to public user
export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier,
    ownedChapters: user.owned_chapters || [],
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  }
}

// Helper function to convert DB purchase to public purchase
export function toPurchasePublic(purchase: Purchase): PurchasePublic {
  return {
    id: purchase.id,
    purchaseType: purchase.purchase_type,
    amount: purchase.amount,
    currency: purchase.currency,
    paymentProvider: purchase.payment_provider,
    status: purchase.status,
    createdAt: purchase.created_at,
  }
}