// app/api/auth/me/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getSiteId } from "@/lib/site/config";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { message: "Not authenticated", code: "NO_TOKEN" } },
        { status: 401 }
      );
    }

    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch {
      return NextResponse.json(
        { success: false, error: { message: "Token expired", code: "TOKEN_EXPIRED" } },
        { status: 401 }
      );
    }

    const siteId = await getSiteId();

    // Verify session exists in DB (for secure logout/revocation)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("user_id", payload.sub)
      .eq("access_token_jti", payload.jti)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: { message: "Session revoked or expired", code: "SESSION_REVOKED" } },
        { status: 401 }
      );
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, tier, owned_chapters, avatar_url, is_active, created_at")
      .eq("id", payload.sub)
      .eq("site_id", siteId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: { message: "Account deactivated", code: "ACCOUNT_DEACTIVATED" } },
        { status: 403 }
      );
    }

    // Fetch stats
    const stats = await getUserStats(user.id, siteId);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          owned_chapters: user.owned_chapters || [],
          avatar_url: user.avatar_url,
          created_at: user.created_at,
        },
        stats,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error in /api/auth/me");
    return NextResponse.json(
      { success: false, error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

async function getUserStats(
  userId: string,
  siteId: number
): Promise<{ activeSessions: number; chaptersCompleted: number; chaptersInProgress: number }> {
  const stats = {
    activeSessions: 0,
    chaptersCompleted: 0,
    chaptersInProgress: 0,
  };

  try {
    const [sessionsResult, progressResult] = await Promise.all([
      supabaseAdmin
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("site_id", siteId)
        .gt("expires_at", new Date().toISOString()),
      supabaseAdmin.from("reading_progress").select("is_completed").eq("user_id", userId),
    ]);

    stats.activeSessions = sessionsResult.count || 0;

    if (progressResult.data) {
      stats.chaptersCompleted = progressResult.data.filter((p) => p.is_completed).length;
      stats.chaptersInProgress = progressResult.data.filter((p) => !p.is_completed).length;
    }
  } catch {
    // Return default stats on error
  }

  return stats;
}