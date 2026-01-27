// app/api/currency/rates/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Types
interface ExchangeRateResponse {
  success: boolean
  data: Record<string, number>
  cached: boolean
  fallback?: boolean
  timestamp: number
  expiresAt: number
}

interface CachedRates {
  rates: Record<string, number>
  timestamp: number
  expiresAt: number
}

// Constants
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
const FETCH_TIMEOUT = 5000 // 5 seconds
const STALE_WHILE_REVALIDATE = 24 * 60 * 60 * 1000 // 24 hours

// In-memory cache (works within single instance lifetime)
let memoryCache: CachedRates | null = null
let fetchPromise: Promise<Record<string, number>> | null = null

// Fallback rates - updated periodically based on approximate rates
const FALLBACK_RATES: Record<string, number> = {
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
} as const

/**
 * Fetch rates with timeout
 */
async function fetchRatesWithTimeout(): Promise<Record<string, number>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/INR',
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        // Disable Next.js caching - we manage our own
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.rates || typeof data.rates !== 'object') {
      throw new Error('Invalid response format from exchange rate API')
    }

    return data.rates
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get rates with deduplication
 */
async function getRatesWithDeduplication(): Promise<Record<string, number>> {
  // If there's already a fetch in progress, wait for it
  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = fetchRatesWithTimeout()

  try {
    const rates = await fetchPromise
    return rates
  } finally {
    fetchPromise = null
  }
}

/**
 * Check if cache is fresh
 */
function isCacheFresh(cache: CachedRates): boolean {
  return Date.now() < cache.expiresAt
}

/**
 * Check if cache is stale but still usable
 */
function isCacheUsable(cache: CachedRates): boolean {
  return Date.now() < cache.timestamp + STALE_WHILE_REVALIDATE
}

/**
 * Create response with proper headers
 */
function createResponse(
  data: ExchangeRateResponse,
  options: { status?: number; revalidating?: boolean } = {}
): NextResponse {
  const { status = 200, revalidating = false } = options
  
  const response = NextResponse.json(data, { status })

  // Calculate max-age based on when data expires
  const maxAge = Math.max(
    0,
    Math.floor((data.expiresAt - Date.now()) / 1000)
  )

  // Set cache headers
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${maxAge}, stale-while-revalidate=${STALE_WHILE_REVALIDATE / 1000}`
  )

  // Add timing headers for debugging
  response.headers.set('X-Cache-Status', data.cached ? 'HIT' : 'MISS')
  
  if (data.fallback) {
    response.headers.set('X-Fallback-Used', 'true')
  }
  
  if (revalidating) {
    response.headers.set('X-Revalidating', 'true')
  }

  return response
}

/**
 * Attempt background revalidation
 */
function triggerBackgroundRevalidation(): void {
  // Fire and forget - don't await
  getRatesWithDeduplication()
    .then((rates) => {
      const now = Date.now()
      memoryCache = {
        rates,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      }
      console.log('Background revalidation completed')
    })
    .catch((error) => {
      console.error('Background revalidation failed:', error)
    })
}

export async function GET(request: NextRequest) {
  const requestStart = Date.now()

  try {
    // Check for fresh cache
    if (memoryCache && isCacheFresh(memoryCache)) {
      return createResponse({
        success: true,
        data: memoryCache.rates,
        cached: true,
        timestamp: memoryCache.timestamp,
        expiresAt: memoryCache.expiresAt,
      })
    }

    // Check for stale-but-usable cache
    if (memoryCache && isCacheUsable(memoryCache)) {
      // Return stale data immediately, revalidate in background
      triggerBackgroundRevalidation()

      return createResponse(
        {
          success: true,
          data: memoryCache.rates,
          cached: true,
          timestamp: memoryCache.timestamp,
          expiresAt: memoryCache.expiresAt,
        },
        { revalidating: true }
      )
    }

    // Need to fetch fresh data
    try {
      const rates = await getRatesWithDeduplication()
      const now = Date.now()
      
      memoryCache = {
        rates,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      }

      return createResponse({
        success: true,
        data: rates,
        cached: false,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      })
    } catch (fetchError) {
      console.error('Failed to fetch exchange rates:', fetchError)

      // If we have any cached data (even very stale), use it
      if (memoryCache) {
        console.log('Using stale cache after fetch failure')
        return createResponse(
          {
            success: true,
            data: memoryCache.rates,
            cached: true,
            timestamp: memoryCache.timestamp,
            expiresAt: Date.now() + 5 * 60 * 1000, // Short expiry for stale fallback
          },
          { status: 200 }
        )
      }

      // Last resort: use hardcoded fallback
      const now = Date.now()
      return createResponse({
        success: true,
        data: FALLBACK_RATES,
        cached: false,
        fallback: true,
        timestamp: now,
        expiresAt: now + 5 * 60 * 1000, // Short expiry for fallback
      })
    }
  } catch (error) {
    console.error('Unexpected error in exchange rate API:', error)

    const now = Date.now()
    return createResponse(
      {
        success: false,
        data: FALLBACK_RATES,
        cached: false,
        fallback: true,
        timestamp: now,
        expiresAt: now + 60 * 1000, // Very short expiry on error
      },
      { status: 500 }
    )
  }
}

// Optional: Add HEAD method for health checks
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Cache-Status': memoryCache ? 'AVAILABLE' : 'EMPTY',
    },
  })
}