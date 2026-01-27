// lib/razorpay/client.ts

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

// Types
interface RazorpayConfig {
  keyId: string
  keySecret: string
  isLive: boolean
}

// Validate and get credentials
function getCredentials(): RazorpayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    logger.error('Razorpay credentials missing in environment variables')
    throw new Error('Razorpay credentials not configured')
  }

  const isLive = keyId.startsWith('rzp_live_')
  const isTest = keyId.startsWith('rzp_test_')

  if (!isLive && !isTest) {
    logger.error({ keyIdPrefix: keyId.substring(0, 10) }, 'Invalid Razorpay Key ID format')
    throw new Error('Invalid Razorpay Key ID format')
  }

  // Warn if using test keys in production
  if (process.env.NODE_ENV === 'production' && isTest) {
    logger.warn('Using Razorpay TEST keys in production environment!')
  }

  return { keyId, keySecret, isLive }
}

const config = getCredentials()

logger.info({
  keyIdPrefix: config.keyId.substring(0, 15) + '...',
  mode: config.isLive ? 'LIVE' : 'TEST',
}, 'Initializing Razorpay client')

// Server-side Razorpay instance
export const razorpay = new Razorpay({
  key_id: config.keyId,
  key_secret: config.keySecret,
})

// Export public key ID (safe for client)
export const publicKeyId = config.keyId

/**
 * Timing-safe signature comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    const dummy = Buffer.from(a)
    crypto.timingSafeEqual(dummy, dummy)
    return false
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Verify payment signature (timing-safe)
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    if (!orderId || !paymentId || !signature) {
      logger.warn({ orderId, paymentId }, 'Missing parameters for signature verification')
      return false
    }

    const text = `${orderId}|${paymentId}`
    const expectedSignature = crypto
      .createHmac('sha256', config.keySecret)
      .update(text)
      .digest('hex')

    const isValid = timingSafeEqual(expectedSignature, signature)
    
    if (!isValid) {
      logger.warn({ orderId, paymentId }, 'Signature mismatch')
    }

    return isValid
  } catch (error) {
    logger.error({ error, orderId, paymentId }, 'Payment signature verification error')
    return false
  }
}

/**
 * Verify webhook signature (timing-safe)
 */
export function verifyWebhookSignature(
  webhookBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!webhookBody || !signature || !secret) {
      logger.warn('Missing parameters for webhook signature verification')
      return false
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(webhookBody)
      .digest('hex')

    return timingSafeEqual(expectedSignature, signature)
  } catch (error) {
    logger.error({ error }, 'Webhook signature verification error')
    return false
  }
}

/**
 * Fetch and validate payment from Razorpay
 */
export async function fetchPaymentDetails(paymentId: string) {
  try {
    const payment = await razorpay.payments.fetch(paymentId)
    return payment
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to fetch payment details')
    throw new Error('Failed to fetch payment details from Razorpay')
  }
}

/**
 * Fetch order details from Razorpay
 */
export async function fetchOrderDetails(orderId: string) {
  try {
    const order = await razorpay.orders.fetch(orderId)
    return order
  } catch (error) {
    logger.error({ error, orderId }, 'Failed to fetch order details')
    throw new Error('Failed to fetch order details from Razorpay')
  }
}