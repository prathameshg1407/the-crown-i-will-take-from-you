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

// Supported currencies for PayPal international payments
export const SUPPORTED_INTERNATIONAL_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'] as const
export type InternationalCurrency = typeof SUPPORTED_INTERNATIONAL_CURRENCIES[number]
export type PaymentCurrency = 'INR' | InternationalCurrency

// Exchange rates - INR per 1 unit of foreign currency
// IMPORTANT: In production, fetch these from a reliable API (e.g., exchangerate-api.com)
// Update these periodically or implement real-time fetching
const EXCHANGE_RATES: Record<InternationalCurrency, number> = {
  USD: 83.50,
  EUR: 91.00,
  GBP: 106.00,
  CAD: 62.00,
  AUD: 55.00,
  SGD: 62.50,
}

export const razorpayConfig = {
  publicKeyId: process.env.RAZORPAY_KEY_ID || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  
  // Default currencies
  domesticCurrency: 'INR' as const,
  internationalCurrency: 'USD' as const, // Default for international users
  
  // Pricing in paise (smallest INR unit)
  pricing: {
    complete: PRICING.COMPLETE_PACK.price * 100,
    customPerChapter: PRICING.CUSTOM_SELECTION.pricePerChapter * 100,
  },
  
  // USD pricing (in cents) - Set these explicitly for cleaner international pricing
  // Or use null to auto-convert from INR
  usdPricing: {
    complete: null as number | null, // Auto-convert: ~$6
    customPerChapter: null as number | null, // Auto-convert: ~$0.18
  },
  
  // Limits
  limits: {
    minCustomChapters: PRICING.CUSTOM_SELECTION.minChapters,
    maxChapterId: 386,
    freeChapters: PRICING.FREE_CHAPTERS,
  },
  
  // Supported methods by region
  paymentMethods: {
    india: ['card', 'upi', 'netbanking', 'wallet', 'emi'],
    international: ['paypal'], // Only PayPal for international
  },
} as const

/**
 * Get exchange rate for currency (INR per 1 unit)
 */
export function getExchangeRate(currency: InternationalCurrency): number {
  return EXCHANGE_RATES[currency] || EXCHANGE_RATES.USD
}

/**
 * Convert INR amount (in paise) to international currency (in cents/smallest unit)
 */
export function convertINRToInternational(
  amountInPaise: number, 
  currency: InternationalCurrency = 'USD'
): number {
  const amountInINR = amountInPaise / 100
  const rate = getExchangeRate(currency)
  const converted = amountInINR / rate
  // Round up to nearest cent to avoid undercharging
  return Math.ceil(converted * 100)
}

/**
 * Convert international amount (in cents) back to INR (in paise) for verification
 */
export function convertInternationalToINR(
  amountInCents: number,
  currency: InternationalCurrency = 'USD'
): number {
  const amount = amountInCents / 100
  const rate = getExchangeRate(currency)
  return Math.round(amount * rate * 100)
}

/**
 * Get complete pack price in specified currency
 */
export function getCompletePackPrice(currency: PaymentCurrency = 'INR'): number {
  if (currency === 'INR') {
    return razorpayConfig.pricing.complete
  }
  
  // Use explicit USD price if set, otherwise convert
  if (currency === 'USD' && razorpayConfig.usdPricing.complete) {
    return razorpayConfig.usdPricing.complete
  }
  
  return convertINRToInternational(
    razorpayConfig.pricing.complete, 
    currency as InternationalCurrency
  )
}

/**
 * Get custom selection price in specified currency
 */
export function getCustomPrice(
  chapterCount: number, 
  currency: PaymentCurrency = 'INR'
): number {
  if (chapterCount < razorpayConfig.limits.minCustomChapters) {
    throw new Error(`Minimum ${razorpayConfig.limits.minCustomChapters} chapters required`)
  }
  
  if (currency === 'INR') {
    return chapterCount * razorpayConfig.pricing.customPerChapter
  }
  
  // Use explicit USD price if set, otherwise convert
  if (currency === 'USD' && razorpayConfig.usdPricing.customPerChapter) {
    return chapterCount * razorpayConfig.usdPricing.customPerChapter
  }
  
  return convertINRToInternational(
    chapterCount * razorpayConfig.pricing.customPerChapter,
    currency as InternationalCurrency
  )
}

/**
 * Get currency based on user location
 */
export function getPaymentCurrency(
  isInternational: boolean,
  preferredCurrency?: string
): PaymentCurrency {
  if (!isInternational) {
    return 'INR'
  }
  
  // Check if preferred currency is supported
  if (
    preferredCurrency && 
    SUPPORTED_INTERNATIONAL_CURRENCIES.includes(preferredCurrency as InternationalCurrency)
  ) {
    return preferredCurrency as InternationalCurrency
  }
  
  // Default to USD for international
  return razorpayConfig.internationalCurrency
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

/**
 * Check if currency is international
 */
export function isInternationalCurrency(currency: string): currency is InternationalCurrency {
  return SUPPORTED_INTERNATIONAL_CURRENCIES.includes(currency as InternationalCurrency)
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: PaymentCurrency): string {
  const value = amount / 100
  
  const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'INR' ? 0 : 2,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(value)
}