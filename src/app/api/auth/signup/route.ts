// app/api/auth/signup/route.ts

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { signupSchema } from "@/lib/auth/validation";
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
    const { email, password, name } = signupSchema.parse(body);

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("site_id", siteId)
      .single();

    if (existingUser) {
      logger.warn({ email, siteId }, "Signup failed - email exists");
      return errorResponse("Email already registered", 409, "EMAIL_EXISTS");
    }

    // Create user
    const passwordHash = await hashPassword(password);

    const { data: user, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        name: name?.trim() || null,
        site_id: siteId,
        tier: "free",
        owned_chapters: [],
        is_active: true,
      })
      .select("id, email, name, tier")
      .single();

    if (createError || !user) {
      logger.error({ error: createError }, "Failed to create user");
      return errorResponse("Failed to create account", 500, "CREATE_FAILED");
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

    // Log audit event
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      event_type: "user_signup",
      resource_type: "user",
      resource_id: user.id,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: {
        site_id: siteId,
        session_id: session.sessionId,
      } as Json,
    });

    logger.info({ userId: user.id, sessionId: session.sessionId }, "User signed up");

    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        },
        sessionId: session.sessionId,
        message: "Account created successfully",
      },
      201
    );

    return setAuthCookies(response, session.accessToken, session.refreshToken);
  } catch (error) {
    logger.error({ error }, "Signup error");
    return handleApiError(error);
  }
}