// lib/auth/session.ts
import { supabaseAdmin } from '@/lib/supabase/server'
import { generateRefreshToken, getExpirationSeconds, JWT_REFRESH_EXPIRES_IN } from './jwt'
import { logger } from '@/lib/logger'

interface CreateSessionParams {
  userId: string
  ipAddress?: string
  userAgent?: string
}

export async function createSession({ 
  userId, 
  ipAddress, 
  userAgent 
}: CreateSessionParams) {
  try {
    const { token: refreshToken, jti } = await generateRefreshToken(userId)
    
    const expiresInSeconds = getExpirationSeconds(JWT_REFRESH_EXPIRES_IN)
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    
    const deviceInfo = parseUserAgent(userAgent)
    
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: userId,
        refresh_token: refreshToken,
        access_token_jti: jti,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_info: deviceInfo,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()
    
    if (error) {
      logger.error({ error }, 'Failed to create session')
      throw new Error('Failed to create session')
    }
    
    logger.info({ userId, sessionId: data.id }, 'Session created')
    
    return {
      refreshToken,
      expiresAt,
      sessionId: data.id
    }
  } catch (error) {
    logger.error({ error, userId }, 'Error creating session')
    throw error
  }
}

// ✅ Updated to support grace period
export async function getSessionByRefreshToken(
  refreshToken: string, 
  gracePeriodMs: number = 0
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .single()
    
    if (error || !data) {
      return null
    }
    
    const expiresAt = new Date(data.expires_at)
    const now = new Date()
    const graceDeadline = new Date(expiresAt.getTime() + gracePeriodMs)
    
    // ✅ Check if expired beyond grace period
    if (now > graceDeadline) {
      logger.warn({ 
        sessionId: data.id, 
        expiresAt, 
        graceDeadline,
        now 
      }, 'Session expired beyond grace period')
      await deleteSession(data.id)
      return null
    }
    
    // ✅ Log if within grace period
    if (now > expiresAt) {
      logger.info({ 
        sessionId: data.id,
        expiredAgo: now.getTime() - expiresAt.getTime()
      }, 'Session in grace period - allowing refresh')
    }
    
    // Update last used timestamp
    await supabaseAdmin
      .from('sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
    
    return data
  } catch (error) {
    logger.error({ error }, 'Error getting session')
    return null
  }
}

export async function deleteSession(sessionId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', sessionId)
    
    if (error) {
      logger.error({ error, sessionId }, 'Failed to delete session')
      throw new Error('Failed to delete session')
    }
    
    logger.info({ sessionId }, 'Session deleted')
  } catch (error) {
    logger.error({ error, sessionId }, 'Error deleting session')
    throw error
  }
}

export async function deleteAllUserSessions(userId: string, exceptSessionId?: string) {
  try {
    let query = supabaseAdmin
      .from('sessions')
      .delete()
      .eq('user_id', userId)
    
    // ✅ Option to keep current session
    if (exceptSessionId) {
      query = query.neq('id', exceptSessionId)
    }
    
    const { error } = await query
    
    if (error) {
      logger.error({ error, userId }, 'Failed to delete user sessions')
      throw new Error('Failed to delete sessions')
    }
    
    logger.info({ userId, exceptSessionId }, 'User sessions deleted')
  } catch (error) {
    logger.error({ error, userId }, 'Error deleting user sessions')
    throw error
  }
}

// ✅ Extend session expiry
export async function extendSession(sessionId: string, additionalDays: number = 7) {
  try {
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('expires_at')
      .eq('id', sessionId)
      .single()
    
    if (fetchError || !session) {
      return null
    }
    
    const currentExpiry = new Date(session.expires_at)
    const now = new Date()
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000)
    
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ 
        expires_at: newExpiry.toISOString(),
        last_used_at: now.toISOString()
      })
      .eq('id', sessionId)
    
    if (error) {
      logger.error({ error, sessionId }, 'Failed to extend session')
      return null
    }
    
    logger.info({ sessionId, newExpiry }, 'Session extended')
    return newExpiry
  } catch (error) {
    logger.error({ error, sessionId }, 'Error extending session')
    return null
  }
}

export async function cleanExpiredSessions() {
  try {
    // ✅ Clean sessions that are expired beyond a 1-hour grace period
    const gracePeriodDeadline = new Date(Date.now() - 60 * 60 * 1000)
    
    const { error, count } = await supabaseAdmin
      .from('sessions')
      .delete()
      .lt('expires_at', gracePeriodDeadline.toISOString())
    
    if (error) {
      logger.error({ error }, 'Failed to clean expired sessions')
      throw error
    }
    
    logger.info({ count }, 'Expired sessions cleaned')
    return count || 0
  } catch (error) {
    logger.error({ error }, 'Error cleaning expired sessions')
    throw error
  }
}

function parseUserAgent(userAgent?: string): Record<string, any> | null {
  if (!userAgent) return null
  
  const info: Record<string, any> = {
    raw: userAgent,
  }
  
  if (userAgent.includes('Chrome')) info.browser = 'Chrome'
  else if (userAgent.includes('Firefox')) info.browser = 'Firefox'
  else if (userAgent.includes('Safari')) info.browser = 'Safari'
  else if (userAgent.includes('Edge')) info.browser = 'Edge'
  
  if (userAgent.includes('Windows')) info.os = 'Windows'
  else if (userAgent.includes('Mac')) info.os = 'MacOS'
  else if (userAgent.includes('Linux')) info.os = 'Linux'
  else if (userAgent.includes('Android')) info.os = 'Android'
  else if (userAgent.includes('iOS')) info.os = 'iOS'
  
  if (userAgent.includes('Mobile')) info.device = 'Mobile'
  else if (userAgent.includes('Tablet')) info.device = 'Tablet'
  else info.device = 'Desktop'
  
  return info
}