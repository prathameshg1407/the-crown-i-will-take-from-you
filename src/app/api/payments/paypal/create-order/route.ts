// app/api/payments/paypal/create-order/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { PayPalService } from '@/lib/paypal/service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createOrderSchema = z.object({
  purchaseType: z.enum(['complete', 'custom']),
  tier: z.enum(['complete']).optional(),
  customChapters: z.array(z.number().int().positive()).optional(),
  currency: z.string().length(3).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Please login to continue', code: 'NO_TOKEN' } },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch {
      return NextResponse.json(
        { success: false, error: { message: 'Session expired. Please login again.', code: 'INVALID_TOKEN' } },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const validation = createOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid request', 
            details: validation.error.issues 
          } 
        },
        { status: 400 }
      )
    }

    const { purchaseType, tier, customChapters, currency } = validation.data

    // Validate purchase type requirements
    if (purchaseType === 'complete' && tier !== 'complete') {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid tier for complete pack purchase' } },
        { status: 400 }
      )
    }

    if (purchaseType === 'custom' && (!customChapters || customChapters.length === 0)) {
      return NextResponse.json(
        { success: false, error: { message: 'No chapters selected for custom purchase' } },
        { status: 400 }
      )
    }

    // Create PayPal order
    const order = await PayPalService.createOrder({
      userId: payload.sub,
      email: payload.email,
      purchaseType,
      tier,
      customChapters,
      currency,
    })

    logger.info({ 
      userId: payload.sub, 
      orderId: order.orderId,
      purchaseType,
      currency: order.currency,
    }, 'PayPal order created via API')

    return NextResponse.json({
      success: true,
      data: order,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order'
    logger.error({ error: errorMessage }, 'PayPal create order API failed')
    
    return NextResponse.json(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    )
  }
}