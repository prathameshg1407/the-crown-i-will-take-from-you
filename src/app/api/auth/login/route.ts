// src/app/api/auth/login/route.ts

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/auth/password'
import { generateAccessToken } from '@/lib/auth/jwt'
import { createSession } from '@/lib/auth/session'
import { loginSchema } from '@/lib/auth/validation'
import { 
  successResponse, 
  errorResponse, 
  handleApiError,
  setAuthCookies 
} from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getClientIp, getUserAgent } from '@/lib/request'
import { getSiteId } from '@/lib/site/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)
    
    // Get current site ID
    const siteId = await getSiteId()
    
    // Validate input
    const validatedData = loginSchema.parse(body)
    
    // Get user by email AND site_id
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, name, tier, is_active')
      .eq('email', validatedData.email)
      .eq('site_id', siteId)
      .single()
    
    if (fetchError || !user) {
      logger.warn({ 
        email: validatedData.email, 
        siteId,
        error: fetchError?.message 
      }, 'Login attempt - user not found')
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }
    
    // Check if account is active
    if (!user.is_active) {
      logger.warn({ userId: user.id, siteId }, 'Login attempt - account deactivated')
      return errorResponse('Account has been deactivated', 403, 'ACCOUNT_DEACTIVATED')
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(
      validatedData.password,
      user.password_hash
    )
    
    if (!isPasswordValid) {
      // Log failed login attempt
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'login_failed',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { 
          reason: 'invalid_password',
          site_id: siteId,
        },
      })
      
      logger.warn({ userId: user.id, siteId }, 'Login attempt - invalid password')
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }
    
    // Generate access token
    const accessToken = await generateAccessToken({
      sub: user.id,
      email: user.email,
      tier: user.tier,
      name: user.name ?? undefined,
    })
    
    // Create session with ALL required parameters
    const { refreshToken, sessionId } = await createSession({
      userId: user.id,
      siteId: siteId,
      userEmail: user.email,      // ADDED
      userTier: user.tier,        // ADDED
      userName: user.name,        // ADDED
      ipAddress: clientIp,
      userAgent: userAgent,
    })
    
    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)
      .eq('site_id', siteId)
    
    // Log successful login
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'login_success',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: {
        site_id: siteId,
        session_id: sessionId,
      },
    })
    
    logger.info({ 
      userId: user.id, 
      email: user.email, 
      siteId,
      sessionId 
    }, 'User logged in')
    
    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
      accessToken,
      sessionId,
    })
    
    return setAuthCookies(response, accessToken, refreshToken)
    
  } catch (error) {
    logger.error({ error }, 'Login error')
    return handleApiError(error)
  }
}