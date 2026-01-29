// app/api/payments/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay/client'
import { PaymentService } from '@/lib/razorpay/service'
import { logger } from '@/lib/logger'

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. Get signature from headers
    const signature = request.headers.get('x-razorpay-signature')
    
    if (!signature) {
      logger.warn('Webhook received without signature')
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 400 }
      )
    }

    // 2. Verify webhook secret is configured
    if (!WEBHOOK_SECRET) {
      logger.error('Webhook secret not configured')
      return NextResponse.json(
        { success: false, error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    // 3. Get raw body for signature verification
    const body = await request.text()
    
    // 4. Verify signature
    const isValid = verifyWebhookSignature(body, signature, WEBHOOK_SECRET)

    if (!isValid) {
      logger.warn('Invalid webhook signature')
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // 5. Parse event
    const event = JSON.parse(body)
    
    logger.info({ 
      event: event.event,
      accountId: event.account_id,
    }, 'Webhook received')

    // 6. Handle event
    await PaymentService.handleWebhookEvent(event)

    logger.info({
      event: event.event,
      duration: Date.now() - startTime,
    }, 'Webhook processed successfully')

    return NextResponse.json({ success: true })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error({ 
      error: errorMessage,
      duration: Date.now() - startTime,
    }, 'Webhook processing failed')
    
    // Return 200 to prevent Razorpay from retrying if it's a parsing error
    // Return 500 only for actual processing failures
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Webhook endpoint should not have any caching
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'