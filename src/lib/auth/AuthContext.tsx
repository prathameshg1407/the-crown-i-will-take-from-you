// lib/auth/AuthContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { logger } from '../logger'

export interface User {
  id: string
  email: string
  name: string | null
  tier: 'free' | 'complete'
  ownedChapters: number[]
  avatarUrl?: string | null
  createdAt: string
}

export interface UserStats {
  activeSessions: number
  chaptersCompleted: number
  chaptersInProgress: number
}

interface AuthContextType {
  user: User | null
  stats: UserStats | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes
const USER_FETCH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MAX_BACKGROUND_RETRIES = 10 // More retries before giving up
const RETRY_DELAY_MS = 3000

function transformUserData(apiUser: any): User {
  const ownedChapters = apiUser.ownedChapters || apiUser.owned_chapters || []
  
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    tier: apiUser.tier,
    ownedChapters: Array.isArray(ownedChapters) ? ownedChapters : [],
    avatarUrl: apiUser.avatar_url || apiUser.avatarUrl,
    createdAt: apiUser.created_at || apiUser.createdAt,
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const isOnline = () => typeof navigator !== 'undefined' ? navigator.onLine : true

// Storage keys for persistence
const STORAGE_KEY_USER = 'auth_user_cache'
const STORAGE_KEY_TIMESTAMP = 'auth_user_timestamp'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Get cached user from localStorage
function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(STORAGE_KEY_USER)
    const timestamp = localStorage.getItem(STORAGE_KEY_TIMESTAMP)
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10)
      if (age < CACHE_DURATION) {
        return JSON.parse(cached)
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return null
}

// Save user to localStorage
function cacheUser(user: User | null) {
  if (typeof window === 'undefined') return
  
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString())
    } else {
      localStorage.removeItem(STORAGE_KEY_USER)
      localStorage.removeItem(STORAGE_KEY_TIMESTAMP)
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize with cached user for instant UI
  const [user, setUser] = useState<User | null>(() => getCachedUser())
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  const isRefreshing = useRef(false)
  const refreshPromise = useRef<Promise<boolean> | null>(null)
  const backgroundRetryCount = useRef(0)
  const lastSuccessfulFetch = useRef<number>(Date.now())
  const initialLoadComplete = useRef(false)

  const isAuthenticated = !!user

  // Update user and cache
  const setUserWithCache = useCallback((newUser: User | null) => {
    setUser(newUser)
    cacheUser(newUser)
  }, [])

  // Robust token refresh - NEVER logs out user on failure
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current
    }

    if (!isOnline()) {
      logger.debug('Offline - skipping token refresh')
      return true // Assume success when offline, keep user logged in
    }

    isRefreshing.current = true
    
    refreshPromise.current = (async () => {
      for (let i = 0; i < 3; i++) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            backgroundRetryCount.current = 0
            logger.info('Token refreshed successfully')
            return true
          }

          // Server error - retry
          if (response.status >= 500) {
            logger.warn({ status: response.status, attempt: i + 1 }, 'Server error during refresh, retrying...')
            await sleep(RETRY_DELAY_MS * (i + 1))
            continue
          }

          // 401/403 - token issues, but DON'T logout
          // Just return false and let the cached user remain
          if (response.status === 401 || response.status === 403) {
            logger.warn({ status: response.status }, 'Token refresh returned auth error - keeping user cached')
            return false
          }

          // Other client errors
          logger.warn({ status: response.status }, 'Token refresh failed with client error')
          return false
          
        } catch (error) {
          logger.warn({ attempt: i + 1, error: error instanceof Error ? error.message : String(error) }, 'Token refresh network error, retrying...')
          await sleep(RETRY_DELAY_MS * (i + 1))
        }
      }
      
      logger.warn('All token refresh attempts failed - keeping user cached')
      return false
    })()

    try {
      return await refreshPromise.current
    } finally {
      isRefreshing.current = false
      refreshPromise.current = null
    }
  }, [])

  // Fetch user - NEVER logs out on failure, uses cache
  const fetchUser = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        logger.debug('Fetching user data...')
      }
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.data?.user) {
          const transformedUser = transformUserData(data.data.user)
          setUserWithCache(transformedUser)
          setStats(data.data.stats)
          backgroundRetryCount.current = 0
          lastSuccessfulFetch.current = Date.now()
          return true
        }
      } else if (response.status === 401) {
        // Try to refresh tokens
        const refreshed = await refreshTokens()
        
        if (refreshed) {
          // Retry fetching user after refresh
          const retryResponse = await fetch('/api/auth/me', {
            credentials: 'include',
            cache: 'no-store',
          })
          
          if (retryResponse.ok) {
            const data = await retryResponse.json()
            if (data.success && data.data?.user) {
              const transformedUser = transformUserData(data.data.user)
              setUserWithCache(transformedUser)
              setStats(data.data.stats)
              backgroundRetryCount.current = 0
              lastSuccessfulFetch.current = Date.now()
              return true
            }
          }
        }
        
        // Refresh failed, but DON'T logout - keep cached user
        // Only clear if we never had a user (initial load with no session)
        if (!initialLoadComplete.current && !getCachedUser()) {
          // This is initial load with no valid session - user is not logged in
          setUser(null)
          setStats(null)
          return false
        }
        
        // We had a user before, keep them cached
        logger.warn('Auth failed but keeping cached user')
        backgroundRetryCount.current++
        return false
      }
      
      // Server error - keep cached user
      if (response.status >= 500) {
        logger.warn({ status: response.status }, 'Server error fetching user - keeping cache')
        return false
      }
      
      return false
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch user')
      
      // Network error - keep cached user
      if (!isOnline()) {
        logger.warn('Offline - keeping current user state')
      }
      
      backgroundRetryCount.current++
      return false
    } finally {
      setIsLoading(false)
      initialLoadComplete.current = true
    }
  }, [refreshTokens, setUserWithCache])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Login failed')
      }

      const transformedUser = transformUserData(data.data.user)
      setUserWithCache(transformedUser)
      backgroundRetryCount.current = 0
      lastSuccessfulFetch.current = Date.now()
      
      toast.success('Welcome back!')
      
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect')
      router.push(redirectUrl || '/')
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [router, setUserWithCache])

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Signup failed')
      }

      const transformedUser = transformUserData(data.data.user)
      setUserWithCache(transformedUser)
      backgroundRetryCount.current = 0
      lastSuccessfulFetch.current = Date.now()
      
      toast.success(data.data.message || 'Account created successfully!')
      router.push('/')
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [router, setUserWithCache])

  // ONLY way to logout - explicit user action
  const logout = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Clear local state immediately
      setUserWithCache(null)
      setStats(null)
      backgroundRetryCount.current = 0
      
      // Try to call logout endpoint (but don't block on it)
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {
        // Ignore errors - user is logged out locally
      })

      // Notify other tabs
      try {
        localStorage.setItem('auth_logout', Date.now().toString())
        localStorage.removeItem('auth_logout')
      } catch {
        // localStorage might not be available
      }
      
      toast.success('Logged out successfully')
      router.push('/')
      
    } catch (error) {
      // Even if server logout fails, clear local state
      setUserWithCache(null)
      setStats(null)
      toast.success('Logged out')
      logger.error({ error: String(error) }, 'Logout error')
    } finally {
      setIsLoading(false)
    }
  }, [router, setUserWithCache])

  const refreshUser = useCallback(async () => {
    logger.debug('Manually refreshing user data...')
    await fetchUser()
  }, [fetchUser])

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      cacheUser(updated)
      return updated
    })
  }, [])

  // Initial load
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Proactive token refresh - only when user exists
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(async () => {
      if (!isOnline()) {
        logger.debug('Offline - skipping scheduled refresh')
        return
      }
      
      await refreshTokens()
      // Never logout on refresh failure - just log
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(refreshInterval)
  }, [user, refreshTokens])

  // Periodic user data refresh - silent, never logs out
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchUser(true) // Silent fetch, never logs out
    }, USER_FETCH_INTERVAL)

    return () => clearInterval(interval)
  }, [user, fetchUser])

  // Background retry for failed fetches
  useEffect(() => {
    if (!user || backgroundRetryCount.current === 0) return
    if (backgroundRetryCount.current >= MAX_BACKGROUND_RETRIES) {
      logger.warn('Max background retries reached - will retry on next user action')
      return
    }

    const retryTimeout = setTimeout(() => {
      if (isOnline()) {
        logger.info({ retryCount: backgroundRetryCount.current }, 'Background retry for user fetch')
        fetchUser(true)
      }
    }, RETRY_DELAY_MS * Math.min(backgroundRetryCount.current, 5))

    return () => clearTimeout(retryTimeout)
  }, [user, fetchUser])

  // Handle visibility change - refresh when tab becomes visible
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastSuccessfulFetch.current
        
        // Only refresh if more than 5 minutes since last fetch
        if (timeSinceLastFetch > 5 * 60 * 1000) {
          logger.debug('Tab visible after long absence - refreshing')
          await refreshTokens()
          await fetchUser(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, refreshTokens, fetchUser])

  // Handle online/offline status
  useEffect(() => {
    if (!user) return

    const handleOnline = async () => {
      logger.info('Back online - refreshing session')
      toast.success('Back online')
      backgroundRetryCount.current = 0 // Reset retry count
      await refreshTokens()
      await fetchUser(true)
    }

    const handleOffline = () => {
      logger.warn('Connection lost - keeping cached session')
      toast.error('You are offline', { duration: 3000 })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user, refreshTokens, fetchUser])

  // Cross-tab synchronization - ONLY for explicit logout
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_logout') {
        // Only clear on explicit logout from another tab
        setUserWithCache(null)
        setStats(null)
        router.push('/login')
      } else if (e.key === 'auth_refresh') {
        fetchUser(true)
      } else if (e.key === STORAGE_KEY_USER && e.newValue) {
        // Sync user data from another tab
        try {
          const newUser = JSON.parse(e.newValue)
          setUser(newUser)
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fetchUser, router, setUserWithCache])

  const value: AuthContextType = {
    user,
    stats,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshUser,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}