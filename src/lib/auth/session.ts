// lib/auth/session.ts

import { supabaseAdmin } from "@/lib/supabase/server";
import { generateTokenPair, hashToken } from "./jwt";
import { AUTH_CONFIG } from "./config";
import { logger } from "@/lib/logger";
import type { TierType, Json } from "@/lib/supabase/database.types";

// =============================================================================
// TYPES
// =============================================================================

export interface DeviceInfo {
  raw: string;
  browser?: string;
  os?: string;
  device?: string;
}

export interface CreateSessionParams {
  userId: string;
  siteId: number;
  userEmail: string;
  userTier: TierType;
  userName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SessionResult {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionData {
  id: string;
  user_id: string;
  site_id: number;
  user_email: string | null;
  user_tier: TierType | null;
  user_name: string | null;
  refresh_token_hash: string;
  access_token_jti: string | null;
  token_family: string;
  token_version: number;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Json | null;
  expires_at: string;
  last_used_at: string;
  created_at: string;
}

// =============================================================================
// SESSION CREATION
// =============================================================================

export async function createSession(params: CreateSessionParams): Promise<SessionResult> {
  const { userId, siteId, userEmail, userTier, userName, ipAddress, userAgent } = params;

  const tokenPair = await generateTokenPair({
    id: userId,
    email: userEmail,
    tier: userTier,
    name: userName,
  });

  const deviceInfo = parseUserAgent(userAgent ?? undefined);

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({
      user_id: userId,
      site_id: siteId,
      user_email: userEmail,
      user_tier: userTier,
      user_name: userName ?? null,
      refresh_token_hash: tokenPair.refreshTokenHash,
      access_token_jti: tokenPair.accessTokenJti,
      token_family: tokenPair.tokenFamily,
      token_version: tokenPair.tokenVersion,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      device_info: deviceInfo as Json | null,
      expires_at: tokenPair.expiresAt.toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.error({ error, userId, siteId }, "Failed to create session");
    throw new Error("Failed to create session");
  }

  logger.info({ userId, siteId, sessionId: data.id }, "Session created");

  return {
    sessionId: data.id,
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    expiresAt: tokenPair.expiresAt,
  };
}

// =============================================================================
// SESSION RETRIEVAL
// =============================================================================

export async function getSessionByRefreshToken(
  refreshToken: string,
  siteId: number
): Promise<SessionData | null> {
  const tokenHash = await hashToken(refreshToken);

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("refresh_token_hash", tokenHash)
    .eq("site_id", siteId)
    .single();

  if (error || !data) {
    if (error?.code !== "PGRST116") {
      logger.error({ error, siteId }, "Error fetching session");
    }
    return null;
  }

  // Check expiration with grace period
  const expiresAt = new Date(data.expires_at);
  const graceDeadline = new Date(expiresAt.getTime() + AUTH_CONFIG.SESSION_GRACE_PERIOD_MS);

  if (new Date() > graceDeadline) {
    logger.debug({ sessionId: data.id }, "Session expired beyond grace period");
    return null;
  }

  return data as SessionData;
}

export async function getSessionById(
  sessionId: string,
  siteId: number
): Promise<SessionData | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("site_id", siteId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as SessionData;
}

// =============================================================================
// SESSION ROTATION
// =============================================================================

export async function rotateSession(
  session: SessionData,
  user: { id: string; email: string; tier: TierType; name: string | null },
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<SessionResult> {
  // Generate new token pair with incremented version
  const tokenPair = await generateTokenPair(
    user,
    session.token_family,
    session.token_version
  );

  // Store rotation record for grace period handling
  await storeRotationRecord({
    oldJti: session.access_token_jti || "",
    oldRefreshTokenHash: session.refresh_token_hash,
    newSessionId: session.id,
    siteId: session.site_id,
    userId: session.user_id,
    tokenFamily: session.token_family,
  });

  const deviceInfo = userAgent 
    ? parseUserAgent(userAgent) 
    : (session.device_info as DeviceInfo | null);

  // Update session with new tokens
  const { error } = await supabaseAdmin
    .from("sessions")
    .update({
      refresh_token_hash: tokenPair.refreshTokenHash,
      access_token_jti: tokenPair.accessTokenJti,
      token_version: tokenPair.tokenVersion,
      ip_address: ipAddress ?? session.ip_address,
      user_agent: userAgent ?? session.user_agent,
      device_info: deviceInfo as Json | null,
      expires_at: tokenPair.expiresAt.toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (error) {
    logger.error({ error, sessionId: session.id }, "Failed to rotate session");
    throw new Error("Failed to rotate session");
  }

  logger.info(
    { sessionId: session.id, version: tokenPair.tokenVersion },
    "Session rotated"
  );

  return {
    sessionId: session.id,
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    expiresAt: tokenPair.expiresAt,
  };
}

// =============================================================================
// ROTATION RECORDS (For Multi-Tab Support)
// =============================================================================

interface RotationRecordParams {
  oldJti: string;
  oldRefreshTokenHash: string;
  newSessionId: string;
  siteId: number;
  userId: string;
  tokenFamily: string;
}

async function storeRotationRecord(params: RotationRecordParams): Promise<void> {
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.ROTATION_RECORD_TTL_MS);

  const { error } = await supabaseAdmin.from("session_rotations").insert({
    old_jti: params.oldJti,
    old_refresh_token_hash: params.oldRefreshTokenHash,
    new_session_id: params.newSessionId,
    site_id: params.siteId,
    user_id: params.userId,
    token_family: params.tokenFamily,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    logger.warn({ error }, "Failed to store rotation record");
  }
}

export async function checkRotationRecord(
  refreshTokenHash: string,
  siteId: number
): Promise<SessionData | null> {
  // Check if this token was recently rotated
  const { data: rotation, error: rotationError } = await supabaseAdmin
    .from("session_rotations")
    .select("new_session_id, used")
    .eq("old_refresh_token_hash", refreshTokenHash)
    .eq("site_id", siteId)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (rotationError || !rotation) {
    return null;
  }

  // If already used, this might be a token reuse attack
  if (rotation.used) {
    logger.warn({ refreshTokenHash, siteId }, "Potential token reuse detected");
    return null;
  }

  // Mark as used
  await supabaseAdmin
    .from("session_rotations")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("old_refresh_token_hash", refreshTokenHash)
    .eq("site_id", siteId);

  // Return the new session
  return getSessionById(rotation.new_session_id, siteId);
}

// =============================================================================
// SESSION DELETION
// =============================================================================

export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    logger.warn({ error, sessionId }, "Failed to delete session");
    return false;
  }

  return true;
}

export async function deleteAllUserSessions(
  userId: string,
  siteId: number,
  exceptSessionId?: string
): Promise<number> {
  let query = supabaseAdmin
    .from("sessions")
    .delete()
    .eq("user_id", userId)
    .eq("site_id", siteId);

  if (exceptSessionId) {
    query = query.neq("id", exceptSessionId);
  }

  const { error, count } = await query;

  if (error) {
    logger.error({ error, userId, siteId }, "Failed to delete user sessions");
    throw new Error("Failed to delete sessions");
  }

  logger.info({ userId, siteId, count }, "User sessions deleted");
  return count || 0;
}

// =============================================================================
// SESSION CLEANUP
// =============================================================================

export async function cleanExpiredSessions(): Promise<number> {
  const { error, count } = await supabaseAdmin
    .from("sessions")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (error) {
    logger.error({ error }, "Failed to clean expired sessions");
    return 0;
  }

  // Also clean rotation records
  await supabaseAdmin
    .from("session_rotations")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (count && count > 0) {
    logger.info({ count }, "Cleaned expired sessions");
  }

  return count || 0;
}

// =============================================================================
// UTILITIES
// =============================================================================

function parseUserAgent(userAgent?: string): DeviceInfo | null {
  if (!userAgent) return null;

  const info: DeviceInfo = {
    raw: userAgent.substring(0, 500),
  };

  // Browser detection
  if (userAgent.includes("Chrome") && !userAgent.includes("Edge")) {
    info.browser = "Chrome";
  } else if (userAgent.includes("Firefox")) {
    info.browser = "Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    info.browser = "Safari";
  } else if (userAgent.includes("Edge")) {
    info.browser = "Edge";
  }

  // OS detection
  if (userAgent.includes("Windows")) {
    info.os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    info.os = "MacOS";
  } else if (userAgent.includes("Linux") && !userAgent.includes("Android")) {
    info.os = "Linux";
  } else if (userAgent.includes("Android")) {
    info.os = "Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    info.os = "iOS";
  }

  // Device detection
  if (userAgent.includes("Mobile") || userAgent.includes("iPhone")) {
    info.device = "Mobile";
  } else if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
    info.device = "Tablet";
  } else {
    info.device = "Desktop";
  }

  return info;
}