// app/api/payments/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature')
    
    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 400 }
      )
    }

    const body = await request.text()
    const isValid = verifyWebhookSignature(body, signature, WEBHOOK_SECRET)  // ✅ Added secret parameter

    if (!isValid) {
      logger.warn('Invalid webhook signature')
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const event = JSON.parse(body)
    logger.info({ event: event.event }, 'Webhook received')

    // Handle different events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity)
        break
      
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity)
        break
      
      case 'refund.created':
        await handleRefundCreated(event.payload.refund.entity)
        break
      
      default:
        logger.info({ event: event.event }, 'Unhandled webhook event')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Webhook processing failed')
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    await supabaseAdmin
      .from('purchases')
      .update({
        status: 'completed',
        razorpay_payment_id: payment.id,
        verified_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', payment.order_id)

    logger.info({ paymentId: payment.id }, 'Payment captured via webhook')
  } catch (error) {
    logger.error({ error, paymentId: payment.id }, 'Failed to handle payment captured')
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    await supabaseAdmin
      .from('purchases')
      .update({ status: 'failed' })
      .eq('razorpay_order_id', payment.order_id)

    logger.info({ paymentId: payment.id }, 'Payment failed via webhook')
  } catch (error) {
    logger.error({ error, paymentId: payment.id }, 'Failed to handle payment failed')
  }
}

async function handleRefundCreated(refund: any) {
  try {
    await supabaseAdmin
      .from('purchases')
      .update({
        status: 'refunded',
        refund_id: refund.id,
        refund_amount: refund.amount,
        refunded_at: new Date().toISOString(),
      })
      .eq('razorpay_payment_id', refund.payment_id)

    logger.info({ refundId: refund.id }, 'Refund created via webhook')
  } catch (error) {
    logger.error({ error, refundId: refund.id }, 'Failed to handle refund created')
  }
}