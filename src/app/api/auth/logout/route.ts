// app/api/auth/logout/route.ts

import { NextRequest } from "next/server";
import { deleteSession, getSessionByRefreshToken } from "@/lib/auth/session";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { supabaseAdmin } from "@/lib/supabase/server";
import { successResponse, clearAuthCookies } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { getClientIp, getUserAgent } from "@/lib/request";
import { getSiteId } from "@/lib/site/config";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;
    const accessToken = request.cookies.get("access_token")?.value;
    const siteId = await getSiteId();

    let sessionIdToOptions: string | null = null;
    let userId: string | null = null;

    if (refreshToken) {
      const session = await getSessionByRefreshToken(refreshToken, siteId);
      if (session) {
        sessionIdToOptions = session.id;
        userId = session.user_id;
      }
    } else if (accessToken) {
      try {
        const payload = await verifyAccessToken(accessToken);
        const { data: session } = await supabaseAdmin
          .from("sessions")
          .select("id, user_id")
          .eq("access_token_jti", payload.jti)
          .single();
        
        if (session) {
          sessionIdToOptions = session.id;
          userId = session.user_id;
        }
      } catch {
        // Token invalid, still clear cookies
      }
    }

    if (sessionIdToOptions) {
      await deleteSession(sessionIdToOptions);

      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        event_type: "logout",
        resource_type: "session",
        resource_id: sessionIdToOptions,
        ip_address: getClientIp(request),
        user_agent: getUserAgent(request),
        metadata: { siteId },
      });

      logger.info({ userId, sessionId: sessionIdToOptions }, "User logged out");
    }

    const response = successResponse({ message: "Logged out successfully" });
    return clearAuthCookies(response);
  } catch (error) {
    logger.error({ error }, "Logout error");
    const response = successResponse({ message: "Logged out" });
    return clearAuthCookies(response);
  }
}