// lib/auth/config.ts

export const AUTH_CONFIG = {
  // Token lifetimes
  ACCESS_TOKEN_EXPIRES: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_TOKEN_EXPIRES: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // Session settings
  SESSION_GRACE_PERIOD_MS: 5 * 60 * 1000, // 5 minutes
  ROTATION_GRACE_PERIOD_MS: 2 * 60 * 1000, // 2 minutes for multi-tab
  ROTATION_RECORD_TTL_MS: 5 * 60 * 1000, // 5 minutes

  // Cookie settings
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },

  // Free chapter limit
  FREE_CHAPTER_LIMIT: 81,
} as const;

export function getExpirationSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhdy])$/);
  if (!match) return 1800; // Default 30 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    y: 31536000,
  };

  return value * (multipliers[unit] || 60);
}