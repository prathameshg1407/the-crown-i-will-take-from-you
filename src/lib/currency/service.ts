// lib/currency/service.ts

export interface GeoLocation {
  country: string
  countryCode: string
  currency: string
  currencySymbol: string
}

export interface ExchangeRates {
  base: string
  rates: Record<string, number>
  timestamp: number
}

export interface ConvertedPrice {
  original: number
  converted: number
  currency: string
  symbol: string
  formatted: string
  rate: number
}

// Currency mapping by country code
const COUNTRY_CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  US: { currency: 'USD', symbol: '$' },
  GB: { currency: 'GBP', symbol: '£' },
  DE: { currency: 'EUR', symbol: '€' },
  FR: { currency: 'EUR', symbol: '€' },
  IT: { currency: 'EUR', symbol: '€' },
  ES: { currency: 'EUR', symbol: '€' },
  AU: { currency: 'AUD', symbol: 'A$' },
  CA: { currency: 'CAD', symbol: 'C$' },
  SG: { currency: 'SGD', symbol: 'S$' },
  AE: { currency: 'AED', symbol: 'د.إ' },
  JP: { currency: 'JPY', symbol: '¥' },
  CN: { currency: 'CNY', symbol: '¥' },
  IN: { currency: 'INR', symbol: '₹' },
}

// Cache for exchange rates (1 hour TTL)
let ratesCache: { data: ExchangeRates; expiry: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Detect user's location using IP geolocation
 */
export async function detectUserLocation(): Promise<GeoLocation> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to detect location')
    }

    const data = await response.json()
    const countryCode = data.country_code || 'IN'
    const currencyInfo = COUNTRY_CURRENCY_MAP[countryCode] || { currency: 'USD', symbol: '$' }

    return {
      country: data.country_name || 'India',
      countryCode,
      currency: currencyInfo.currency,
      currencySymbol: currencyInfo.symbol,
    }
  } catch (error) {
    console.error('Location detection failed:', error)
    return {
      country: 'India',
      countryCode: 'IN',
      currency: 'INR',
      currencySymbol: '₹',
    }
  }
}

/**
 * Fetch live exchange rates
 */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  if (ratesCache && Date.now() < ratesCache.expiry) {
    return ratesCache.data
  }

  try {
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/INR',
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates')
    }

    const data = await response.json()

    const rates: ExchangeRates = {
      base: 'INR',
      rates: data.rates,
      timestamp: Date.now(),
    }

    ratesCache = {
      data: rates,
      expiry: Date.now() + CACHE_TTL,
    }

    return rates
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)

    // Fallback rates
    return {
      base: 'INR',
      rates: {
        USD: 0.012,
        EUR: 0.011,
        GBP: 0.0095,
        AUD: 0.018,
        CAD: 0.016,
        SGD: 0.016,
        JPY: 1.79,
        INR: 1,
      },
      timestamp: Date.now(),
    }
  }
}

/**
 * Convert INR price to target currency
 */
export async function convertPrice(
  inrAmount: number,
  targetCurrency: string
): Promise<ConvertedPrice> {
  const rates = await fetchExchangeRates()
  const currencyInfo = Object.entries(COUNTRY_CURRENCY_MAP).find(
    ([_, info]) => info.currency === targetCurrency
  )?.[1] || { currency: targetCurrency, symbol: targetCurrency }

  const rate = rates.rates[targetCurrency] || 1
  const converted = inrAmount * rate

  const formatted = formatCurrency(converted, targetCurrency, currencyInfo.symbol)

  return {
    original: inrAmount,
    converted: Math.round(converted * 100) / 100,
    currency: targetCurrency,
    symbol: currencyInfo.symbol,
    formatted,
    rate,
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string,
  symbol: string
): string {
  if (['JPY', 'KRW'].includes(currency)) {
    return `${symbol}${Math.round(amount).toLocaleString()}`
  }
  return `${symbol}${amount.toFixed(2)}`
}