// lib/razorpay/service.ts

import { supabaseAdmin } from '@/lib/supabase/server'
import { razorpay, verifyPaymentSignature, fetchPaymentDetails } from './client'
import { 
  getCompletePackPrice, 
  getCustomPrice, 
  validateChapterIds, 
  razorpayConfig,
  getPaymentCurrency,
  isInternationalCurrency,
  type PaymentCurrency,
} from './config'
import { PRICING } from '@/data/chapters'
import { logger } from '@/lib/logger'
import { nanoid } from 'nanoid'
import { 
  CreateOrderParams, 
  VerifyPaymentParams, 
  PurchaseRecord,
  PurchaseData,
  CustomPurchaseData,
  CompletePurchaseData,
  PurchaseType,
  isCustomPurchaseData,
} from './payment.types'
import type { Json } from '@/lib/supabase/database.types'

// Idempotency key cache (use Redis in production)
const recentOrderKeys = new Map<string, { orderId: string; expiresAt: number }>()
const IDEMPOTENCY_TTL = 5 * 60 * 1000 // 5 minutes

function cleanupIdempotencyCache() {
  const now = Date.now()
  for (const [key, value] of recentOrderKeys) {
    if (now > value.expiresAt) {
      recentOrderKeys.delete(key)
    }
  }
}

// Run cleanup periodically
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupIdempotencyCache, 60 * 1000)
}

// Helper to safely parse Json to PurchaseData
function parsePurchaseData(data: Json): PurchaseData | null {
  if (data === null || data === undefined) {
    return null
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return null
  }

  const obj = data as Record<string, Json | undefined>

  // Check for CustomPurchaseData
  if (
    'chapters' in obj &&
    Array.isArray(obj.chapters) &&
    'chapterCount' in obj &&
    typeof obj.chapterCount === 'number'
  ) {
    return {
      chapters: obj.chapters as number[],
      chapterCount: obj.chapterCount,
      pricePerChapter: typeof obj.pricePerChapter === 'number' ? obj.pricePerChapter : 0,
      expectedAmount: typeof obj.expectedAmount === 'number' ? obj.expectedAmount : 0,
      currency: (obj.currency as PaymentCurrency) || 'INR',
      originalAmountINR: typeof obj.originalAmountINR === 'number' ? obj.originalAmountINR : 0,
    } satisfies CustomPurchaseData
  }

  // Check for CompletePurchaseData
  if ('tier' in obj && obj.tier === 'complete') {
    return {
      tier: 'complete',
      expectedAmount: typeof obj.expectedAmount === 'number' ? obj.expectedAmount : 0,
      currency: (obj.currency as PaymentCurrency) || 'INR',
      originalAmountINR: typeof obj.originalAmountINR === 'number' ? obj.originalAmountINR : 0,
    } satisfies CompletePurchaseData
  }

  return null
}

// Helper to validate and convert purchase_type string to PurchaseType
function toPurchaseType(value: string): PurchaseType {
  if (value === 'complete' || value === 'custom') {
    return value
  }
  return 'custom'
}

// Helper to convert DB record to PurchaseRecord with validation
function toPurchaseRecord(dbRecord: {
  id: string
  user_id: string
  purchase_type: string
  purchase_data: Json
  amount: number
  currency: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  status: string
  created_at: string
  updated_at: string
  [key: string]: unknown
}): PurchaseRecord | null {
  if (!dbRecord.razorpay_order_id) {
    return null
  }

  const validStatuses = ['pending', 'completed', 'failed', 'refunded'] as const
  const status = validStatuses.includes(dbRecord.status as typeof validStatuses[number])
    ? (dbRecord.status as typeof validStatuses[number])
    : 'pending'

  return {
    id: dbRecord.id,
    user_id: dbRecord.user_id,
    purchase_type: toPurchaseType(dbRecord.purchase_type),
    purchase_data: dbRecord.purchase_data,
    amount: dbRecord.amount,
    currency: dbRecord.currency,
    razorpay_order_id: dbRecord.razorpay_order_id,
    razorpay_payment_id: dbRecord.razorpay_payment_id,
    status,
    payment_method: dbRecord.payment_method as string | null,
    payment_email: dbRecord.payment_email as string | null,
    verified_at: dbRecord.verified_at as string | null,
    verified_via: dbRecord.verified_via as string | null,
    failure_reason: dbRecord.failure_reason as string | null,
    refund_id: dbRecord.refund_id as string | null,
    refund_amount: dbRecord.refund_amount as number | null,
    refunded_at: dbRecord.refunded_at as string | null,
    user_country: dbRecord.user_country as string | null,
    is_international: dbRecord.is_international as boolean | undefined,
    created_at: dbRecord.created_at,
    updated_at: dbRecord.updated_at,
  }
}

export class PaymentService {
  /**
   * Create a new payment order with international support
   */
  static async createOrder(params: CreateOrderParams, idempotencyKey?: string) {
    const { 
      userId, 
      email, 
      purchaseType, 
      tier, 
      customChapters,
      isInternational = false,
      userCountry,
    } = params
    
    const startTime = Date.now()

    try {
      // Determine currency based on user location
      const currency = getPaymentCurrency(isInternational, params.currency)
      const isPayPalOrder = isInternationalCurrency(currency)
      
      logger.info({ 
        userId, 
        purchaseType, 
        currency, 
        isInternational,
        isPayPalOrder,
        idempotencyKey,
      }, 'Creating order')

      // Check idempotency
      if (idempotencyKey) {
        const cached = recentOrderKeys.get(idempotencyKey)
        if (cached && Date.now() < cached.expiresAt) {
          logger.info({ idempotencyKey, orderId: cached.orderId }, 'Returning cached order')

          const { data: existingPurchase } = await supabaseAdmin
            .from('purchases')
            .select('*')
            .eq('razorpay_order_id', cached.orderId)
            .single()

          if (existingPurchase && existingPurchase.status === 'pending') {
            return {
              orderId: cached.orderId,
              amount: existingPurchase.amount * 100,
              currency: existingPurchase.currency as PaymentCurrency,
              purchaseId: existingPurchase.id,
              cached: true,
              isInternational,
              paypalOnly: isPayPalOrder,
            }
          }
        }
      }

      // Check for existing pending orders
      const existingOrderCheck = await this.checkExistingPendingOrder(
        userId, 
        purchaseType, 
        customChapters,
        currency
      )
      if (existingOrderCheck) {
        logger.info({ existingOrder: existingOrderCheck.orderId }, 'Found existing pending order')
        return { ...existingOrderCheck, isInternational, paypalOnly: isPayPalOrder }
      }

      // Fetch user
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('tier, owned_chapters')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        logger.error({ error: userError, userId }, 'User not found')
        throw new Error('User not found')
      }

      const currentTier = user.tier || 'free'
      const ownedChapters: number[] = user.owned_chapters || []

      let amount: number
      let originalAmountINR: number
      let purchaseData: PurchaseData

      // COMPLETE PACK PURCHASE
      if (purchaseType === 'complete' && tier === 'complete') {
        if (currentTier === 'complete') {
          throw new Error('You already own the complete pack')
        }

        originalAmountINR = getCompletePackPrice('INR')
        amount = getCompletePackPrice(currency)
        
        purchaseData = {
          tier: 'complete',
          expectedAmount: amount,
          currency,
          originalAmountINR,
        }
      }
      // CUSTOM CHAPTER PURCHASE
      else if (purchaseType === 'custom' && customChapters && customChapters.length > 0) {
        const { valid: validChapters, invalid: invalidChapters } = validateChapterIds(customChapters)

        if (invalidChapters.length > 0) {
          logger.warn({ invalidChapters }, 'Invalid chapter IDs provided')
        }

        const newChapters = validChapters.filter(id => !ownedChapters.includes(id))

        if (newChapters.length === 0) {
          throw new Error('You already own all selected chapters')
        }

        if (newChapters.length < razorpayConfig.limits.minCustomChapters) {
          throw new Error(
            `Minimum ${razorpayConfig.limits.minCustomChapters} new chapters required. ` +
            `You selected ${newChapters.length} new chapters.`
          )
        }

        originalAmountINR = getCustomPrice(newChapters.length, 'INR')
        amount = getCustomPrice(newChapters.length, currency)
        
        purchaseData = {
          chapters: newChapters,
          chapterCount: newChapters.length,
          pricePerChapter: PRICING.CUSTOM_SELECTION.pricePerChapter,
          expectedAmount: amount,
          currency,
          originalAmountINR,
        }
      }
      else {
        throw new Error('Invalid purchase request')
      }

      // Create Razorpay order with correct currency
      const order = await this.createRazorpayOrderWithRetry({
        amount,
        currency,
        userId,
        purchaseType,
        email,
        isInternational,
      })

      // Store in database (amount in display units, not smallest unit)
      const { data: purchase, error: insertError } = await supabaseAdmin
        .from('purchases')
        .insert({
          user_id: userId,
          purchase_type: purchaseType,
          purchase_data: purchaseData as unknown as Json,
          amount: amount / 100, // Store in display units
          currency,
          razorpay_order_id: order.id,
          status: 'pending',
          payment_email: email,
          user_country: userCountry,
          is_international: isInternational,
        })
        .select()
        .single()

      if (insertError) {
        logger.error({ error: insertError, orderId: order.id }, 'Failed to store purchase')
      }

      // Cache idempotency key
      if (idempotencyKey) {
        recentOrderKeys.set(idempotencyKey, {
          orderId: order.id,
          expiresAt: Date.now() + IDEMPOTENCY_TTL,
        })
      }

      logger.info({
        orderId: order.id,
        purchaseId: purchase?.id,
        amount,
        currency,
        isPayPalOrder,
        duration: Date.now() - startTime,
      }, 'Order created successfully')

      return {
        orderId: order.id,
        amount: order.amount as number,
        currency: order.currency as PaymentCurrency,
        purchaseId: purchase?.id,
        isInternational,
        paypalOnly: isPayPalOrder,
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      
      logger.error({
        error: { message: errorMessage, stack: errorStack },
        params,
        duration: Date.now() - startTime,
      }, 'Order creation failed')
      throw error
    }
  }

  /**
   * Check for existing pending orders (updated for multi-currency)
   */
  private static async checkExistingPendingOrder(
    userId: string,
    purchaseType: PurchaseType,
    customChapters?: number[],
    currency?: PaymentCurrency
  ) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    let query = supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('purchase_type', purchaseType)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    // If currency specified, match it
    if (currency) {
      query = query.eq('currency', currency)
    }

    const { data: pendingOrders } = await query

    if (pendingOrders && pendingOrders.length > 0) {
      const pending = pendingOrders[0]

      // For custom purchases, check if chapters match
      if (purchaseType === 'custom' && customChapters) {
        const pendingData = parsePurchaseData(pending.purchase_data)
        if (pendingData && isCustomPurchaseData(pendingData)) {
          const pendingSet = new Set(pendingData.chapters)
          const requestedSet = new Set(customChapters)

          if (
            pendingSet.size === requestedSet.size &&
            [...pendingSet].every(ch => requestedSet.has(ch))
          ) {
            return {
              orderId: pending.razorpay_order_id,
              amount: pending.amount * 100,
              currency: pending.currency as PaymentCurrency,
              purchaseId: pending.id,
              cached: true,
            }
          }
        }
      } else if (purchaseType === 'complete' && pending.razorpay_order_id) {
        return {
          orderId: pending.razorpay_order_id,
          amount: pending.amount * 100,
          currency: pending.currency as PaymentCurrency,
          purchaseId: pending.id,
          cached: true,
        }
      }
    }

    return null
  }

  /**
   * Create Razorpay order with retry logic (updated for multi-currency)
   */
  private static async createRazorpayOrderWithRetry(params: {
    amount: number
    currency: PaymentCurrency
    userId: string
    purchaseType: string
    email: string
    isInternational: boolean
  }, retries = 3): Promise<{ id: string; amount: number; currency: string }> {
    const { amount, currency, userId, purchaseType, email, isInternational } = params

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const order = await razorpay.orders.create({
          amount,
          currency,
          receipt: `rcpt_${nanoid(10)}`,
          notes: {
            userId,
            purchaseType,
            email,
            isInternational: isInternational ? 'true' : 'false',
          },
        })

        return order as { id: string; amount: number; currency: string }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.warn({ attempt, error: errorMessage, currency }, 'Razorpay order creation attempt failed')

        if (attempt === retries) {
          throw new Error(`Failed to create payment order after ${retries} attempts`)
        }

        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
      }
    }

    throw new Error('Failed to create payment order')
  }

  /**
   * Verify payment (updated for multi-currency)
   */
  static async verifyPayment(params: VerifyPaymentParams, userId: string): Promise<PurchaseRecord> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params
    const startTime = Date.now()

    try {
      logger.info({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, userId }, 'Verifying payment')

      // Step 1: Verify signature (timing-safe)
      if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        throw new Error('Invalid payment signature')
      }

      // Step 2: Fetch payment from Razorpay and verify status
      const payment = await fetchPaymentDetails(razorpay_payment_id)

      if (!['captured', 'authorized'].includes(payment.status as string)) {
        throw new Error(`Payment not successful. Status: ${payment.status}`)
      }

      // Step 3: Get purchase record
      const { data: dbPurchase, error: fetchError } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', userId)
        .single()

      if (fetchError || !dbPurchase) {
        logger.error({ error: fetchError, orderId: razorpay_order_id, userId }, 'Purchase not found')
        throw new Error('Purchase record not found')
      }

      const purchase = toPurchaseRecord(dbPurchase)
      if (!purchase) {
        throw new Error('Invalid purchase record')
      }

      // Step 4: Check if already processed (idempotency)
      if (purchase.status === 'completed') {
        logger.info({ purchaseId: purchase.id }, 'Purchase already completed')
        return purchase
      }

      // Step 5: Verify payment currency and amount
      const purchaseData = parsePurchaseData(purchase.purchase_data)
      const expectedAmount = purchaseData && 'expectedAmount' in purchaseData 
        ? purchaseData.expectedAmount 
        : purchase.amount * 100
      const actualAmount = payment.amount as number
      const paymentCurrency = payment.currency as string

      // Verify currency matches
      if (paymentCurrency.toUpperCase() !== purchase.currency.toUpperCase()) {
        logger.error({
          expectedCurrency: purchase.currency,
          actualCurrency: paymentCurrency,
          orderId: razorpay_order_id,
        }, 'CRITICAL: Payment currency mismatch!')
        throw new Error('Payment currency verification failed')
      }

      // Allow small variance for international payments (0.5% tolerance)
      const tolerance = isInternationalCurrency(purchase.currency) ? 0.005 : 0
      const minExpected = Math.floor(expectedAmount * (1 - tolerance))
      const maxExpected = Math.ceil(expectedAmount * (1 + tolerance))

      if (actualAmount < minExpected || actualAmount > maxExpected) {
        logger.error({
          expectedAmount,
          actualAmount,
          tolerance,
          orderId: razorpay_order_id,
        }, 'CRITICAL: Payment amount mismatch!')

        await supabaseAdmin
          .from('purchases')
          .update({
            status: 'failed',
            failure_reason: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
          })
          .eq('id', purchase.id)

        throw new Error('Payment amount verification failed')
      }

      // Step 6: Update purchase status
      const paymentMethod = payment.method as string
      const isPayPal = paymentMethod === 'paypal' || isInternationalCurrency(purchase.currency)

      const { error: updateError } = await supabaseAdmin
        .from('purchases')
        .update({
          razorpay_payment_id,
          razorpay_signature,
          status: 'completed',
          payment_method: isPayPal ? 'paypal' : paymentMethod,
          verified_at: new Date().toISOString(),
          verified_via: 'api',
        })
        .eq('id', purchase.id)
        .eq('status', 'pending')

      if (updateError) {
        throw new Error('Failed to update purchase status')
      }

      // Step 7: Grant access
      await this.grantUserAccess(userId, purchase)

      logger.info({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        userId,
        purchaseType: purchase.purchase_type,
        currency: purchase.currency,
        paymentMethod: isPayPal ? 'paypal' : paymentMethod,
        duration: Date.now() - startTime,
      }, 'Payment verified and access granted')

      // Return updated purchase
      const { data: completedPurchase } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('id', purchase.id)
        .single()

      if (completedPurchase) {
        const result = toPurchaseRecord(completedPurchase)
        if (result) return result
      }

      return { ...purchase, status: 'completed' }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined

      logger.error({
        error: { message: errorMessage, stack: errorStack },
        params,
        userId,
        duration: Date.now() - startTime,
      }, 'Payment verification failed')

      try {
        await supabaseAdmin
          .from('purchases')
          .update({
            status: 'failed',
            failure_reason: errorMessage,
          })
          .eq('razorpay_order_id', razorpay_order_id)
          .eq('user_id', userId)
          .eq('status', 'pending')
      } catch (markError) {
        logger.error({ error: markError }, 'Failed to mark purchase as failed')
      }

      throw error
    }
  }

  /**
   * Grant user access based on purchase type
   */
  private static async grantUserAccess(userId: string, purchase: PurchaseRecord) {
    const purchaseData = parsePurchaseData(purchase.purchase_data)

    if (purchase.purchase_type === 'complete') {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ tier: 'complete' })
        .eq('id', userId)

      if (error) {
        logger.error({ error, userId }, 'Failed to upgrade user tier')
        throw new Error('Failed to upgrade account. Please contact support.')
      }

      logger.info({ userId }, 'User upgraded to complete tier')
    }
    else if (purchase.purchase_type === 'custom' && purchaseData && isCustomPurchaseData(purchaseData)) {
      const chapters = purchaseData.chapters

      // Use RPC for atomic array update
      const { error: rpcError } = await supabaseAdmin.rpc('add_owned_chapters', {
        p_user_id: userId,
        p_chapters: chapters,
      })

      if (rpcError) {
        logger.warn({ error: rpcError }, 'RPC failed, using fallback')

        // Fallback with optimistic locking pattern
        let retries = 3
        while (retries > 0) {
          const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('owned_chapters, updated_at')
            .eq('id', userId)
            .single()

          if (!currentUser) {
            throw new Error('User not found during chapter update')
          }

          const currentOwned: number[] = currentUser.owned_chapters || []
          const newOwned = [...new Set([...currentOwned, ...chapters])].sort((a, b) => a - b)

          const { error: updateError, count } = await supabaseAdmin
            .from('users')
            .update({
              owned_chapters: newOwned,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .eq('updated_at', currentUser.updated_at)

          if (!updateError && count && count > 0) {
            logger.info({ userId, addedChapters: chapters.length }, 'Chapters added (fallback)')
            return
          }

          retries--
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        throw new Error('Failed to update chapters after retries')
      }

      logger.info({ userId, addedChapters: chapters.length }, 'Chapters added (RPC)')
    }
  }

  /**
   * Handle webhook events from Razorpay
   */
  static async handleWebhookEvent(event: { event: string; payload: Record<string, { entity: Record<string, unknown> }> }) {
    const eventType = event.event

    logger.info({ eventType }, 'Processing webhook event')

    switch (eventType) {
      case 'payment.captured':
        await this.handlePaymentCaptured(event.payload.payment.entity)
        break

      case 'payment.failed':
        await this.handlePaymentFailed(event.payload.payment.entity)
        break

      case 'order.paid':
        await this.handleOrderPaid(event.payload.order.entity)
        break

      case 'refund.created':
        await this.handleRefundCreated(event.payload.refund.entity)
        break

      default:
        logger.info({ eventType }, 'Unhandled webhook event type')
    }
  }

  private static async handlePaymentCaptured(payment: Record<string, unknown>) {
    const orderId = payment.order_id as string
    const paymentId = payment.id as string
    const method = payment.method as string

    const { data: dbPurchase } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .single()

    if (!dbPurchase) {
      logger.warn({ orderId }, 'Purchase not found for captured payment')
      return
    }

    const purchase = toPurchaseRecord(dbPurchase)
    if (!purchase) {
      logger.warn({ orderId }, 'Invalid purchase record for captured payment')
      return
    }

    if (purchase.status === 'completed') {
      logger.info({ orderId }, 'Purchase already completed via webhook')
      return
    }

    const isPayPal = method === 'paypal' || isInternationalCurrency(purchase.currency)

    const { error } = await supabaseAdmin
      .from('purchases')
      .update({
        razorpay_payment_id: paymentId,
        status: 'completed',
        payment_method: isPayPal ? 'paypal' : method,
        verified_at: new Date().toISOString(),
        verified_via: 'webhook',
      })
      .eq('id', purchase.id)
      .eq('status', 'pending')

    if (!error) {
      await this.grantUserAccess(purchase.user_id, purchase)
      logger.info({ orderId, purchaseId: purchase.id }, 'Purchase completed via webhook')
    }
  }

  private static async handlePaymentFailed(payment: Record<string, unknown>) {
    const orderId = payment.order_id as string
    const errorDescription = payment.error_description as string | undefined
    const errorReason = payment.error_reason as string | undefined

    await supabaseAdmin
      .from('purchases')
      .update({
        status: 'failed',
        failure_reason: errorDescription || errorReason || 'Payment failed',
      })
      .eq('razorpay_order_id', orderId)
      .eq('status', 'pending')

    logger.info({ orderId, reason: errorReason }, 'Payment marked as failed via webhook')
  }

  private static async handleOrderPaid(order: Record<string, unknown>) {
    logger.info({ orderId: order.id }, 'Order paid event received')
  }

  private static async handleRefundCreated(refund: Record<string, unknown>) {
    const paymentId = refund.payment_id as string
    const refundId = refund.id as string
    const amount = refund.amount as number

    const { error } = await supabaseAdmin
      .from('purchases')
      .update({
        status: 'refunded',
        refund_id: refundId,
        refund_amount: amount / 100,
        refunded_at: new Date().toISOString(),
      })
      .eq('razorpay_payment_id', paymentId)

    if (!error) {
      logger.info({ paymentId, refundId }, 'Refund recorded')
    }
  }
}