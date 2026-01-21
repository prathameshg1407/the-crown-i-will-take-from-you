// app/api/auth/signup/route.ts
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()
    
    if (existingUser) {
      return errorResponse('Email already registered', 409, 'EMAIL_EXISTS')
    }
    
    // Hash password
    const passwordHash = await hashPassword(validatedData.password)
    
    // Create user
    const { data: user, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email: validatedData.email,
        password_hash: passwordHash,
        name: validatedData.name,
        // tier will default to 'free' from database
      })
      .select('id, email, name, tier, created_at') // ✅ Changed from current_tier to tier
      .single()
    
    if (createError || !user) {
      logger.error({ error: createError }, 'Failed to create user')
      return errorResponse('Failed to create account', 500, 'CREATE_USER_FAILED')
    }
    
    // Generate tokens
    const accessToken = await generateAccessToken({
      sub: user.id,
      email: user.email,
      tier: user.tier, // ✅ Changed from current_tier to tier
    })
    
    const { refreshToken } = await createSession({
      userId: user.id,
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
      },
    })
    
    logger.info({ userId: user.id, email: user.email }, 'User signed up')
    
    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier, // ✅ Changed from current_tier to tier
        },
        accessToken,
        message: 'Account created successfully.',
      },
      201
    )
    
    return setAuthCookies(response, accessToken, refreshToken)
    
  } catch (error) {
    return handleApiError(error)
  }
}