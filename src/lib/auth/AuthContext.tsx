// lib/auth/AuthContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// CONSTANTS
// =============================================================================

const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes
const USER_FETCH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const RETRY_DELAY_MS = 3000
const MAX_RETRIES = 3
const MAX_FETCH_RETRIES = 2 // Prevent infinite loops in fetchUser

// Storage keys
const STORAGE_KEY_USER = 'auth_user_cache'
const STORAGE_KEY_TIMESTAMP = 'auth_user_timestamp'
const STORAGE_KEY_LOGOUT = 'auth_logout'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// =============================================================================
// UTILITIES
// =============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

const log = {
  debug: (message: string, data?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Auth] ${message}`, data || '')
    }
  },
  info: (message: string, data?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Auth] ${message}`, data || '')
    }
  },
  warn: (message: string, data?: object) => {
    console.warn(`[Auth] ${message}`, data || '')
  },
  error: (message: string, data?: object) => {
    console.error(`[Auth] ${message}`, data || '')
  },
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

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
      // Cache expired, clear it
      localStorage.removeItem(STORAGE_KEY_USER)
      localStorage.removeItem(STORAGE_KEY_TIMESTAMP)
    }
  } catch {
    // Ignore localStorage errors
  }
  return null
}

function setCachedUser(user: User | null): void {
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

function clearCache(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TIMESTAMP)
  } catch {
    // Ignore localStorage errors
  }
}

// =============================================================================
// DATA TRANSFORMER
// =============================================================================

function transformUserData(apiUser: Record<string, unknown>): User {
  const ownedChapters = (apiUser.ownedChapters || apiUser.owned_chapters || []) as number[]

  return {
    id: apiUser.id as string,
    email: apiUser.email as string,
    name: (apiUser.name as string) || null,
    tier: (apiUser.tier as 'free' | 'complete') || 'free',
    ownedChapters: Array.isArray(ownedChapters) ? ownedChapters : [],
    avatarUrl: (apiUser.avatar_url || apiUser.avatarUrl) as string | null,
    createdAt: (apiUser.created_at || apiUser.createdAt) as string,
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// =============================================================================
// PROVIDER
// =============================================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize with cached user for instant UI
  const [user, setUser] = useState<User | null>(() => getCachedUser())
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const router = useRouter()

  // Refs to prevent race conditions
  const isRefreshing = useRef(false)
  const refreshPromise = useRef<Promise<boolean> | null>(null)
  const lastSuccessfulFetch = useRef<number>(Date.now())
  const initialLoadComplete = useRef(false)
  const mountedRef = useRef(true)
  const fetchInProgress = useRef(false)

  const isAuthenticated = !!user

  // ===========================================================================
  // SET USER WITH CACHE
  // ===========================================================================

  const setUserWithCache = useCallback((newUser: User | null) => {
    if (!mountedRef.current) return
    setUser(newUser)
    setCachedUser(newUser)
  }, [])

  // ===========================================================================
  // REFRESH TOKENS
  // ===========================================================================

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refresh calls
    if (isRefreshing.current && refreshPromise.current) {
      log.debug('Waiting for existing refresh...')
      return refreshPromise.current
    }

    // Skip if offline
    if (!isOnline()) {
      log.debug('Offline - skipping token refresh')
      return true // Return true to not trigger logout
    }

    isRefreshing.current = true

    refreshPromise.current = (async () => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          log.debug(`Token refresh attempt ${attempt}/${MAX_RETRIES}`)
          
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            log.info('Token refreshed successfully', { 
              rotated: data.data?.rotated,
              rotationReused: data.data?.rotationReused 
            })
            return true
          }

          // Server error - retry with backoff
          if (response.status >= 500) {
            log.warn(`Server error during refresh (attempt ${attempt}/${MAX_RETRIES})`)
            if (attempt < MAX_RETRIES) {
              await sleep(RETRY_DELAY_MS * attempt)
              continue
            }
          }

          // Auth errors (401/403) - session is truly expired
          if (response.status === 401 || response.status === 403) {
            const errorData = await response.json().catch(() => ({}))
            log.warn('Token refresh failed - session expired', { 
              code: errorData.error?.code 
            })
            return false
          }

          // Other errors
          log.warn(`Token refresh failed with status ${response.status}`)
          return false

        } catch (error) {
          log.warn(`Token refresh network error (attempt ${attempt}/${MAX_RETRIES})`, {
            error: error instanceof Error ? error.message : 'Unknown'
          })
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt)
          }
        }
      }

      log.warn('All token refresh attempts failed')
      return false
    })()

    try {
      return await refreshPromise.current
    } finally {
      isRefreshing.current = false
      refreshPromise.current = null
    }
  }, [])

  // ===========================================================================
  // FETCH USER
  // ===========================================================================

  const fetchUser = useCallback(async (
    silent = false, 
    retryCount = 0
  ): Promise<boolean> => {
    // Prevent infinite loops
    if (retryCount >= MAX_FETCH_RETRIES) {
      log.warn('Max fetch retries reached - giving up')
      if (!silent) {
        setUserWithCache(null)
        if (mountedRef.current) {
          setStats(null)
          setIsLoading(false)
        }
      }
      return false
    }

    // Prevent concurrent fetches
    if (fetchInProgress.current && retryCount === 0) {
      log.debug('Fetch already in progress, skipping')
      return false
    }

    fetchInProgress.current = true

    if (!silent) {
      log.debug('Fetching user data...', { retryCount })
    }

    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.data?.user) {
          const transformedUser = transformUserData(data.data.user)
          setUserWithCache(transformedUser)
          
          if (mountedRef.current) {
            setStats(data.data.stats || null)
          }
          
          lastSuccessfulFetch.current = Date.now()
          log.debug('User data fetched successfully')
          return true
        }
      }

      // Handle 401 - try to refresh token
      if (response.status === 401) {
        log.debug('Access token expired, attempting refresh...', { retryCount })
        
        const refreshed = await refreshTokens()
        
        if (refreshed) {
          // Retry with incremented counter to prevent infinite loop
          log.debug('Token refreshed, retrying user fetch')
          fetchInProgress.current = false // Allow retry
          return await fetchUser(silent, retryCount + 1)
        }

        // Refresh failed - this is a definitive session expiration
        if (!initialLoadComplete.current && !getCachedUser()) {
          // No cached user and initial load failed - user is not logged in
          log.debug('Initial load with no valid session')
        } else {
          // Had a session that's now expired
          log.warn('Session definitively expired - logging out')
          if (!silent) {
            toast.error('Your session has expired. Please log in again.', {
              duration: 5000
            })
          }
        }
        
        setUserWithCache(null)
        if (mountedRef.current) {
          setStats(null)
        }
        return false
      }

      // Handle 403 - account deactivated
      if (response.status === 403) {
        log.warn('Account deactivated or forbidden')
        setUserWithCache(null)
        if (mountedRef.current) {
          setStats(null)
        }
        if (!silent) {
          toast.error('Your account has been deactivated.', { duration: 5000 })
        }
        return false
      }

      // Server errors - keep cached user
      if (response.status >= 500) {
        log.warn(`Server error (${response.status}) - keeping cached user`)
        return false
      }

      // Other errors (404, etc.)
      log.warn(`Unexpected response status: ${response.status}`)
      return false

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      log.error('Failed to fetch user', { error: message, retryCount })

      // Keep cached user on network errors
      if (!isOnline()) {
        log.warn('Offline - keeping cached user')
      }

      return false

    } finally {
      fetchInProgress.current = false
      if (mountedRef.current) {
        setIsLoading(false)
      }
      initialLoadComplete.current = true
    }
  }, [refreshTokens, setUserWithCache])

  // ===========================================================================
  // LOGIN
  // ===========================================================================

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true)

    try {
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
      lastSuccessfulFetch.current = Date.now()

      toast.success('Welcome back!')

      // Handle redirect
      const params = new URLSearchParams(window.location.search)
      const redirectUrl = params.get('redirect')
      router.push(redirectUrl || '/')

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      toast.error(message)
      throw error

    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [router, setUserWithCache])

  // ===========================================================================
  // SIGNUP
  // ===========================================================================

  const signup = useCallback(async (
    email: string,
    password: string,
    name?: string
  ): Promise<void> => {
    setIsLoading(true)

    try {
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
      lastSuccessfulFetch.current = Date.now()

      toast.success(data.data.message || 'Account created successfully!')
      router.push('/')

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      toast.error(message)
      throw error

    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [router, setUserWithCache])

  // ===========================================================================
  // LOGOUT
  // ===========================================================================

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)

    // Clear local state immediately
    setUserWithCache(null)
    setStats(null)
    clearCache()

    try {
      // Call logout endpoint (don't wait for it)
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {
        // Ignore - user is logged out locally
      })

      // Notify other tabs
      try {
        localStorage.setItem(STORAGE_KEY_LOGOUT, Date.now().toString())
        localStorage.removeItem(STORAGE_KEY_LOGOUT)
      } catch {
        // Ignore localStorage errors
      }

      toast.success('Logged out successfully')
      router.push('/')

    } catch (error) {
      log.error('Logout error', { error: String(error) })
      toast.success('Logged out')

    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [router, setUserWithCache])

  // ===========================================================================
  // REFRESH USER (Public method)
  // ===========================================================================

  const refreshUser = useCallback(async (): Promise<void> => {
    log.debug('Manual user refresh requested')
    await fetchUser()
  }, [fetchUser])

  // ===========================================================================
  // UPDATE USER (Optimistic update)
  // ===========================================================================

  const updateUser = useCallback((data: Partial<User>): void => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      setCachedUser(updated)
      return updated
    })
  }, [])

  // ===========================================================================
  // EFFECTS
  // ===========================================================================

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Periodic token refresh (only when logged in)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      if (isOnline()) {
        refreshTokens()
      }
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [user, refreshTokens])

  // Periodic user data refresh (silent)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      if (isOnline()) {
        fetchUser(true)
      }
    }, USER_FETCH_INTERVAL)

    return () => clearInterval(interval)
  }, [user, fetchUser])

  // Refresh on visibility change
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastSuccessfulFetch.current

        // Refresh if more than 5 minutes since last fetch
        if (timeSinceLastFetch > 5 * 60 * 1000) {
          log.debug('Tab visible after long absence - refreshing')
          
          // Try token refresh first
          const refreshed = await refreshTokens()
          
          if (refreshed) {
            // Only fetch user if refresh succeeded
            await fetchUser(true)
          } else {
            // Don't immediately logout - check if we're offline
            if (!isOnline()) {
              log.debug('User is offline - keeping cached state')
              toast('You appear to be offline', { 
                icon: '📡',
                duration: 2000 
              })
            } else {
              // Online but refresh failed - session expired
              log.warn('Session expired on visibility change')
              // fetchUser will handle the logout
              await fetchUser(true)
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, refreshTokens, fetchUser])

  // Handle online/offline
  useEffect(() => {
    if (!user) return

    const handleOnline = async () => {
      log.info('Back online - refreshing session')
      toast.success('Back online')
      
      const refreshed = await refreshTokens()
      if (refreshed) {
        await fetchUser(true)
      }
    }

    const handleOffline = () => {
      log.warn('Connection lost')
      toast.error('You are offline', { duration: 3000 })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user, refreshTokens, fetchUser])

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Handle logout from another tab
      if (e.key === STORAGE_KEY_LOGOUT) {
        log.info('Logout detected from another tab')
        setUserWithCache(null)
        setStats(null)
        router.push('/login')
        return
      }

      // Sync user data from another tab
      if (e.key === STORAGE_KEY_USER) {
        if (e.newValue) {
          try {
            const newUser = JSON.parse(e.newValue)
            log.debug('User data synced from another tab')
            setUser(newUser)
          } catch {
            // Ignore parse errors
          }
        } else {
          // User was cleared in another tab
          log.debug('User cleared in another tab')
          setUser(null)
          setStats(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [router, setUserWithCache])

  // ===========================================================================
  // RENDER
  // ===========================================================================

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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// =============================================================================
// UTILITY HOOK - Check auth status for protected routes
// =============================================================================

export function useRequireAuth(redirectTo = '/login'): {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
} {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
    }
  }, [isLoading, isAuthenticated, router, redirectTo])

  return { user, isLoading, isAuthenticated }
}