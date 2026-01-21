// lib/razorpay/config.ts

import { PRICING } from '@/data/chapters'

export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  currency: 'INR',
  
  // Pricing in paise
  pricing: {
    complete: PRICING.COMPLETE_PACK.price * 100, // ₹1,699 in paise
    customPerChapter: PRICING.CUSTOM_SELECTION.pricePerChapter * 100, // ₹8 in paise
  },
}

export function getCompletePackPrice(): number {
  return razorpayConfig.pricing.complete
}

export function getCustomPrice(chapterCount: number): number {
  return chapterCount * razorpayConfig.pricing.customPerChapter
}