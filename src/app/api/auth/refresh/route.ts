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
import { getSiteId } from '@/lib/site/config'

// Grace period for expired sessions (5 minutes)
const SESSION_GRACE_PERIOD_MS = 5 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    // Get site ID first
    const siteId = await getSiteId()
    
    let refreshToken = request.cookies.get('refresh_token')?.value
    
    // Fallback to body if cookie is missing
    if (!refreshToken) {
      const body = await request.json().catch(() => ({}))
      refreshToken = body.refreshToken
    }
    
    if (!refreshToken) {
      logger.warn({ siteId }, 'Refresh token missing')
      return errorResponse('Refresh token required', 401, 'NO_REFRESH_TOKEN')
    }
    
    // Verify refresh token is valid JWT with correct type
    let refreshPayload
    try {
      refreshPayload = await verifyRefreshToken(refreshToken)
      logger.info({ jti: refreshPayload.jti, siteId }, 'Refresh token verified')
    } catch (error) {
      logger.error(
        { error, refreshToken: refreshToken.slice(0, 20) + '...', siteId },
        'Refresh token verification failed'
      )
      return errorResponse('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN')
    }
    
    // Get session from database with site isolation and grace period
    const session = await getSessionByRefreshToken(
      refreshToken, 
      siteId,
      SESSION_GRACE_PERIOD_MS
    )
    
    if (!session) {
      logger.warn({ 
        userId: refreshPayload.sub, 
        siteId,
        jti: refreshPayload.jti 
      }, 'Session not found or expired beyond grace period')
      return errorResponse('Session not found or expired', 401, 'SESSION_EXPIRED')
    }
    
    // Verify session belongs to the correct site
    if (session.site_id !== siteId) {
      logger.error({ 
        userId: refreshPayload.sub, 
        sessionSiteId: session.site_id,
        requestSiteId: siteId 
      }, 'Session site mismatch')
      return errorResponse('Invalid session', 401, 'SESSION_INVALID')
    }
    
    // Get user data with site verification
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, tier, is_active, name, site_id')
      .eq('id', session.user_id)
      .eq('site_id', siteId)
      .single()
    
    if (userError || !user) {
      logger.error({ 
        error: userError, 
        userId: session.user_id,
        sessionSiteId: session.site_id,
        requestSiteId: siteId 
      }, 'User not found for this site')
      return errorResponse('User not found', 401, 'USER_NOT_FOUND')
    }
    
    if (!user.is_active) {
      logger.warn({ userId: user.id, siteId }, 'Account deactivated')
      return errorResponse('Account deactivated', 403, 'ACCOUNT_DEACTIVATED')
    }
    
    // Generate new access token
    const accessToken = await generateAccessToken({
      sub: user.id,
      email: user.email,
      tier: user.tier,
      name: user.name ?? undefined,
    })
    
    // Safer refresh token rotation with atomic operation
    let newRefreshToken = refreshToken
    let newSessionId = session.id
    
    try {
      // Create new session first (before deleting old one)
      const newSession = await createSession({
        userId: user.id,
        siteId: siteId,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
      
      newRefreshToken = newSession.refreshToken
      newSessionId = newSession.sessionId
      
      // Only delete old session after new one is created successfully
      await deleteSession(session.id).catch(err => {
        // Log but don't fail if old session deletion fails
        logger.warn({ error: err, sessionId: session.id }, 'Failed to delete old session')
      })
      
      logger.info({ 
        userId: user.id,
        siteId,
        oldSessionId: session.id, 
        newSessionId: newSession.sessionId 
      }, 'Refresh token rotated')
      
    } catch (rotationError) {
      // If rotation fails, keep using the old token
      logger.error({ error: rotationError, siteId }, 'Token rotation failed, using existing token')
      
      // Extend the existing session instead
      await supabaseAdmin
        .from('sessions')
        .update({ 
          last_used_at: new Date().toISOString(),
          // Extend expiry by 7 days
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', session.id)
        .eq('site_id', siteId)  // Extra safety
    }
    
    logger.info({ userId: user.id, siteId }, 'Token refreshed successfully')
    
    const response = successResponse({
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: newSessionId,
    })
    
    // Set new HTTP-only cookies
    return setAuthCookies(response, accessToken, newRefreshToken)
    
  } catch (error) {
    logger.error({ error }, 'Refresh token error')
    return handleApiError(error)
  }
}