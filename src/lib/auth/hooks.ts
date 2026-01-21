// lib/auth/hooks.ts
"use client"

import { useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

/**
 * Hook for login functionality
 */
export function useLogin() {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true)
        setError(null)
        await login(email, password)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [login]
  )

  return {
    login: handleLogin,
    isLoading,
    error,
  }
}

/**
 * Hook for signup functionality
 */
export function useSignup() {
  const { signup } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        setIsLoading(true)
        setError(null)
        await signup(email, password, name)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signup failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [signup]
  )

  return {
    signup: handleSignup,
    isLoading,
    error,
  }
}

/**
 * Hook for logout functionality
 */
export function useLogout() {
  const { logout } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true)
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [logout])

  return {
    logout: handleLogout,
    isLoading,
  }
}

/**
 * Hook to check if user has access to a chapter
 * ✅ Updated for new tier model
 */
export function useChapterAccess(chapterId: number) {
  const { user } = useAuth()

  const hasAccess = useCallback(() => {
    if (!user) return chapterId <= 81 // Free chapters only

    // Complete tier has access to everything
    if (user.tier === 'complete') return true

    // Check owned chapters
    if (user.ownedChapters.includes(chapterId)) return true

    // Otherwise only free chapters
    return chapterId <= 81
  }, [user, chapterId])

  return {
    hasAccess: hasAccess(),
    userTier: user?.tier || 'free',
    isAuthenticated: !!user,
  }
}

/**
 * Hook for password reset request
 */
export function usePasswordResetRequest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const requestReset = useCallback(async (email: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send reset email')
      }

      setSuccess(true)
      toast.success('Password reset email sent!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    requestReset,
    isLoading,
    error,
    success,
  }
}

/**
 * Hook for password reset
 */
export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetPassword = useCallback(async (token: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reset password')
      }

      setSuccess(true)
      toast.success('Password reset successfully!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    resetPassword,
    isLoading,
    error,
    success,
  }
}

/**
 * Hook for user profile update
 */
export function useUpdateProfile() {
  const { updateUser, refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = useCallback(
    async (data: { name?: string; avatarUrl?: string }) => {
      try {
        setIsLoading(true)
        setError(null)

        // Optimistic update
        updateUser(data)

        const response = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        })

        const responseData = await response.json()

        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error?.message || 'Update failed')
        }

        // Refresh to get server data
        await refreshUser()
        toast.success('Profile updated successfully!')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed'
        setError(message)
        toast.error(message)
        
        // Revert optimistic update
        await refreshUser()
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [updateUser, refreshUser]
  )

  return {
    updateProfile,
    isLoading,
    error,
  }
}

/**
 * Hook for managing sessions
 */
export function useSessions() {
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/auth/sessions', {
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSessions(data.data.sessions)
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error('Failed to revoke session')
      }

      toast.success('Session revoked')
      await fetchSessions()
    } catch (err) {
      toast.error('Failed to revoke session')
      throw err
    }
  }, [fetchSessions])

  const revokeAllSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error('Failed to revoke sessions')
      }

      toast.success('All sessions revoked')
      setSessions([])
    } catch (err) {
      toast.error('Failed to revoke sessions')
      throw err
    }
  }, [])

  return {
    sessions,
    isLoading,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
  }
}