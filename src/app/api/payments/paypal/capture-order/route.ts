// app/api/payments/paypal/capture-order/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { PayPalService } from '@/lib/paypal/service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const captureOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
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
    const validation = captureOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid order ID' } },
        { status: 400 }
      )
    }

    // Capture the payment
    const result = await PayPalService.capturePayment(
      validation.data.orderId, 
      payload.sub
    )

    logger.info({ 
      userId: payload.sub, 
      orderId: validation.data.orderId,
      alreadyCompleted: result.alreadyCompleted,
    }, 'PayPal order captured via API')

    return NextResponse.json({
      success: true,
      data: {
        message: result.message,
        purchaseId: result.purchase?.id,
        purchaseType: result.purchase?.purchase_type,
        alreadyCompleted: result.alreadyCompleted,
      },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Payment capture failed'
    logger.error({ error: errorMessage }, 'PayPal capture API failed')
    
    return NextResponse.json(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    )
  }
}