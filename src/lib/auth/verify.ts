// lib/auth/verify.ts

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  tier?: string;
  error?: string;
}

export async function verifyAuth(_request?: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return { authenticated: false, error: "No access token" };
    }

    const payload = await verifyAccessToken(accessToken);

    return {
      authenticated: true,
      userId: payload.sub,
      email: payload.email,
      tier: payload.tier,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : "Token verification failed",
    };
  }
}

export async function requireAuth(_request?: NextRequest): Promise<{
  userId: string;
  email: string;
  tier: string;
}> {
  const result = await verifyAuth(_request);

  if (!result.authenticated || !result.userId) {
    throw new Error(result.error || "Unauthorized");
  }

  return {
    userId: result.userId,
    email: result.email!,
    tier: result.tier!,
  };
}