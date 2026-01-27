// app/api/payments/paypal/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { verifyPayPalWebhook } from '@/lib/paypal/client'
import { logger } from '@/lib/logger'

const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    // Get PayPal headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    // Verify webhook signature (if webhook ID is configured)
    if (WEBHOOK_ID) {
      const isValid = await verifyPayPalWebhook(WEBHOOK_ID, headers, body)
      if (!isValid) {
        logger.warn('Invalid PayPal webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const event = JSON.parse(body)
    logger.info({ eventType: event.event_type }, 'PayPal webhook received')

    // Handle different event types
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        logger.info({ orderId: event.resource.id }, 'PayPal order approved')
        break

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(event.resource)
        break

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        await handleCaptureFailed(event.resource)
        break

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handleRefund(event.resource)
        break

      default:
        logger.info({ eventType: event.event_type }, 'Unhandled PayPal webhook event')
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    logger.error({ error }, 'PayPal webhook processing failed')
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCaptureCompleted(resource: { 
  id: string
  custom_id?: string 
  amount: { value: string; currency_code: string }
}) {
  const purchaseId = resource.custom_id
  if (!purchaseId) return

  const { error } = await supabaseAdmin
    .from('purchases')
    .update({
      status: 'completed',
      paypal_capture_id: resource.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .eq('status', 'pending')

  if (!error) {
    logger.info({ purchaseId, captureId: resource.id }, 'Purchase completed via webhook')
  }
}

async function handleCaptureFailed(resource: { custom_id?: string }) {
  const purchaseId = resource.custom_id
  if (!purchaseId) return

  await supabaseAdmin
    .from('purchases')
    .update({
      status: 'failed',
    })
    .eq('id', purchaseId)
    .eq('status', 'pending')

  logger.info({ purchaseId }, 'Payment failed via webhook')
}

async function handleRefund(resource: { 
  id: string
  amount: { value: string }
}) {
  const { error } = await supabaseAdmin
    .from('purchases')
    .update({
      status: 'refunded',
      refund_id: resource.id,
      refund_amount: Math.round(parseFloat(resource.amount.value) * 100),
      refunded_at: new Date().toISOString(),
    })
    .eq('paypal_capture_id', resource.id)

  if (!error) {
    logger.info({ refundId: resource.id }, 'Refund recorded via webhook')
  }
}