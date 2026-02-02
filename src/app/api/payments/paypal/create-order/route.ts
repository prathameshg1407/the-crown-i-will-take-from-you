// src/app/api/payments/paypal/create-order/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { PayPalService } from '@/lib/paypal/service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createOrderSchema = z.object({
  purchaseType: z.enum(['complete', 'custom']),
  customChapters: z.array(z.number().int().positive()).optional(),
  amountINR: z.number().optional(),
  currency: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Please login to continue' } },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch {
      return NextResponse.json(
        { success: false, error: { message: 'Session expired. Please login again.' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request' } },
        { status: 400 }
      )
    }

    const { purchaseType, customChapters } = validation.data

    if (purchaseType === 'custom' && (!customChapters || customChapters.length === 0)) {
      return NextResponse.json(
        { success: false, error: { message: 'Please select chapters to purchase' } },
        { status: 400 }
      )
    }

    // Always use USD for PayPal
    const order = await PayPalService.createOrder({
      userId: payload.sub,
      email: payload.email,
      purchaseType,
      tier: purchaseType === 'complete' ? 'complete' : undefined,
      customChapters: purchaseType === 'custom' ? customChapters : undefined,
      currency: 'USD', // Always USD!
    })

    logger.info({ 
      userId: payload.sub, 
      orderId: order.orderId,
      purchaseType,
      currency: 'USD',
    }, 'PayPal order created')

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
      },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order'
    logger.error({ error: errorMessage }, 'PayPal create order failed')
    
    return NextResponse.json(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    )
  }
}