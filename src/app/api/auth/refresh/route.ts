// app/api/auth/refresh/route.ts

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getSessionByRefreshToken,
  rotateSession,
  checkRotationRecord,
} from "@/lib/auth/session";
import { verifyRefreshToken, hashToken, generateTokenPair } from "@/lib/auth/jwt";
import {
  successResponse,
  errorResponse,
  setAuthCookies,
  handleApiError,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { getClientIp, getUserAgent } from "@/lib/request";
import { getSiteId } from "@/lib/site/config";
import type { TierType } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  try {
    const siteId = await getSiteId();
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return errorResponse("Refresh token required", 401, "NO_REFRESH_TOKEN");
    }

    // Verify JWT
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return errorResponse("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const tokenHash = await hashToken(refreshToken);

    // Check if this token was recently rotated (multi-tab support)
    const rotatedSession = await checkRotationRecord(tokenHash, siteId);
    if (rotatedSession) {
      return handleRotatedSession(rotatedSession, siteId);
    }

    // Get current session
    const session = await getSessionByRefreshToken(refreshToken, siteId);

    if (!session) {
      logger.warn({ userId: payload.sub, siteId }, "Session not found");
      return errorResponse("Session expired", 401, "SESSION_EXPIRED");
    }

    // Verify user
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, tier, is_active, name")
      .eq("id", session.user_id)
      .eq("site_id", siteId)
      .single();

    if (userError || !user) {
      return errorResponse("User not found", 401, "USER_NOT_FOUND");
    }

    if (!user.is_active) {
      return errorResponse("Account deactivated", 403, "ACCOUNT_DEACTIVATED");
    }

    // Rotate session
    const clientIp = getClientIp(request);
    const userAgent = getUserAgent(request);

    const newSession = await rotateSession(
      session,
      {
        id: user.id,
        email: user.email,
        tier: user.tier as TierType,
        name: user.name,
      },
      clientIp,
      userAgent
    );

    logger.info({ userId: user.id, sessionId: newSession.sessionId }, "Token refreshed");

    const response = successResponse({
      sessionId: newSession.sessionId,
      rotated: true,
    });

    return setAuthCookies(response, newSession.accessToken, newSession.refreshToken);
  } catch (error) {
    logger.error({ error }, "Token refresh error");
    return handleApiError(error);
  }
}

async function handleRotatedSession(
  session: NonNullable<Awaited<ReturnType<typeof checkRotationRecord>>>,
  siteId: number
) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email, tier, is_active, name")
    .eq("id", session.user_id)
    .eq("site_id", siteId)
    .single();

  if (!user || !user.is_active) {
    return errorResponse("User not found", 401, "USER_NOT_FOUND");
  }

  // Generate new access token only (reuse existing refresh token)
  const tokenPair = await generateTokenPair({
    id: user.id,
    email: user.email,
    tier: user.tier,
    name: user.name,
  });

  logger.info({ sessionId: session.id }, "Reused rotated session");

  const response = successResponse({
    sessionId: session.id,
    rotated: false,
    reused: true,
  });

  return setAuthCookies(response, tokenPair.accessToken, tokenPair.refreshToken);
}