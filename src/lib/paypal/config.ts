// lib/paypal/config.ts

import { PRICING } from '@/data/chapters'

// Validate environment at import time (server-side only)
const validateEnv = () => {
  if (typeof window !== 'undefined') return
  
  const required = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing PayPal env vars: ${missing.join(', ')}`)
  }
}

validateEnv()

export const paypalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  
  // Determine mode from environment
  mode: (process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live',
  
  get baseUrl() {
    return this.mode === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'
  },
  
  // Default currency for international payments
  defaultCurrency: 'USD' as const,
  
  // Supported currencies by PayPal
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY'] as const,
  
  // USD Pricing (matched to your INR pricing)
  // ₹1299 ≈ $18.47 USD, ₹19 ≈ $0.25 USD
  pricing: {
    complete: 18.47,
    customPerChapter: 0.25,
    minCustomAmount: 2.50, // 10 chapters minimum
  },
  
  limits: {
    minCustomChapters: PRICING.CUSTOM_SELECTION.minChapters,
    maxChapterId: 386,
    freeChapters: PRICING.FREE_CHAPTERS,
  },
} as const

export type SupportedCurrency = typeof paypalConfig.supportedCurrencies[number]

/**
 * Currency conversion rates from USD (approximate - update periodically)
 */
const USD_CONVERSION_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  CAD: 1.36,
  SGD: 1.34,
  JPY: 149.50,
}

/**
 * Get price in target currency
 */
export function getInternationalPrice(
  priceType: 'complete' | 'customPerChapter',
  currency: SupportedCurrency = 'USD'
): number {
  const basePrice = paypalConfig.pricing[priceType]
  const rate = USD_CONVERSION_RATES[currency] || 1
  const converted = basePrice * rate
  
  // Round appropriately
  if (currency === 'JPY') {
    return Math.round(converted)
  }
  return Math.round(converted * 100) / 100
}

/**
 * Get complete pack price in international currency
 */
export function getCompletePackPriceInternational(currency: SupportedCurrency = 'USD'): number {
  return getInternationalPrice('complete', currency)
}

/**
 * Get custom chapters price in international currency
 */
export function getCustomPriceInternational(
  chapterCount: number, 
  currency: SupportedCurrency = 'USD'
): number {
  if (chapterCount < paypalConfig.limits.minCustomChapters) {
    throw new Error(`Minimum ${paypalConfig.limits.minCustomChapters} chapters required`)
  }
  const pricePerChapter = getInternationalPrice('customPerChapter', currency)
  const total = pricePerChapter * chapterCount
  
  if (currency === 'JPY') {
    return Math.round(total)
  }
  return Math.round(total * 100) / 100
}

/**
 * Check if currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return paypalConfig.supportedCurrencies.includes(currency as SupportedCurrency)
}

/**
 * Format price for display
 */
export function formatInternationalPrice(amount: number, currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    JPY: '¥',
  }
  
  const symbol = symbols[currency] || '$'
  
  if (currency === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString()}`
  }
  return `${symbol}${amount.toFixed(2)}`
}