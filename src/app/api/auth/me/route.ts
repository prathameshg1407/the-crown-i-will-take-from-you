// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authenticated', code: 'NO_TOKEN' } },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch (error) {
      logger.error({ error }, 'Token verification failed')
      return NextResponse.json(
        { success: false, error: { message: 'Invalid token', code: 'INVALID_TOKEN' } },
        { status: 401 }
      )
    }

    const userId = payload.sub

    // Fetch user from database (using service role bypasses RLS)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*') // ✅ Select all columns to ensure owned_chapters is included
      .eq('id', userId)
      .single()

    if (userError) {
      logger.error({ 
        error: userError, 
        userId,
        message: userError.message,
        details: userError.details,
        hint: userError.hint 
      }, 'Database error fetching user')
      return NextResponse.json(
        { success: false, error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (!user) {
      logger.error({ userId }, 'User not found in database')
      return NextResponse.json(
        { success: false, error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
        { status: 404 }
      )
    }

    // ✅ Log raw database response
    logger.info({ 
      userId, 
      email: user.email,
      tier: user.tier,
      owned_chapters_raw: user.owned_chapters,
      owned_chapters_type: typeof user.owned_chapters,
      owned_chapters_length: user.owned_chapters?.length,
      is_array: Array.isArray(user.owned_chapters),
      full_user_keys: Object.keys(user)
    }, '📦 Raw user data from database')

    // Fetch user stats
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())

    const { data: progress } = await supabaseAdmin
      .from('reading_progress')
      .select('is_completed')
      .eq('user_id', userId)

    const stats = {
      activeSessions: sessions?.length || 0,
      chaptersCompleted: progress?.filter(p => p.is_completed).length || 0,
      chaptersInProgress: progress?.filter(p => !p.is_completed).length || 0,
    }

    // Update last login (don't await to avoid blocking)
   ;(async () => {
  const { error: lastLoginError } = await supabaseAdmin
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId)

  if (lastLoginError) {
    logger.error(
      { error: lastLoginError, userId },
      'Failed to update last login'
    )
  }
})()

    // ✅ Ensure owned_chapters is properly formatted
    const ownedChapters = Array.isArray(user.owned_chapters) ? user.owned_chapters : []

    const responsePayload = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          owned_chapters: ownedChapters, // ✅ Keep snake_case for API consistency
          avatar_url: user.avatar_url,
          created_at: user.created_at,
        },
        stats,
      },
    }

    // ✅ Log what we're sending
    logger.info({
      userId,
      owned_chapters_sent: ownedChapters,
      owned_chapters_count: ownedChapters.length
    }, '📤 Sending user data to client')

    return NextResponse.json(responsePayload)
    
  } catch (error: any) {
    logger.error({ 
      error: {
        message: error.message,
        stack: error.stack,
        ...error
      }
    }, 'Failed to fetch user - unhandled error')
    
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}