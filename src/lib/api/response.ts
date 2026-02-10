// lib/api/response.ts
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { ZodError, ZodIssue } from 'zod'
import { getExpirationSeconds, JWT_REFRESH_EXPIRES_IN } from '@/lib/auth/jwt'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
}

export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

export function errorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: unknown
): NextResponse<ApiResponse> {
  logger.error({ message, code, details, status }, 'API Error')
  
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
        },
    },
    { status }
  )
}

export function validationErrorResponse(error: ZodError): NextResponse<ApiResponse> {
  const details = error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }))
  
  return errorResponse(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    details
  )
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  if (error instanceof ZodError) {
    return validationErrorResponse(error)
  }
  
  if (error instanceof Error) {
    return errorResponse(error.message, 500, 'INTERNAL_ERROR')
  }
  
  return errorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR')
}

/**
 * Set HTTP-only auth cookies
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'
  const refreshMaxAge = getExpirationSeconds(JWT_REFRESH_EXPIRES_IN)
  
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })
  
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  })
  
  return response
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production'

  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  
  return response
}