// lib/auth/guards.ts
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface AuthGuardOptions {
  requireAuth?: boolean
  requiredTier?: 'free' | 'complete'  // ✅ Updated to new tier model
  redirectTo?: string
  onUnauthorized?: () => void
}

/**
 * Hook to guard routes with authentication requirements
 */
export function useAuthGuard(options: AuthGuardOptions = {}) {
  const {
    requireAuth = false,
    requiredTier,
    redirectTo = '/login',
    onUnauthorized,
  } = options

  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Check authentication
    if (requireAuth && !isAuthenticated) {
      if (onUnauthorized) {
        onUnauthorized()
      } else {
        toast.error('Please login to continue')
        const currentPath = window.location.pathname
        router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
      }
      return
    }

    // Check tier requirement - simplified for new model
    if (requiredTier && user) {
      // If complete tier is required but user doesn't have it
      if (requiredTier === 'complete' && user.tier !== 'complete') {
        toast.error('Upgrade to Complete Pack to access this content')
        router.push('/pricing')
        return
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requireAuth,
    requiredTier,
    redirectTo,
    router,
    onUnauthorized,
  ])

  const isAuthorized = 
    !isLoading && 
    (!requireAuth || isAuthenticated) &&
    (!requiredTier || (requiredTier === 'free' || user?.tier === 'complete'))

  return {
    isLoading,
    isAuthenticated,
    user,
    isAuthorized,
  }
}