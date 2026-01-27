// app/api/currency/rates/route.ts

import { NextResponse } from 'next/server'

// Cache exchange rates on server
let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    // Check cache
    if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedRates.rates,
        cached: true,
        timestamp: cachedRates.timestamp,
      })
    }

    // Fetch fresh rates
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/INR'
    )

    if (!response.ok) {
      throw new Error('Failed to fetch rates')
    }

    const data = await response.json()

    // Cache the rates
    cachedRates = {
      rates: data.rates,
      timestamp: Date.now(),
    }

    return NextResponse.json({
      success: true,
      data: data.rates,
      cached: false,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Exchange rate API error:', error)

    // Return fallback rates
    return NextResponse.json({
      success: true,
      data: {
        USD: 0.012,
        EUR: 0.011,
        GBP: 0.0095,
        AUD: 0.018,
        CAD: 0.016,
        SGD: 0.016,
        JPY: 1.79,
        INR: 1,
      },
      cached: false,
      fallback: true,
      timestamp: Date.now(),
    })
  }
}