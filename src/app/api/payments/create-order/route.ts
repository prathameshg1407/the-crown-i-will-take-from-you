// app/api/payments/create-order/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { PaymentService } from '@/lib/razorpay/service'
import { razorpayConfig, getPaymentCurrency } from '@/lib/razorpay/config'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // 10 orders per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  userLimit.count++
  return true
}

// Request schema
const createOrderSchema = z.object({
  purchaseType: z.enum(['complete', 'custom']),
  tier: z.enum(['complete']).optional(),
  customChapters: z.array(z.number().int().positive()).optional(),
  // International payment fields
  isInternational: z.boolean().optional(),
  userCountry: z.string().optional(),
  userCurrency: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Validate session
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized - Please login first', code: 'NO_TOKEN' } },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' } },
        { status: 401 }
      )
    }

    const userId = payload.sub
    const email = payload.email
    const name = payload.name

    // 2. Rate limiting
    if (!checkRateLimit(userId)) {
      logger.warn({ userId }, 'Rate limit exceeded for order creation')
      return NextResponse.json(
        { success: false, error: { message: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED' } },
        { status: 429 }
      )
    }

    // 3. Parse and validate request
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid request', 
            code: 'VALIDATION_ERROR', 
            details: parsed.error.issues 
          } 
        },
        { status: 400 }
      )
    }

    const { 
      purchaseType, 
      tier, 
      customChapters, 
      isInternational = false, 
      userCountry,
      userCurrency,
    } = parsed.data

    // 4. Validate purchase type specific requirements
    if (purchaseType === 'complete' && tier !== 'complete') {
      return NextResponse.json(
        { success: false, error: { message: 'Complete pack requires tier=complete', code: 'INVALID_TIER' } },
        { status: 400 }
      )
    }

    if (purchaseType === 'custom' && (!customChapters || customChapters.length === 0)) {
      return NextResponse.json(
        { success: false, error: { message: 'No chapters selected', code: 'NO_CHAPTERS' } },
        { status: 400 }
      )
    }

    // 5. Get idempotency key
    const idempotencyKey = request.headers.get('X-Idempotency-Key') || undefined

    // 6. Determine payment currency
    const currency = getPaymentCurrency(isInternational, userCurrency)

    logger.info({
      userId,
      purchaseType,
      isInternational,
      currency,
      userCountry,
    }, 'Processing order creation')

    // 7. Create order
    const result = await PaymentService.createOrder(
      {
        userId,
        email,
        name: name || undefined,
        purchaseType,
        tier,
        customChapters,
        currency,
        isInternational,
        userCountry,
      },
      idempotencyKey
    )

    logger.info({
      userId,
      orderId: result.orderId,
      currency: result.currency,
      isInternational: result.isInternational,
      paypalOnly: result.paypalOnly,
      duration: Date.now() - startTime,
    }, 'Order created successfully')

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        keyId: razorpayConfig.publicKeyId,
        purchaseId: result.purchaseId,
        isInternational: result.isInternational,
        paypalOnly: result.paypalOnly,
      },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error({
      error: errorMessage,
      duration: Date.now() - startTime,
    }, 'Order creation failed')

    // Client-safe error messages
    const safeMessages: Record<string, string> = {
      'User not found': 'Account not found. Please log in again.',
      'You already own the complete pack': 'You already have access to all chapters!',
      'You already own all selected chapters': 'You already own these chapters.',
      'Minimum': errorMessage, // Keep minimum chapter messages
    }

    const clientMessage = Object.entries(safeMessages).find(([key]) => 
      errorMessage.includes(key)
    )?.[1] || 'Failed to create order. Please try again.'

    return NextResponse.json(
      { success: false, error: { message: clientMessage } },
      { status: 400 }
    )
  }
}