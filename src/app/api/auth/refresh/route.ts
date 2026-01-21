// app/api/auth/refresh/route.ts
import { NextRequest } from 'next/server'
import { getSessionByRefreshToken, createSession, deleteSession } from '@/lib/auth/session'
import { generateAccessToken, verifyRefreshToken } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'
import { 
  successResponse, 
  errorResponse,
  setAuthCookies,
  handleApiError 
} from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getClientIp, getUserAgent } from '@/lib/request'

export async function POST(request: NextRequest) {
  try {
    let refreshToken = request.cookies.get('refresh_token')?.value
    
    // Fallback to body if cookie is missing
    if (!refreshToken) {
      const body = await request.json().catch(() => ({}))
      refreshToken = body.refreshToken
    }
    
    if (!refreshToken) {
      logger.warn('Refresh token missing')
      return errorResponse('Refresh token required', 401, 'NO_REFRESH_TOKEN')
    }
    
    // Verify refresh token is valid JWT with correct type
    let refreshPayload
    try {
      refreshPayload = await verifyRefreshToken(refreshToken)
      logger.info({ jti: refreshPayload.jti }, 'Refresh token verified')
    } catch (error) {
      logger.error(
        { error, refreshToken: refreshToken.slice(0, 20) + '...' },
        'Refresh token verification failed'
      )
      return errorResponse('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN')
    }
    
    // Get session from database by refresh token
    const session = await getSessionByRefreshToken(refreshToken)
    
    if (!session) {
      logger.warn({ userId: refreshPayload.sub }, 'Session not found or expired')
      return errorResponse('Session not found or expired', 401, 'SESSION_EXPIRED')
    }
    
    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, tier, is_active, name')
      .eq('id', session.user_id)
      .single()
    
    if (userError || !user) {
      logger.error({ error: userError, userId: session.user_id }, 'User not found')
      return errorResponse('User not found', 401, 'USER_NOT_FOUND')
    }
    
    if (!user.is_active) {
      logger.warn({ userId: user.id }, 'Account deactivated')
      return errorResponse('Account deactivated', 403, 'ACCOUNT_DEACTIVATED')
    }
    
    // Generate new access token
    const accessToken = await generateAccessToken({
      sub: user.id,
      email: user.email,
      tier: user.tier,
      name: user.name,
    })
    
    // Rotate refresh token for security
    const shouldRotateRefreshToken = true
    let newRefreshToken = refreshToken
    
    if (shouldRotateRefreshToken) {
      // Delete old session
      await deleteSession(session.id)
      
      // Create new session
      const newSession = await createSession({
        userId: user.id,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
      
      newRefreshToken = newSession.refreshToken
      
      logger.info({ 
        userId: user.id, 
        oldSessionId: session.id, 
        newSessionId: newSession.sessionId 
      }, 'Refresh token rotated')
    }
    
    logger.info({ userId: user.id }, 'Token refreshed successfully')
    
    const response = successResponse({
      accessToken,
      ...(shouldRotateRefreshToken && { refreshToken: newRefreshToken }),
    })
    
    // Set new HTTP-only cookies
    return setAuthCookies(response, accessToken, newRefreshToken)
    
  } catch (error) {
    logger.error({ error }, 'Refresh token error')
    return handleApiError(error)
  }
}