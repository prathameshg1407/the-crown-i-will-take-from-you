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

export async function verifyAuth(_request: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return {
        authenticated: false,
        error: 'No access token found',
      }
    }

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