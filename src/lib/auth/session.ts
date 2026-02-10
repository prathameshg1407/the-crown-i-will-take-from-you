// lib/auth/session.ts
import { supabaseAdmin } from '@/lib/supabase/server'
import { generateRefreshToken, getExpirationSeconds, JWT_REFRESH_EXPIRES_IN } from './jwt'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/supabase/database.types'

// =============================================================================
// TYPES
// =============================================================================

interface CreateSessionParams {
  userId: string
  siteId: number
  userEmail: string
  userTier: string
  userName?: string | null
  ipAddress?: string
  userAgent?: string
}

interface DeviceInfo {
  raw: string
  browser?: string
  os?: string
  device?: string
}

interface SessionData {
  id: string
  user_id: string
  site_id: number
  user_email: string | null
  user_tier: string | null
  user_name: string | null
  refresh_token: string
  access_token_jti: string | null
  ip_address: string | null
  user_agent: string | null
  device_info: Json
  expires_at: string
  last_used_at: string | null
  created_at: string
}

// =============================================================================
// DEBOUNCE CACHE
// =============================================================================

const sessionUpdateTimestamps = new Map<string, number>()
const UPDATE_DEBOUNCE_MS = 60000 // 1 minute
const MAX_CACHE_ENTRIES = 1000

function cleanupDebounceCache(): void {
  if (sessionUpdateTimestamps.size > MAX_CACHE_ENTRIES) {
    const cutoff = Date.now() - UPDATE_DEBOUNCE_MS * 2
    const toDelete: string[] = []
    
    for (const [key, timestamp] of sessionUpdateTimestamps.entries()) {
      if (timestamp < cutoff) {
        toDelete.push(key)
      }
    }
    
    toDelete.forEach(key => sessionUpdateTimestamps.delete(key))
  }
}

// =============================================================================
// SESSION CREATION
// =============================================================================

export async function createSession({ 
  userId,
  siteId,
  userEmail,
  userTier,
  userName,
  ipAddress, 
  userAgent 
}: CreateSessionParams): Promise<{
  refreshToken: string
  expiresAt: Date
  sessionId: string
}> {
  try {
    const { token: refreshToken, jti } = await generateRefreshToken(userId)
    
    const expiresInSeconds = getExpirationSeconds(JWT_REFRESH_EXPIRES_IN)
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
    
    const deviceInfo = parseUserAgent(userAgent)
    
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: userId,
        site_id: siteId,
        user_email: userEmail,
        user_tier: userTier,
        user_name: userName || null,
        refresh_token: refreshToken,
        access_token_jti: jti,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        device_info: deviceInfo as Json,
        expires_at: expiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (error) {
      logger.error({ error, userId, siteId }, 'Failed to create session')
      throw new Error('Failed to create session: ' + error.message)
    }
    
    logger.info({ 
      userId, 
      siteId, 
      sessionId: data.id,
      expiresAt 
    }, 'Session created successfully')
    
    return {
      refreshToken,
      expiresAt,
      sessionId: data.id
    }
  } catch (error) {
    logger.error({ error, userId, siteId }, 'Error creating session')
    throw error
  }
}

// =============================================================================
// SESSION RETRIEVAL
// =============================================================================

export async function getSessionByRefreshToken(
  refreshToken: string,
  siteId: number,
  gracePeriodMs: number = 0
): Promise<SessionData | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .eq('site_id', siteId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        logger.debug({ siteId }, 'Session not found')
      } else {
        logger.error({ error, siteId }, 'Database error fetching session')
      }
      return null
    }
    
    if (!data) {
      return null
    }
    
    // Check expiration with grace period
    const expiresAt = new Date(data.expires_at)
    const now = new Date()
    const graceDeadline = new Date(expiresAt.getTime() + gracePeriodMs)
    
    if (now > graceDeadline) {
      logger.info({ 
        sessionId: data.id,
        siteId,
        expiresAt: expiresAt.toISOString(), 
        graceDeadline: graceDeadline.toISOString(),
        expiredBy: Math.round((now.getTime() - graceDeadline.getTime()) / 1000) + 's'
      }, 'Session expired beyond grace period')
      
      return null
    }
    
    if (now > expiresAt && gracePeriodMs > 0) {
      logger.info({ 
        sessionId: data.id,
        siteId,
        expiredAgo: Math.round((now.getTime() - expiresAt.getTime()) / 1000) + 's',
        graceRemaining: Math.round((graceDeadline.getTime() - now.getTime()) / 1000) + 's'
      }, 'Session in grace period - allowing refresh')
    }
    
    // Update last_used_at in background (debounced)
    const lastUpdate = sessionUpdateTimestamps.get(data.id)
    const shouldUpdate = !lastUpdate || (Date.now() - lastUpdate > UPDATE_DEBOUNCE_MS)
    
    if (shouldUpdate) {
      sessionUpdateTimestamps.set(data.id, Date.now())
      cleanupDebounceCache()
      
      // Fire and forget
      supabaseAdmin
        .from('sessions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {
          logger.debug({ sessionId: data.id }, 'Session last_used_at updated')
        })
        .catch((err) => {
          logger.warn({ error: err, sessionId: data.id }, 'Failed to update last_used_at')
        })
    }
    
    return data as SessionData
  } catch (error) {
    logger.error({ error, siteId }, 'Error getting session by refresh token')
    return null
  }
}

// =============================================================================
// SESSION ROTATION TRACKING
// =============================================================================

export async function storeRotationMapping(
  oldJti: string, 
  newSessionId: string, 
  siteId: number
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('session_rotations')
      .upsert({
        old_jti: oldJti,
        new_session_id: newSessionId,
        site_id: siteId,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      }, {
        onConflict: 'old_jti,site_id'
      })
    
    if (error) {
      logger.warn({ 
        error: error.message, 
        oldJti, 
        newSessionId,
        siteId 
      }, 'Failed to store rotation mapping')
      return false
    }
    
    logger.debug({ oldJti, newSessionId, siteId }, 'Rotation mapping stored')
    return true
  } catch (error) {
    logger.warn({ error }, 'Error storing rotation mapping')
    return false
  }
}

export async function checkRecentRotation(
  oldJti: string, 
  siteId: number
): Promise<SessionData | null> {
  try {
    // Check if this JTI was recently rotated
    const { data: rotation, error: rotationError } = await supabaseAdmin
      .from('session_rotations')
      .select('new_session_id')
      .eq('old_jti', oldJti)
      .eq('site_id', siteId)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (rotationError || !rotation) {
      return null
    }
    
    // Get the new session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', rotation.new_session_id)
      .eq('site_id', siteId)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (sessionError || !session) {
      logger.warn({ 
        error: sessionError, 
        newSessionId: rotation.new_session_id 
      }, 'New session not found for rotation')
      return null
    }
    
    logger.info({ 
      oldJti, 
      newSessionId: session.id,
      siteId 
    }, 'Found recent rotation - reusing')
    
    return session as SessionData
  } catch (error) {
    logger.debug({ error, oldJti }, 'Error checking recent rotation')
    return null
  }
}

export async function cleanupRotationMappings(): Promise<number> {
  try {
    const { error, count } = await supabaseAdmin
      .from('session_rotations')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (error) {
      logger.warn({ error }, 'Failed to cleanup rotation mappings')
      return 0
    }
    
    if (count && count > 0) {
      logger.debug({ count }, 'Cleaned up expired rotation mappings')
    }
    
    return count || 0
  } catch (error) {
    logger.warn({ error }, 'Error cleaning up rotation mappings')
    return 0
  }
}

// =============================================================================
// SESSION DELETION
// =============================================================================

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', sessionId)
    
    if (error) {
      logger.warn({ error, sessionId }, 'Failed to delete session')
      return false
    }
    
    // Clean up from debounce cache
    sessionUpdateTimestamps.delete(sessionId)
    
    logger.debug({ sessionId }, 'Session deleted')
    return true
  } catch (error) {
    logger.warn({ error, sessionId }, 'Error deleting session')
    return false
  }
}

export async function softDeleteSession(
  sessionId: string, 
  graceSeconds: number = 120 // 2 minutes default for multi-tab support
): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + graceSeconds * 1000).toISOString()
    
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ expires_at: expiresAt })
      .eq('id', sessionId)
    
    if (error) {
      logger.warn({ error, sessionId }, 'Failed to soft delete session')
      return false
    }
    
    logger.debug({ 
      sessionId, 
      expiresAt, 
      graceSeconds 
    }, 'Session soft deleted with grace period')
    
    return true
  } catch (error) {
    logger.warn({ error, sessionId }, 'Error soft deleting session')
    return false
  }
}

export async function deleteAllUserSessions(
  userId: string, 
  siteId: number,
  exceptSessionId?: string
): Promise<number> {
  try {
    let query = supabaseAdmin
      .from('sessions')
      .delete()
      .eq('user_id', userId)
      .eq('site_id', siteId)
    
    if (exceptSessionId) {
      query = query.neq('id', exceptSessionId)
    }
    
    const { error, count } = await query
    
    if (error) {
      logger.error({ error, userId, siteId }, 'Failed to delete user sessions')
      throw new Error('Failed to delete sessions')
    }
    
    logger.info({ 
      userId, 
      siteId, 
      exceptSessionId, 
      count 
    }, 'User sessions deleted')
    
    return count || 0
  } catch (error) {
    logger.error({ error, userId, siteId }, 'Error deleting user sessions')
    throw error
  }
}

// =============================================================================
// SESSION EXTENSION
// =============================================================================

export async function extendSession(
  sessionId: string, 
  siteId: number,
  additionalYears: number = 100
): Promise<Date | null> {
  try {
    // First verify session exists and belongs to site
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('expires_at, site_id')
      .eq('id', sessionId)
      .eq('site_id', siteId)
      .single()
    
    if (fetchError || !session) {
      logger.warn({ sessionId, siteId, error: fetchError }, 'Session not found for extension')
      return null
    }
    
    // Calculate new expiry
    const currentExpiry = new Date(session.expires_at)
    const now = new Date()
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate.getTime() + additionalYears * 365 * 24 * 60 * 60 * 1000)
    
    // Update session
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ 
        expires_at: newExpiry.toISOString(),
        last_used_at: now.toISOString()
      })
      .eq('id', sessionId)
      .eq('site_id', siteId)
    
    if (error) {
      logger.error({ error, sessionId, siteId }, 'Failed to extend session')
      return null
    }
    
    logger.info({ 
      sessionId, 
      siteId, 
      oldExpiry: currentExpiry.toISOString(),
      newExpiry: newExpiry.toISOString() 
    }, 'Session extended successfully')
    
    return newExpiry
  } catch (error) {
    logger.error({ error, sessionId, siteId }, 'Error extending session')
    return null
  }
}

// =============================================================================
// SESSION UTILITIES
// =============================================================================

export async function getUserSessionCount(userId: string, siteId: number): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('site_id', siteId)
      .gt('expires_at', new Date().toISOString())
    
    if (error) {
      logger.warn({ error, userId, siteId }, 'Failed to count user sessions')
      return 0
    }
    
    return count || 0
  } catch (error) {
    logger.error({ error, userId, siteId }, 'Error counting user sessions')
    return 0
  }
}

export async function cleanExpiredSessions(siteId?: number): Promise<number> {
  try {
    // Clean sessions expired more than 24 hours ago
    const cleanupDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    let query = supabaseAdmin
      .from('sessions')
      .delete()
      .lt('expires_at', cleanupDeadline.toISOString())
    
    if (siteId) {
      query = query.eq('site_id', siteId)
    }
    
    const { error, count } = await query
    
    if (error) {
      logger.error({ error, siteId }, 'Failed to clean expired sessions')
      throw error
    }
    
    // Also clean up rotation mappings
    const rotationCount = await cleanupRotationMappings()
    
    if ((count && count > 0) || rotationCount > 0) {
      logger.info({ 
        sessionsDeleted: count || 0, 
        rotationsDeleted: rotationCount,
        siteId 
      }, 'Expired sessions and rotations cleaned')
    }
    
    return count || 0
  } catch (error) {
    logger.error({ error, siteId }, 'Error cleaning expired sessions')
    throw error
  }
}

export async function validateSessionSite(
  sessionId: string, 
  siteId: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('site_id')
      .eq('id', sessionId)
      .single()
    
    if (error || !data) {
      return false
    }
    
    return data.site_id === siteId
  } catch {
    return false
  }
}

export async function getSessionById(
  sessionId: string,
  siteId: number
): Promise<SessionData | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('site_id', siteId)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data as SessionData
  } catch {
    return null
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function parseUserAgent(userAgent?: string): DeviceInfo | null {
  if (!userAgent) return null
  
  const info: DeviceInfo = {
    raw: userAgent.substring(0, 500), // Limit length
  }
  
  // Browser detection
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
    info.browser = 'Chrome'
  } else if (userAgent.includes('Firefox')) {
    info.browser = 'Firefox'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    info.browser = 'Safari'
  } else if (userAgent.includes('Edge')) {
    info.browser = 'Edge'
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    info.browser = 'Opera'
  }
  
  // OS detection
  if (userAgent.includes('Windows')) {
    info.os = 'Windows'
  } else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh')) {
    info.os = 'MacOS'
  } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
    info.os = 'Linux'
  } else if (userAgent.includes('Android')) {
    info.os = 'Android'
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    info.os = 'iOS'
  }
  
  // Device detection
  if (userAgent.includes('Mobile') || userAgent.includes('iPhone')) {
    info.device = 'Mobile'
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    info.device = 'Tablet'
  } else {
    info.device = 'Desktop'
  }
  
  return info
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { SessionData, CreateSessionParams }