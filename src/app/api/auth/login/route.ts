// app/api/auth/login/route.ts

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";
import {
  successResponse,
  errorResponse,
  handleApiError,
  setAuthCookies,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { getClientIp, getUserAgent } from "@/lib/request";
import { getSiteId } from "@/lib/site/config";
import type { Json } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIp = getClientIp(request);
    const userAgent = getUserAgent(request);
    const siteId = await getSiteId();

    // Validate input
    const { email, password } = loginSchema.parse(body);

    // Get user
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, password_hash, name, tier, is_active")
      .eq("email", email)
      .eq("site_id", siteId)
      .single();

    if (fetchError || !user) {
      logger.warn({ email, siteId }, "Login failed - user not found");
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    if (!user.is_active) {
      logger.warn({ userId: user.id }, "Login failed - account deactivated");
      return errorResponse("Account has been deactivated", 403, "ACCOUNT_DEACTIVATED");
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      await logAuditEvent(user.id, "login_failed", clientIp, userAgent, {
        reason: "invalid_password",
        site_id: siteId,
      });
      logger.warn({ userId: user.id }, "Login failed - invalid password");
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Create session
    const session = await createSession({
      userId: user.id,
      siteId,
      userEmail: user.email,
      userTier: user.tier,
      userName: user.name,
      ipAddress: clientIp,
      userAgent,
    });

    // Update last login
    await supabaseAdmin
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    await logAuditEvent(user.id, "login_success", clientIp, userAgent, {
      site_id: siteId,
      session_id: session.sessionId,
    });

    logger.info({ userId: user.id, sessionId: session.sessionId }, "User logged in");

    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
      sessionId: session.sessionId,
    });

    return setAuthCookies(response, session.accessToken, session.refreshToken);
  } catch (error) {
    logger.error({ error }, "Login error");
    return handleApiError(error);
  }
}

async function logAuditEvent(
  userId: string,
  eventType: string,
  ipAddress: string | null,
  userAgent: string | null,
  metadata: any
): Promise<void> {
  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    event_type: eventType,
    resource_type: "user",
    resource_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: metadata as Json,
  });
}