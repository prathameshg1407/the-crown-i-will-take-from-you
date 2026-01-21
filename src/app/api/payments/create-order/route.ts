// app/api/payments/create-order/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { PaymentService } from '@/lib/razorpay/service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createOrderSchema = z.object({
  purchaseType: z.enum(['complete', 'custom']),
  tier: z.enum(['complete']).optional(),
  customChapters: z.array(z.number()).optional(),
})

export async function POST(request: NextRequest) {
  try {
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
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' } },
        { status: 401 }
      )
    }

    const userId = payload.sub

    const body = await request.json()
    const validation = createOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid request', 
            details: validation.error.issues  // ✅ Changed from .errors to .issues
          } 
        },
        { status: 400 }
      )
    }

    const { purchaseType, tier, customChapters } = validation.data

    // Validate based on purchase type
    if (purchaseType === 'complete' && tier !== 'complete') {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid tier for complete pack' } },
        { status: 400 }
      )
    }

    if (purchaseType === 'custom' && (!customChapters || customChapters.length === 0)) {
      return NextResponse.json(
        { success: false, error: { message: 'No chapters selected' } },
        { status: 400 }
      )
    }

    const order = await PaymentService.createOrder({
      userId,
      email: payload.email,
      purchaseType,
      tier,
      customChapters,
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Create order failed')
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to create order'
        } 
      },
      { status: 500 }
    )
  }
}