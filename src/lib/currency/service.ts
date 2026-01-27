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

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Use a class to manage rates cache properly
class ExchangeRateService {
  private ratesCache: { data: ExchangeRates; expiry: number } | null = null
  private fetchPromise: Promise<ExchangeRates> | null = null

  async fetchExchangeRates(): Promise<ExchangeRates> {
    // Return cached data if valid
    if (this.ratesCache && Date.now() < this.ratesCache.expiry) {
      return this.ratesCache.data
    }

    // Deduplicate concurrent requests
    if (this.fetchPromise) {
      return this.fetchPromise
    }

    this.fetchPromise = this.doFetch()
    
    try {
      const result = await this.fetchPromise
      return result
    } finally {
      this.fetchPromise = null
    }
  }

  private async doFetch(): Promise<ExchangeRates> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(
        'https://api.exchangerate-api.com/v4/latest/INR',
        { 
          signal: controller.signal,
          next: { revalidate: 3600 } 
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch exchange rates`)
      }

      const data = await response.json()

      const rates: ExchangeRates = {
        base: 'INR',
        rates: data.rates,
        timestamp: Date.now(),
      }

      this.ratesCache = {
        data: rates,
        expiry: Date.now() + CACHE_TTL,
      }

      return rates
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
      return this.getFallbackRates()
    }
  }

  private getFallbackRates(): ExchangeRates {
    return {
      base: 'INR',
      rates: {
        USD: 0.012,
        EUR: 0.011,
        GBP: 0.0095,
        AUD: 0.018,
        CAD: 0.016,
        SGD: 0.016,
        AED: 0.044,
        JPY: 1.79,
        CNY: 0.086,
        INR: 1,
      },
      timestamp: Date.now(),
    }
  }

  clearCache(): void {
    this.ratesCache = null
  }
}

// Singleton instance
const exchangeRateService = new ExchangeRateService()

export async function detectUserLocation(): Promise<GeoLocation> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch('https://ipapi.co/json/', {
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to detect location`)
    }

    const data = await response.json()
    
    // Validate response data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from geolocation API')
    }

    const countryCode = data.country_code || 'IN'
    const currencyInfo = COUNTRY_CURRENCY_MAP[countryCode] || { currency: 'USD', symbol: '$' }

    return {
      country: data.country_name || 'Unknown',
      countryCode,
      currency: currencyInfo.currency,
      currencySymbol: currencyInfo.symbol,
    }
  } catch (error) {
    console.error('Location detection failed:', error)
    // Return default for India
    return {
      country: 'India',
      countryCode: 'IN',
      currency: 'INR',
      currencySymbol: '₹',
    }
  }
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  return exchangeRateService.fetchExchangeRates()
}

export function getCurrencyInfo(targetCurrency: string): { currency: string; symbol: string } {
  const entry = Object.entries(COUNTRY_CURRENCY_MAP).find(
    ([_, info]) => info.currency === targetCurrency
  )
  return entry?.[1] || { currency: targetCurrency, symbol: targetCurrency }
}

export async function convertPrice(
  inrAmount: number,
  targetCurrency: string
): Promise<ConvertedPrice> {
  if (targetCurrency === 'INR') {
    return {
      original: inrAmount,
      converted: inrAmount,
      currency: 'INR',
      symbol: '₹',
      formatted: formatCurrency(inrAmount, 'INR', '₹'),
      rate: 1,
    }
  }

  const rates = await fetchExchangeRates()
  const currencyInfo = getCurrencyInfo(targetCurrency)
  
  const rate = rates.rates[targetCurrency]
  
  if (rate === undefined) {
    console.warn(`No exchange rate found for ${targetCurrency}, using 1:1`)
    return {
      original: inrAmount,
      converted: inrAmount,
      currency: targetCurrency,
      symbol: currencyInfo.symbol,
      formatted: formatCurrency(inrAmount, targetCurrency, currencyInfo.symbol),
      rate: 1,
    }
  }

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

export function formatCurrency(
  amount: number,
  currency: string,
  symbol: string
): string {
  try {
    // Use Intl for proper formatting
    const formatted = new Intl.NumberFormat(getLocaleForCurrency(currency), {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: ['JPY', 'KRW'].includes(currency) ? 0 : 2,
      maximumFractionDigits: ['JPY', 'KRW'].includes(currency) ? 0 : 2,
    }).format(amount)
    
    return formatted
  } catch {
    // Fallback formatting
    if (['JPY', 'KRW'].includes(currency)) {
      return `${symbol}${Math.round(amount).toLocaleString()}`
    }
    return `${symbol}${amount.toFixed(2)}`
  }
}

function getLocaleForCurrency(currency: string): string {
  const localeMap: Record<string, string> = {
    USD: 'en-US',
    GBP: 'en-GB',
    EUR: 'de-DE',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
    INR: 'en-IN',
    AUD: 'en-AU',
    CAD: 'en-CA',
    SGD: 'en-SG',
    AED: 'ar-AE',
  }
  return localeMap[currency] || 'en-US'
}

export { exchangeRateService }