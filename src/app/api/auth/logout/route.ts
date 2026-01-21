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

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value
    
    if (!refreshToken) {
      return errorResponse('No active session', 401, 'NO_SESSION')
    }
    
    const session = await getSessionByRefreshToken(refreshToken)
    
    if (session) {
      await deleteSession(session.id)
      
      await supabaseAdmin.from('audit_logs').insert({
        user_id: session.user_id,
        event_type: 'logout',
        resource_type: 'session',
        resource_id: session.id,
        ip_address: getClientIp(request),
        user_agent: getUserAgent(request),
      })
      
      logger.info({ userId: session.user_id }, 'User logged out')
    }
    
    const response = successResponse({ message: 'Logged out successfully' })
    return clearAuthCookies(response)
    
  } catch (error) {
    logger.error({ error }, 'Logout error')
    const response = successResponse({ message: 'Logged out' })
    return clearAuthCookies(response)
  }
}