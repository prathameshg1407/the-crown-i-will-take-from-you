// lib/currency/context.tsx
"use client"

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  useMemo,
  useRef
} from 'react'
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

const LOCATION_CACHE_KEY = 'userLocation'
const LOCATION_TIMESTAMP_KEY = 'locationTimestamp'
const LOCATION_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const PRICE_CACHE_MAX_SIZE = 100

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Use ref for price cache to avoid re-renders and manage size
  const priceCacheRef = useRef<Map<string, ConvertedPrice>>(new Map())
  // Track pending conversions to deduplicate
  const pendingConversionsRef = useRef<Map<string, Promise<ConvertedPrice>>>(new Map())

  const isInternational = location?.countryCode !== 'IN'
  const currency = location?.currency || 'INR'
  const currencySymbol = location?.currencySymbol || '₹'

  const loadCachedLocation = useCallback((): GeoLocation | null => {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY)
      const timestamp = localStorage.getItem(LOCATION_TIMESTAMP_KEY)

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10)
        if (age < LOCATION_CACHE_TTL) {
          return JSON.parse(cached) as GeoLocation
        }
      }
    } catch (e) {
      console.error('Failed to load cached location:', e)
    }
    return null
  }, [])

  const saveLocationToCache = useCallback((loc: GeoLocation): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc))
      localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString())
    } catch (e) {
      console.error('Failed to cache location:', e)
    }
  }, [])

  const refreshLocation = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const loc = await detectUserLocation()
      setLocation(loc)
      saveLocationToCache(loc)
      
      // Clear price cache when location changes
      priceCacheRef.current.clear()
      pendingConversionsRef.current.clear()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect location'
      setError(message)
      console.error('Location refresh failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [saveLocationToCache])

  // Initialize location on mount
  useEffect(() => {
    const cachedLocation = loadCachedLocation()
    
    if (cachedLocation) {
      setLocation(cachedLocation)
      setIsLoading(false)
    } else {
      refreshLocation()
    }
  }, [loadCachedLocation, refreshLocation])

  const convertFromINR = useCallback(async (inrAmount: number): Promise<ConvertedPrice> => {
    // Handle INR case immediately
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
    
    // Check cache first
    const cached = priceCacheRef.current.get(cacheKey)
    if (cached) {
      return cached
    }

    // Check if there's already a pending request for this conversion
    const pending = pendingConversionsRef.current.get(cacheKey)
    if (pending) {
      return pending
    }

    // Create new conversion promise
    const conversionPromise = (async () => {
      try {
        const converted = await convertPrice(inrAmount, location.currency)
        
        // Manage cache size
        if (priceCacheRef.current.size >= PRICE_CACHE_MAX_SIZE) {
          const firstKey = priceCacheRef.current.keys().next().value
          if (firstKey) {
            priceCacheRef.current.delete(firstKey)
          }
        }
        
        priceCacheRef.current.set(cacheKey, converted)
        return converted
      } finally {
        pendingConversionsRef.current.delete(cacheKey)
      }
    })()

    pendingConversionsRef.current.set(cacheKey, conversionPromise)
    return conversionPromise
  }, [location])

  const contextValue = useMemo<CurrencyContextType>(() => ({
    location,
    isLoading,
    isInternational,
    currency,
    currencySymbol,
    convertFromINR,
    error,
    refreshLocation,
  }), [
    location,
    isLoading,
    isInternational,
    currency,
    currencySymbol,
    convertFromINR,
    error,
    refreshLocation,
  ])

  return (
    <CurrencyContext.Provider value={contextValue}>
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

// Custom hook for converting prices with loading state
export function useConvertedPrice(inrAmount: number | null) {
  const { convertFromINR, currency } = useCurrency()
  const [convertedPrice, setConvertedPrice] = useState<ConvertedPrice | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionError, setConversionError] = useState<string | null>(null)

  useEffect(() => {
    if (inrAmount === null) {
      setConvertedPrice(null)
      return
    }

    let cancelled = false
    setIsConverting(true)
    setConversionError(null)

    convertFromINR(inrAmount)
      .then((result) => {
        if (!cancelled) {
          setConvertedPrice(result)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setConversionError(err instanceof Error ? err.message : 'Conversion failed')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsConverting(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [inrAmount, convertFromINR, currency])

  return { convertedPrice, isConverting, conversionError }
}