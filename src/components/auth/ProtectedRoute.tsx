// components/auth/ProtectedRoute.tsx
"use client"

import { useAuth } from '@/lib/auth/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredTier?: 'free' | 'complete'  // ✅ Updated to new tiers
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  requiredTier,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    // Not authenticated
    if (!isAuthenticated) {
      const currentPath = window.location.pathname
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
      return
    }

    // Tier requirement - simplified for new model
    if (requiredTier && user) {
      // If complete tier is required but user doesn't have it
      if (requiredTier === 'complete' && user.tier !== 'complete') {
        router.push('/pricing')
        return
      }
    }
  }, [isLoading, isAuthenticated, user, requiredTier, router, redirectTo])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#9f1239] animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 font-body">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated or requirements not met
  if (!isAuthenticated || (requiredTier === 'complete' && user?.tier !== 'complete')) {
    return null
  }

  return <>{children}</>
}