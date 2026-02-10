// app/api/auth/refresh/route.ts
import { NextRequest } from 'next/server'
import { 
  getSessionByRefreshToken, 
  createSession, 
  softDeleteSession,
  storeRotationMapping,
  checkRecentRotation,
  extendSession
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

// Configuration
const SESSION_GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes grace period
const SOFT_DELETE_GRACE_SECONDS = 120 // 2 minutes for multi-tab support
const MAX_RETRIES = 2

export async function POST(request: NextRequest) {
  let refreshToken: string | undefined
  let siteId: number
  
  try {
    // Get site ID first
    siteId = await getSiteId()
    
    // Get refresh token from cookie or body
    refreshToken = request.cookies.get('refresh_token')?.value
    
    if (!refreshToken) {
      try {
        const body = await request.json()
        refreshToken = body.refreshToken
      } catch {
        // Ignore JSON parse errors
      }
    }
    
    if (!refreshToken) {
      logger.warn({ siteId }, 'Refresh token missing from request')
      return errorResponse('Refresh token required', 401, 'NO_REFRESH_TOKEN')
    }
    
    // Verify refresh token JWT
    let refreshPayload
    try {
      refreshPayload = await verifyRefreshToken(refreshToken)
      logger.debug({ 
        jti: refreshPayload.jti, 
        userId: refreshPayload.sub,
        siteId 
      }, 'Refresh token JWT verified')
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        siteId 
      }, 'Refresh token verification failed')
      return errorResponse('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN')
    }
    
    // Check if this token was recently rotated (multi-tab support)
    if (refreshPayload.jti) {
      const recentRotation = await checkRecentRotation(refreshPayload.jti, siteId)
      
      if (recentRotation) {
        logger.info({ 
          oldJti: refreshPayload.jti,
          newSessionId: recentRotation.id,
          userId: recentRotation.user_id
        }, 'Token already rotated by another tab - reusing')
        
        // Verify user is still valid
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, email, tier, is_active, name, site_id')
          .eq('id', recentRotation.user_id)
          .eq('site_id', siteId)
          .single()
        
        if (userError || !user) {
          logger.error({ 
            error: userError,
            userId: recentRotation.user_id,
            siteId 
          }, 'User not found during rotation reuse')
          return errorResponse('User not found', 401, 'USER_NOT_FOUND')
        }
        
        if (!user.is_active) {
          logger.warn({ userId: user.id }, 'Inactive user tried to refresh token')
          return errorResponse('Account deactivated', 403, 'ACCOUNT_DEACTIVATED')
        }
        
        // Generate new access token
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
          rotationReused: true,
        })
        
        return setAuthCookies(response, accessToken, recentRotation.refresh_token)
      }
    }
    
    // Get session from database
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
      }, 'Session not found or expired')
      return errorResponse('Session expired', 401, 'SESSION_EXPIRED')
    }
    
    // Verify session belongs to correct site (defensive check)
    if (session.site_id !== siteId) {
      logger.error({
        sessionSiteId: session.site_id,
        requestSiteId: siteId,
        userId: session.user_id
      }, 'Session site mismatch')
      return errorResponse('Invalid session', 401, 'SESSION_INVALID')
    }

    // Get user data
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
        siteId
      }, 'User not found for session')
      return errorResponse('User not found', 401, 'USER_NOT_FOUND')
    }

    if (!user.is_active) {
      logger.warn({ userId: user.id, siteId }, 'Inactive user tried to refresh token')
      return errorResponse('Account deactivated', 403, 'ACCOUNT_DEACTIVATED')
    }
    
    // Generate new access token
    const accessToken = await generateAccessToken({
      sub: user.id,
      email: user.email,
      tier: user.tier,
      name: user.name ?? undefined,
    })
    
    // Token rotation with fallback
    let newRefreshToken = refreshToken
    let newSessionId = session.id
    let rotated = false
    
    try {
      // Create new session
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
      
      // Store rotation mapping for concurrent requests
      if (refreshPayload.jti) {
        await storeRotationMapping(
          refreshPayload.jti,
          newSessionId,
          siteId
        ).catch(err => {
          logger.warn({ 
            error: err instanceof Error ? err.message : 'Unknown error',
            oldJti: refreshPayload.jti,
            newSessionId 
          }, 'Failed to store rotation mapping - continuing')
        })
      }
      
      // Also store mapping for the session's JTI if it exists
      if (session.access_token_jti) {
        await storeRotationMapping(
          session.access_token_jti,
          newSessionId,
          siteId
        ).catch(err => {
          logger.warn({ error: err }, 'Failed to store session JTI rotation mapping')
        })
      }
      
      // Soft delete old session (with grace period for multi-tab)
      await softDeleteSession(session.id, SOFT_DELETE_GRACE_SECONDS).catch(err => {
        logger.warn({ 
          error: err instanceof Error ? err.message : 'Unknown error',
          sessionId: session.id 
        }, 'Failed to soft delete old session - continuing')
      })
      
      logger.info({ 
        userId: user.id,
        siteId,
        oldSessionId: session.id, 
        newSessionId,
        rotated: true
      }, 'Token rotation successful')
      
    } catch (rotationError) {
      // Rotation failed - extend existing session as fallback
      logger.error({ 
        error: rotationError instanceof Error ? rotationError.message : 'Unknown error',
        userId: user.id,
        sessionId: session.id
      }, 'Token rotation failed - attempting to extend existing session')
      
      try {
        const newExpiry = await extendSession(session.id, siteId, 100)
        
        if (newExpiry) {
          logger.info({ 
            sessionId: session.id, 
            newExpiry: newExpiry.toISOString(),
            userId: user.id
          }, 'Extended existing session instead of rotating')
        } else {
          // Direct update as last resort
          await supabaseAdmin
            .from('sessions')
            .update({ 
              last_used_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', session.id)
            .eq('site_id', siteId)
          
          logger.info({ 
            sessionId: session.id,
            userId: user.id
          }, 'Updated session expiry directly')
        }
      } catch (extendError) {
        logger.error({ 
          error: extendError instanceof Error ? extendError.message : 'Unknown error',
          sessionId: session.id
        }, 'Failed to extend session - continuing with existing token')
      }
    }
    
    logger.info({ 
      userId: user.id, 
      siteId, 
      rotated,
      sessionId: newSessionId 
    }, 'Token refresh completed')
    
    const response = successResponse({
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: newSessionId,
      rotated,
    })
    
    // Set HTTP-only cookies
    return setAuthCookies(response, accessToken, newRefreshToken)
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : 'Unknown error',
      siteId: siteId!,
      hasRefreshToken: !!refreshToken
    }, 'Unexpected error in token refresh')
    
    return handleApiError(error)
  }
}