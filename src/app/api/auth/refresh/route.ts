// app/api/auth/refresh/route.ts
import { NextRequest } from 'next/server'
import { 
  getSessionByRefreshToken, 
  createSession, 
  softDeleteSession,
  storeRotationMapping,
  checkRecentRotation,
  getSessionById
} from '@/lib/auth/session'
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

// Soft delete grace period for multi-tab support (5 minutes)
const SOFT_DELETE_GRACE_SECONDS = 300

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
      logger.debug({ jti: refreshPayload.jti, siteId }, 'Refresh token verified')
    } catch (error) {
      logger.error(
        { error, refreshToken: refreshToken.slice(0, 20) + '...', siteId },
        'Refresh token verification failed'
      )
      return errorResponse('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN')
    }
    
    // Check if this token was recently rotated by another tab
    if (refreshPayload.jti) {
      const recentRotation = await checkRecentRotation(refreshPayload.jti, siteId)
      
      if (recentRotation) {
        logger.info({ 
          oldJti: refreshPayload.jti,
          newSessionId: recentRotation.id 
        }, 'Token already rotated by another tab - returning existing new session')
        
        // Verify user is still valid
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, email, tier, is_active, name, site_id')
          .eq('id', recentRotation.user_id)
          .eq('site_id', siteId)
          .single()
        
        if (userError || !user || !user.is_active) {
          logger.warn({ userId: recentRotation.user_id }, 'User invalid during rotation lookup')
          return errorResponse('User not found or inactive', 401, 'USER_INVALID')
        }
        
        // Generate new access token using the already-rotated session
        const accessToken = await generateAccessToken({
          sub: user.id,
          email: user.email,
          tier: user.tier,
          name: user.name ?? undefined,
        })
        
        const response = successResponse({
          accessToken,
          refreshToken: recentRotation.refresh_token,
          sessionId: recentRotation.id,
          rotationReused: true, // Indicate this was a reused rotation
        })
        
        return setAuthCookies(response, accessToken, recentRotation.refresh_token)
      }
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
    
    // Perform token rotation with multi-tab safety
    let newRefreshToken = refreshToken
    let newSessionId = session.id
    let rotated = false
    
    try {
      // Create new session first (before marking old one for deletion)
      const newSession = await createSession({
        userId: user.id,
        siteId: siteId,
        userEmail: user.email,
        userTier: user.tier,
        userName: user.name,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
      
      newRefreshToken = newSession.refreshToken
      newSessionId = newSession.sessionId
      rotated = true
      
      // Store rotation mapping for concurrent requests from other tabs
      if (session.access_token_jti) {
        await storeRotationMapping(
          session.access_token_jti, 
          newSession.sessionId, 
          siteId
        ).catch(err => {
          logger.warn({ error: err }, 'Failed to store rotation mapping')
        })
      }
      
      // Soft delete old session with grace period for multi-tab support
      await softDeleteSession(session.id, SOFT_DELETE_GRACE_SECONDS).catch(err => {
        logger.warn({ error: err, sessionId: session.id }, 'Failed to soft delete old session')
      })
      
      logger.info({ 
        userId: user.id,
        siteId,
        oldSessionId: session.id, 
        newSessionId: newSession.sessionId 
      }, 'Refresh token rotated successfully')
      
    } catch (rotationError) {
      // If rotation fails, keep using the old token but extend it
      logger.error({ error: rotationError, siteId }, 'Token rotation failed, extending existing session')
      
      await supabaseAdmin
        .from('sessions')
        .update({ 
          last_used_at: new Date().toISOString(),
          // Extend expiry by 100 years
          expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', session.id)
        .eq('site_id', siteId)
    }
    
    logger.info({ 
      userId: user.id, 
      siteId, 
      rotated,
      sessionId: newSessionId 
    }, 'Token refreshed successfully')
    
    const response = successResponse({
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: newSessionId,
      rotated,
    })
    
    // Set new HTTP-only cookies
    return setAuthCookies(response, accessToken, newRefreshToken)
    
  } catch (error) {
    logger.error({ error }, 'Refresh token error')
    return handleApiError(error)
  }
}