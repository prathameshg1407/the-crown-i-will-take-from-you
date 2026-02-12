// app/api/auth/logout/route.ts

import { NextRequest } from "next/server";
import { deleteSession, getSessionByRefreshToken } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { successResponse, clearAuthCookies } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { getClientIp, getUserAgent } from "@/lib/request";
import { getSiteId } from "@/lib/site/config";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;
    const siteId = await getSiteId();

    if (refreshToken) {
      const session = await getSessionByRefreshToken(refreshToken, siteId);

      if (session) {
        await deleteSession(session.id);

        await supabaseAdmin.from("audit_logs").insert({
          user_id: session.user_id,
          event_type: "logout",
          resource_type: "session",
          resource_id: session.id,
          ip_address: getClientIp(request),
          user_agent: getUserAgent(request),
          metadata: { siteId },
        });

        logger.info({ userId: session.user_id, sessionId: session.id }, "User logged out");
      }
    }

    const response = successResponse({ message: "Logged out successfully" });
    return clearAuthCookies(response);
  } catch (error) {
    logger.error({ error }, "Logout error");
    const response = successResponse({ message: "Logged out" });
    return clearAuthCookies(response);
  }
}