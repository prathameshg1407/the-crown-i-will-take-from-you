// lib/razorpay/client.ts

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

// Get credentials
const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

// Validate credentials
if (!keyId || !keySecret) {
  logger.error('Razorpay credentials missing in environment variables')
  throw new Error('Razorpay credentials not configured')
}

if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
  logger.error({ keyId: keyId.substring(0, 10) }, 'Invalid Razorpay Key ID format')
  throw new Error('Invalid Razorpay Key ID format')
}

logger.info({ 
  keyId: keyId.substring(0, 15) + '...',
  mode: keyId.startsWith('rzp_test_') ? 'TEST' : 'LIVE'
}, 'Initializing Razorpay client')

// Server-side Razorpay instance
export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
})

// Verify payment signature
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    // ✅ Add type assertion since we validated keySecret above
    if (!keySecret) {
      throw new Error('Key secret not available')
    }

    const text = `${orderId}|${paymentId}`
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex')
    
    return expectedSignature === signature
  } catch (error) {
    logger.error({ error }, 'Payment signature verification failed')
    return false
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  webhookBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookBody)
      .digest('hex')
    
    return expectedSignature === signature
  } catch (error) {
    logger.error({ error }, 'Webhook signature verification failed')
    return false
  }
}