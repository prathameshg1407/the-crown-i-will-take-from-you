// lib/types/database.ts (or wherever this is)
export type TierType = 'free' | 'complete' // ✅ Updated to match schema

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type TransactionType = 'purchase' | 'refund'

export interface User {
  id: string
  email: string
  password_hash: string
  name: string | null
  password_reset_token: string | null
  password_reset_expires: string | null
  tier: TierType // ✅ Changed from current_tier to tier
  owned_chapters: number[] // ✅ Added
  avatar_url: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  user_id: string
  purchase_type: 'complete' | 'custom' // ✅ Changed from tier
  purchase_data: Record<string, any> | null // ✅ Added
  amount: number
  currency: string
  razorpay_order_id: string
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  status: PaymentStatus
  transaction_type: TransactionType
  payment_method: string | null
  payment_email: string | null
  payment_contact: string | null
  refund_id: string | null
  refund_amount: number | null
  refund_reason: string | null
  refunded_at: string | null
  ip_address: string | null
  user_agent: string | null
  verified_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
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
  device_info: Record<string, any> | null
  expires_at: string
  last_used_at: string
  created_at: string
}