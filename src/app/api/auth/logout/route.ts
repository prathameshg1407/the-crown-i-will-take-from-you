// app/api/auth/logout/route.ts

import { NextRequest } from 'next/server'
import { deleteSession, getSessionByRefreshToken } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { 
  successResponse, 
  errorResponse,
  clearAuthCookies 
} from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getClientIp, getUserAgent } from '@/lib/request'
import { getSiteId } from '@/lib/site/config'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value
    
    // Get site ID
    const siteId = await getSiteId()
    
    if (!refreshToken) {
      logger.debug({ siteId }, 'Logout attempt - no refresh token')
      // Still clear cookies even if no token
      const response = successResponse({ message: 'Logged out successfully' })
      return clearAuthCookies(response)
    }
    
    // Find session with site isolation
    const session = await getSessionByRefreshToken(refreshToken, siteId)
    
    if (session) {
      // Delete the session
      await deleteSession(session.id)
      
      // Log audit event
      await supabaseAdmin.from('audit_logs').insert({
        user_id: session.user_id,
        event_type: 'logout',
        resource_type: 'session',
        resource_id: session.id,
        ip_address: getClientIp(request),
        user_agent: getUserAgent(request),
        metadata: {
          site_id: siteId,
        },
      })
      
      logger.info({ 
        userId: session.user_id, 
        sessionId: session.id,
        siteId 
      }, 'User logged out')
    } else {
      logger.debug({ siteId }, 'Logout - session not found (may already be expired)')
    }
    
    const response = successResponse({ message: 'Logged out successfully' })
    return clearAuthCookies(response)
    
  } catch (error) {
    logger.error({ error }, 'Logout error')
    // Even on error, clear the cookies
    const response = successResponse({ message: 'Logged out' })
    return clearAuthCookies(response)
  }
}