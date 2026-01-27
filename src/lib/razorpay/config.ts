// lib/razorpay/config.ts

import { PRICING } from '@/data/chapters'

// Validate environment at import time
const validateEnv = () => {
  const required = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0 && typeof window === 'undefined') {
    console.warn(`Missing Razorpay env vars: ${missing.join(', ')}`)
  }
}

validateEnv()

export const razorpayConfig = {
  // Don't expose key_secret to client ever
  publicKeyId: process.env.RAZORPAY_KEY_ID || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  currency: 'INR' as const,
  
  // Pricing in paise (smallest currency unit)
  pricing: {
    complete: PRICING.COMPLETE_PACK.price * 100,
    customPerChapter: PRICING.CUSTOM_SELECTION.pricePerChapter * 100,
  },
  
  // Limits
  limits: {
    minCustomChapters: PRICING.CUSTOM_SELECTION.minChapters,
    maxChapterId: 386,
    freeChapters: PRICING.FREE_CHAPTERS,
  },
} as const

export function getCompletePackPrice(): number {
  return razorpayConfig.pricing.complete
}

export function getCustomPrice(chapterCount: number): number {
  if (chapterCount < razorpayConfig.limits.minCustomChapters) {
    throw new Error(`Minimum ${razorpayConfig.limits.minCustomChapters} chapters required`)
  }
  return chapterCount * razorpayConfig.pricing.customPerChapter
}

/**
 * Validate chapter IDs
 */
export function validateChapterIds(chapterIds: number[]): { valid: number[]; invalid: number[] } {
  const valid: number[] = []
  const invalid: number[] = []
  
  for (const id of chapterIds) {
    if (
      typeof id === 'number' &&
      Number.isInteger(id) &&
      id > razorpayConfig.limits.freeChapters &&
      id <= razorpayConfig.limits.maxChapterId
    ) {
      valid.push(id)
    } else {
      invalid.push(id)
    }
  }
  
  return { valid, invalid }
}