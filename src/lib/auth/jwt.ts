// lib/auth/jwt.ts

import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { AUTH_CONFIG, getExpirationSeconds } from "./config";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-at-least-32-characters-long"
);

// =============================================================================
// TYPES
// =============================================================================

export interface AccessTokenPayload {
  sub: string;
  email: string;
  tier: string;
  name?: string;
  jti: string;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  family: string;
  version: number;
  type: "refresh";
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenJti: string;
  refreshTokenJti: string;
  tokenFamily: string;
  tokenVersion: number;
  refreshTokenHash: string;
  expiresAt: Date;
}

// =============================================================================
// UTILITIES (Edge-compatible)
// =============================================================================

/**
 * Hash a token using Web Crypto API (works in Edge Runtime)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify a token against its hash
 */
export async function verifyTokenHash(token: string, hash: string): Promise<boolean> {
  const computedHash = await hashToken(token);
  return computedHash === hash;
}

// =============================================================================
// TOKEN GENERATION
// =============================================================================

export async function generateAccessToken(payload: {
  sub: string;
  email: string;
  tier: string;
  name?: string;
}): Promise<{ token: string; jti: string }> {
  const jti = nanoid();

  const token = await new SignJWT({
    ...payload,
    jti,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(AUTH_CONFIG.ACCESS_TOKEN_EXPIRES)
    .sign(JWT_SECRET);

  return { token, jti };
}

export async function generateRefreshToken(
  userId: string,
  family?: string,
  version: number = 1
): Promise<{
  token: string;
  jti: string;
  family: string;
  version: number;
  hash: string;
  expiresAt: Date;
}> {
  const jti = nanoid();
  const tokenFamily = family || nanoid();
  const expiresInSeconds = getExpirationSeconds(AUTH_CONFIG.REFRESH_TOKEN_EXPIRES);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const token = await new SignJWT({
    sub: userId,
    jti,
    family: tokenFamily,
    version,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(AUTH_CONFIG.REFRESH_TOKEN_EXPIRES)
    .sign(JWT_SECRET);

  const hash = await hashToken(token);

  return { token, jti, family: tokenFamily, version, hash, expiresAt };
}

export async function generateTokenPair(
  user: { id: string; email: string; tier: string; name?: string | null },
  existingFamily?: string,
  existingVersion?: number
): Promise<TokenPair> {
  const version = existingVersion ? existingVersion + 1 : 1;

  const [accessResult, refreshResult] = await Promise.all([
    generateAccessToken({
      sub: user.id,
      email: user.email,
      tier: user.tier,
      name: user.name ?? undefined,
    }),
    generateRefreshToken(user.id, existingFamily, version),
  ]);

  return {
    accessToken: accessResult.token,
    refreshToken: refreshResult.token,
    accessTokenJti: accessResult.jti,
    refreshTokenJti: refreshResult.jti,
    tokenFamily: refreshResult.family,
    tokenVersion: refreshResult.version,
    refreshTokenHash: refreshResult.hash,
    expiresAt: refreshResult.expiresAt,
  };
}

// =============================================================================
// TOKEN VERIFICATION
// =============================================================================

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);

  if (!payload.sub || !payload.email || !payload.tier || payload.type !== "access") {
    throw new Error("Invalid access token payload");
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    tier: payload.tier as string,
    name: payload.name as string | undefined,
    jti: payload.jti as string,
    type: "access",
    iat: payload.iat,
    exp: payload.exp,
  };
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);

  if (!payload.sub || !payload.jti || !payload.family || payload.type !== "refresh") {
    throw new Error("Invalid refresh token payload");
  }

  return {
    sub: payload.sub as string,
    jti: payload.jti as string,
    family: payload.family as string,
    version: (payload.version as number) || 1,
    type: "refresh",
    iat: payload.iat,
    exp: payload.exp,
  };
}