// src/app/api/auth/signup/route.ts

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth/password'
import { generateAccessToken } from '@/lib/auth/jwt'
import { createSession } from '@/lib/auth/session'
import { signupSchema } from '@/lib/auth/validation'
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
    const validatedData = signupSchema.parse(body)
    const normalizedEmail = validatedData.email.toLowerCase().trim()
    
    // Check if user already exists ON THIS SITE
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('site_id', siteId)
      .single()
      
    if (existingUser) {
      logger.warn({ email: normalizedEmail, siteId }, 'Signup attempt - email already exists')
      return errorResponse('Email already registered', 409, 'EMAIL_EXISTS')
    }
    
    // Hash password
    const passwordHash = await hashPassword(validatedData.password)
    
    // Create user with site_id
    const { data: user, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        name: validatedData.name?.trim() || null,
        site_id: siteId,
        tier: 'free',
        owned_chapters: [],
        is_active: true,
      })
      .select('id, email, name, tier, created_at')
      .single()
    
    if (createError || !user) {
      logger.error({ error: createError, siteId }, 'Failed to create user')
      return errorResponse('Failed to create account', 500, 'CREATE_USER_FAILED')
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
    
    // Log audit event
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      event_type: 'user_signup',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: {
        email: user.email,
        has_name: !!user.name,
        site_id: siteId,
        session_id: sessionId,
      },
    })
    
    logger.info({ 
      userId: user.id, 
      email: user.email, 
      siteId,
      sessionId 
    }, 'User signed up')
    
    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        },
        accessToken,
        sessionId,
        message: 'Account created successfully.',
      },
      201
    )
    
    return setAuthCookies(response, accessToken, refreshToken)
    
  } catch (error) {
    logger.error({ error }, 'Signup error')
    return handleApiError(error)
  }
}