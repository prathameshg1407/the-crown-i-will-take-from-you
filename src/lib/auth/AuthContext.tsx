// lib/auth/AuthContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
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

// ✅ Enhanced transformation with logging
function transformUserData(apiUser: any): User {
  console.log('🔄 Transforming API User:', {
    raw: apiUser,
    owned_chapters: apiUser.owned_chapters,
    owned_chapters_type: typeof apiUser.owned_chapters,
    is_array: Array.isArray(apiUser.owned_chapters)
  })
  
  // ✅ Handle both camelCase and snake_case
  const ownedChapters = apiUser.ownedChapters || apiUser.owned_chapters || []
  
  const transformed: User = {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    tier: apiUser.tier,
    ownedChapters: Array.isArray(ownedChapters) ? ownedChapters : [],
    avatarUrl: apiUser.avatar_url || apiUser.avatarUrl,
    createdAt: apiUser.created_at || apiUser.createdAt,
  }
  
  console.log('✅ Transformed User:', {
    email: transformed.email,
    tier: transformed.tier,
    ownedChaptersCount: transformed.ownedChapters.length,
    ownedChapters: transformed.ownedChapters.slice(0, 10)
  })
  
  return transformed
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  const fetchUser = useCallback(async () => {
    try {
      console.log('📡 Fetching user data from /api/auth/me...')
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store', // ✅ Prevent caching
      })

      console.log('📥 Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        
        console.log('📦 Full API Response:', data)
        
        if (data.success && data.data?.user) {
          console.log('👤 User data from API:', data.data.user)
          
          const transformedUser = transformUserData(data.data.user)
          setUser(transformedUser)
          setStats(data.data.stats)
          
          console.log('✅ User state updated:', transformedUser)
        } else {
          console.log('❌ No user data in response')
          setUser(null)
          setStats(null)
        }
      } else {
        console.log('❌ Response not OK:', response.status)
        setUser(null)
        setStats(null)
      }
    } catch (error) {
      console.error('❌ Failed to fetch user:', error)
      setUser(null)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
      toast.success('Logged out successfully')
      router.push('/')
      
    } catch (error) {
      toast.error('Logout failed')
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const refreshUser = useCallback(async () => {
    console.log('🔄 Manually refreshing user data...')
    await fetchUser()
  }, [fetchUser])

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null)
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Auto-refresh user every 5 minutes
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchUser()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [user, fetchUser])

  // Token refresh logic
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        
        if (!response.ok) {
          let data: any = null
          try {
            data = await response.json()
          } catch {
            data = null
          }

          logger.error({ error: data?.error, status: response.status }, 'Token refresh failed')
          
          if (response.status === 401) {
            setUser(null)
            setStats(null)
            toast.error('Session expired. Please log in again.')
            router.push('/login')
          }
        } else {
          logger.info('Token refreshed successfully')
        }
      } catch (error) {
        logger.error({ error }, 'Token refresh request failed')
      }
    }, 14 * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [user, router])

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