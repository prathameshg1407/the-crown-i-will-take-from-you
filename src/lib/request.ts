// lib/request.ts

import { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string | null {
  // Check common headers for proxied requests
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}

export function getUserAgent(request: NextRequest): string | null {
  return request.headers.get("user-agent");
}