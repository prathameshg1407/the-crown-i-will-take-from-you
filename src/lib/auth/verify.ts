// lib/auth/verify.ts
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'

export interface AuthResult {
  authenticated: boolean
  userId?: string
  email?: string
  error?: string
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    // Check for userId or email in headers (fallback authentication)
    const headerUserId = request.headers.get('x-user-id')
    const headerEmail = request.headers.get('x-user-email')

    // Check for userId or email in query params (alternative fallback)
    const urlUserId = request.nextUrl.searchParams.get('userId')
    const urlEmail = request.nextUrl.searchParams.get('email')

    // If userId or email is provided via headers or query params, grant access
    if (headerUserId || headerEmail || urlUserId || urlEmail) {
      return {
        authenticated: true,
        userId: headerUserId || urlUserId || undefined,
        email: headerEmail || urlEmail || undefined,
      }
    }

    // If no token and no alternative auth method, deny access
    if (!accessToken) {
      return {
        authenticated: false,
        error: 'No access token found',
      }
    }

    // Verify token if present
    const payload = await verifyAccessToken(accessToken)

    if (!payload || !payload.sub) {
      return {
        authenticated: false,
        error: 'Invalid token payload',
      }
    }

    return {
      authenticated: true,
      userId: payload.sub,
      email: payload.email,
    }
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    }
  }
}