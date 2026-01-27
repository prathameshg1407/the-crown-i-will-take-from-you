"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  GeoLocation,
  ConvertedPrice,
  detectUserLocation,
  convertPrice,
} from './service'

interface CurrencyContextType {
  location: GeoLocation | null
  isLoading: boolean
  isInternational: boolean
  currency: string
  currencySymbol: string
  convertFromINR: (inrAmount: number) => Promise<ConvertedPrice>
  error: string | null
  refreshLocation: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

const priceCache = new Map<string, ConvertedPrice>()

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isInternational = location?.countryCode !== 'IN'
  const currency = location?.currency || 'INR'
  const currencySymbol = location?.currencySymbol || '₹'

  const refreshLocation = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const loc = await detectUserLocation()
      setLocation(loc)

      if (typeof window !== 'undefined') {
        localStorage.setItem('userLocation', JSON.stringify(loc))
        localStorage.setItem('locationTimestamp', Date.now().toString())
      }
    } catch (err) {
      setError('Failed to detect location')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('userLocation')
      const timestamp = localStorage.getItem('locationTimestamp')

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        if (age < 24 * 60 * 60 * 1000) {
          setLocation(JSON.parse(cached))
          setIsLoading(false)
          return
        }
      }
    }

    refreshLocation()
  }, [refreshLocation])

  const convertFromINR = useCallback(async (inrAmount: number): Promise<ConvertedPrice> => {
    if (!location || location.currency === 'INR') {
      return {
        original: inrAmount,
        converted: inrAmount,
        currency: 'INR',
        symbol: '₹',
        formatted: `₹${inrAmount.toLocaleString('en-IN')}`,
        rate: 1,
      }
    }

    const cacheKey = `${inrAmount}-${location.currency}`
    if (priceCache.has(cacheKey)) {
      return priceCache.get(cacheKey)!
    }

    const converted = await convertPrice(inrAmount, location.currency)
    priceCache.set(cacheKey, converted)

    return converted
  }, [location])

  return (
    <CurrencyContext.Provider
      value={{
        location,
        isLoading,
        isInternational,
        currency,
        currencySymbol,
        convertFromINR,
        error,
        refreshLocation,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}