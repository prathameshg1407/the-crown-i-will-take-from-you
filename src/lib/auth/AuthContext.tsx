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

const MAX_REFRESH_RETRIES = 3
const RETRY_DELAY_MS = 2000
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000
const USER_FETCH_INTERVAL = 5 * 60 * 1000

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

// Error codes that indicate no active session (not an error condition)
const NO_SESSION_CODES = [
  'NO_REFRESH_TOKEN',
  'NO_SESSION', 
  'MISSING_TOKEN',
  'TOKEN_NOT_FOUND',
  'UNAUTHORIZED'
]

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  const isRefreshing = useRef(false)
  const refreshPromise = useRef<Promise<boolean> | null>(null)
  const retryCount = useRef(0)
  const lastSuccessfulRefresh = useRef<number>(Date.now())
  const hadSession = useRef(false)
  const initialLoadComplete = useRef(false)

  const isAuthenticated = !!user

  // Robust token refresh with proper error categorization
  const refreshTokens = useCallback(async (forceRetry = false): Promise<boolean> => {
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current
    }

    if (!isOnline()) {
      logger.warn('Offline - skipping token refresh')
      return hadSession.current
    }

    isRefreshing.current = true
    
    refreshPromise.current = (async () => {
      const attempts = forceRetry ? MAX_REFRESH_RETRIES : 1
      
      for (let i = 0; i < attempts; i++) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            lastSuccessfulRefresh.current = Date.now()
            retryCount.current = 0
            hadSession.current = true
            logger.info('Token refreshed successfully')
            return true
          }

          // Safely parse response
          let data: any = {}
          try {
            const text = await response.text()
            if (text) {
              data = JSON.parse(text)
            }
          } catch {
            // Response wasn't JSON, that's okay
          }
          
          const errorCode = data?.error?.code || data?.code || ''
          const errorMessage = data?.error?.message || data?.message || ''

          if (response.status === 401) {
            // Check if this is simply "no session" (not an error)
            const isNoSession = NO_SESSION_CODES.some(code => 
              errorCode.toUpperCase().includes(code) ||
              errorMessage.toUpperCase().includes(code.replace(/_/g, ' '))
            )

            if (isNoSession && !hadSession.current) {
              // No session and never had one - this is normal, not an error
              logger.debug('No active session found (expected for new visitors)')
              return false
            }
            
            // Account issues - definitive failures
            if (errorCode === 'ACCOUNT_DEACTIVATED' || errorCode === 'USER_NOT_FOUND') {
              logger.error({ errorCode }, 'Account issue detected')
              hadSession.current = false
              return false
            }
            
            // Session expired or invalid - retry if we had a session
            if (hadSession.current && i < attempts - 1) {
              logger.warn({ attempt: i + 1, errorCode, maxAttempts: attempts }, 'Session issue, retrying...')
              await sleep(RETRY_DELAY_MS * (i + 1))
              continue
            }
          }

          // Server error - retry
          if (response.status >= 500 && i < attempts - 1) {
            logger.warn({ status: response.status, attempt: i + 1 }, 'Server error during token refresh, retrying...')
            await sleep(RETRY_DELAY_MS * (i + 1))
            continue
          }

          // Only log as error if user was previously authenticated
          if (hadSession.current) {
            logger.error({ status: response.status, errorCode, attempt: i + 1 }, 'Token refresh failed for authenticated user')
          } else {
            // Debug level for unauthenticated users - not an error
            logger.debug('No valid session to refresh')
          }
          
        } catch (error) {
          if (i < attempts - 1) {
            logger.warn({ attempt: i + 1, error: error instanceof Error ? error.message : String(error) }, 'Token refresh network error, retrying...')
            await sleep(RETRY_DELAY_MS * (i + 1))
            continue
          }
          
          // Only error log if we expected to have a session
          if (hadSession.current) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Token refresh request failed')
          }
        }
      }
      
      // Handle retry logic only for users who had sessions
      if (hadSession.current) {
        retryCount.current++
        
        if (retryCount.current >= 3) {
          logger.error({ retryCount: retryCount.current }, 'Multiple consecutive refresh failures')
          hadSession.current = false
          return false
        }
        
        logger.warn({ retryCount: retryCount.current }, 'Refresh failed but keeping session temporarily')
        return true
      }
      
      return false
    })()

    try {
      return await refreshPromise.current
    } finally {
      isRefreshing.current = false
      refreshPromise.current = null
    }
  }, [])

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
          setUser(transformedUser)
          setStats(data.data.stats)
          retryCount.current = 0
          hadSession.current = true
          return true
        }
      } else if (response.status === 401) {
        // Only attempt refresh if we previously had a session
        if (hadSession.current) {
          logger.info('Session expired, attempting refresh...')
          const refreshed = await refreshTokens(true)
          
          if (refreshed) {
            const retryResponse = await fetch('/api/auth/me', {
              credentials: 'include',
              cache: 'no-store',
            })
            
            if (retryResponse.ok) {
              const data = await retryResponse.json()
              if (data.success && data.data?.user) {
                setUser(transformUserData(data.data.user))
                setStats(data.data.stats)
                return true
              }
            }
          }
          
          // Refresh failed - clear session
          logger.info('Session could not be refreshed, logging out')
          hadSession.current = false
        } else {
          // No previous session - this is normal, not an error
          logger.debug('No authenticated session (user not logged in)')
        }
        
        setUser(null)
        setStats(null)
        return false
      }
      
      return false
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch user')
      
      if (!isOnline()) {
        logger.warn('Offline - keeping current user state')
        return hadSession.current
      }
      return false
    } finally {
      setIsLoading(false)
      initialLoadComplete.current = true
    }
  }, [refreshTokens])

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

      setUser(transformUserData(data.data.user))
      lastSuccessfulRefresh.current = Date.now()
      retryCount.current = 0
      hadSession.current = true
      
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
  }, [router])

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

      setUser(transformUserData(data.data.user))
      lastSuccessfulRefresh.current = Date.now()
      retryCount.current = 0
      hadSession.current = true
      
      toast.success(data.data.message || 'Account created successfully!')
      router.push('/')
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    try {
      setIsLoading(true)
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      setUser(null)
      setStats(null)
      hadSession.current = false
      retryCount.current = 0
      
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
      setUser(null)
      setStats(null)
      hadSession.current = false
      toast.error('Logout failed')
      logger.error({ error: String(error) }, 'Logout error')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const refreshUser = useCallback(async () => {
    logger.debug('Manually refreshing user data...')
    await fetchUser()
  }, [fetchUser])

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null)
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
      
      const success = await refreshTokens(true)
      
      if (!success && retryCount.current >= 3) {
        setUser(null)
        setStats(null)
        hadSession.current = false
        toast.error('Session expired. Please log in again.')
        router.push('/login')
      }
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(refreshInterval)
  }, [user, refreshTokens, router])

  // Periodic user data refresh
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchUser(true)
    }, USER_FETCH_INTERVAL)

    return () => clearInterval(interval)
  }, [user, fetchUser])

  // Handle visibility change
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRefresh = Date.now() - lastSuccessfulRefresh.current
        
        if (timeSinceLastRefresh > 5 * 60 * 1000) {
          logger.debug('Tab visible after long absence - refreshing')
          await refreshTokens(true)
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
      await refreshTokens(true)
      await fetchUser(true)
    }

    const handleOffline = () => {
      logger.warn('Connection lost')
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
      if (e.key === 'auth_logout') {
        setUser(null)
        setStats(null)
        hadSession.current = false
        router.push('/login')
      } else if (e.key === 'auth_refresh') {
        fetchUser(true)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fetchUser, router])

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