// app/api/payments/verify/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { PaymentService } from '@/lib/razorpay/service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Validate session
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'NO_TOKEN' } },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid token', code: 'INVALID_TOKEN' } },
        { status: 401 }
      )
    }

    const userId = payload.sub

    // 2. Parse and validate request
    const body = await request.json()
    const validation = verifyPaymentSchema.safeParse(body)

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

    // 3. Verify payment
    const purchase = await PaymentService.verifyPayment(validation.data, userId)

    // 4. Build success message
    let message = 'Purchase completed successfully!'
    
    if (purchase.purchase_type === 'complete') {
      message = 'Complete pack unlocked! You now have access to all chapters.'
    } else if (
      purchase.purchase_data && 
      typeof purchase.purchase_data === 'object' && 
      'chapterCount' in purchase.purchase_data &&
      typeof purchase.purchase_data.chapterCount === 'number'
    ) {
      const count = purchase.purchase_data.chapterCount
      message = `${count} chapter${count > 1 ? 's' : ''} unlocked successfully!`
    }

    logger.info({
      userId,
      purchaseId: purchase.id,
      purchaseType: purchase.purchase_type,
      currency: purchase.currency,
      duration: Date.now() - startTime,
    }, 'Payment verified successfully')

    return NextResponse.json({
      success: true,
      data: {
        purchase: {
          id: purchase.id,
          purchaseType: purchase.purchase_type,
          amount: purchase.amount,
          currency: purchase.currency,
          status: purchase.status,
        },
        message,
      },
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error({ 
      error: errorMessage,
      duration: Date.now() - startTime,
    }, 'Payment verification failed')
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: errorMessage === 'Invalid payment signature' 
            ? 'Payment verification failed. Please contact support if amount was deducted.'
            : (error instanceof Error ? error.message : 'Payment verification failed')
        } 
      },
      { status: 500 }
    )
  }
}