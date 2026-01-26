// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface ReadingProgressRecord {
  is_completed: boolean
}

export async function GET(_request: NextRequest) {
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
      logger.debug('Access token verification failed - client should refresh')
      return NextResponse.json(
        { success: false, error: { message: 'Token expired', code: 'TOKEN_EXPIRED' } },
        { status: 401 }
      )
    }

    const userId = payload.sub

    // Fetch user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      logger.error({ 
        error: userError, 
        userId,
        message: userError.message,
      }, 'Database error fetching user')
      
      return NextResponse.json(
        { success: false, error: { message: 'Database error', code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    if (!user) {
      logger.error({ userId }, 'User not found in database')
      return NextResponse.json(
        { success: false, error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
        { status: 404 }
      )
    }

    logger.debug({ 
      userId, 
      email: user.email,
      tier: user.tier,
      owned_chapters_count: user.owned_chapters?.length || 0,
    }, 'User data retrieved')

    // Fetch user stats (non-blocking errors)
    let stats = {
      activeSessions: 0,
      chaptersCompleted: 0,
      chaptersInProgress: 0,
    }

    try {
      const { data: sessions } = await supabaseAdmin
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())

      const { data: progress } = await supabaseAdmin
        .from('reading_progress')
        .select('is_completed')
        .eq('user_id', userId)

      const progressRecords = (progress || []) as ReadingProgressRecord[]

      stats = {
        activeSessions: sessions?.length || 0,
        chaptersCompleted: progressRecords.filter((p) => p.is_completed).length,
        chaptersInProgress: progressRecords.filter((p) => !p.is_completed).length,
      }
    } catch (statsError) {
      logger.warn({ error: statsError }, 'Failed to fetch user stats - continuing with defaults')
    }

    // Update last login in background (fire and forget with proper async handling)
    void (async () => {
      try {
        await supabaseAdmin
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId)
      } catch (err) {
        logger.warn({ error: err }, 'Failed to update last login')
      }
    })()

    // Ensure owned_chapters is properly formatted
    const ownedChapters = Array.isArray(user.owned_chapters) ? user.owned_chapters : []

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          owned_chapters: ownedChapters,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
        },
        stats,
      },
    })
    
  } catch (error) {
    const err = error as Error
    logger.error({ 
      error: {
        message: err.message,
        stack: err.stack,
      }
    }, 'Unexpected error in /api/auth/me')
    
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}