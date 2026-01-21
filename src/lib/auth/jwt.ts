// lib/auth/jwt.ts
import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose'
import { nanoid } from 'nanoid'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export interface JWTPayload {
  sub: string
  email: string
  tier: string
  name?: string
  type?: 'access' | 'refresh'
  jti?: string
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
  jti: string
  iat?: number
  exp?: number
}

export async function generateAccessToken(
  payload: Omit<JWTPayload, 'jti' | 'iat' | 'exp' | 'type'>
): Promise<string> {
  const jti = nanoid()
  
  return await new SignJWT({ 
    ...payload,
    jti,
    type: 'access'
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .setJti(jti)
    .sign(JWT_SECRET)
}

export async function generateRefreshToken(userId: string): Promise<{ token: string; jti: string }> {
  const jti = nanoid()
  
  const token = await new SignJWT({ 
    sub: userId,
    type: 'refresh',
    jti
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
    .setJti(jti)
    .sign(JWT_SECRET)
  
  return { token, jti }
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    if (!payload.sub || !payload.email || !payload.tier) {
      throw new Error('Invalid token payload')
    }
    
    if (payload.type !== 'access') {
      throw new Error('Invalid token type')
    }
    
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      tier: payload.tier as string,
      name: payload.name as string | undefined,
      type: payload.type as 'access',
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    throw new Error('Invalid or expired token')
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    if (!payload.sub || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token')
    }
    
    return {
      sub: payload.sub as string,
      type: 'refresh',
      jti: payload.jti as string,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    throw new Error('Invalid or expired refresh token')
  }
}

export async function verifyToken(token: string): Promise<JoseJWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    throw new Error('Invalid or expired token')
  }
}

export function getExpirationSeconds(timeString: string): number {
  const unit = timeString.slice(-1)
  const value = parseInt(timeString.slice(0, -1))
  
  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 60 * 60
    case 'd': return value * 24 * 60 * 60
    default: return 900
  }
}

export { JWT_REFRESH_EXPIRES_IN }