// lib/paypal/service.ts

import { supabaseAdmin } from '@/lib/supabase/server'
import { 
  createPayPalOrder, 
  capturePayPalOrder, 
  getPayPalOrder,
  PayPalCaptureResult,
} from './client'
import { 
  paypalConfig, 
  getCompletePackPriceInternational, 
  getCustomPriceInternational,
  isSupportedCurrency,
  SupportedCurrency,
} from './config'
import { logger } from '@/lib/logger'
import { nanoid } from 'nanoid'
import type { Json, PurchaseType } from '@/lib/supabase/database.types'

// ======================
// Types
// ======================

export interface CreatePayPalOrderParams {
  userId: string
  email: string
  purchaseType: PurchaseType
  tier?: 'complete'
  customChapters?: number[]
  currency?: string
}

export interface PayPalPurchaseData {
  chapters?: number[]
  chapterCount?: number
  tier?: 'complete'
  expectedAmount: number
  currency: string
  pricePerChapter?: number
}

export interface PayPalOrderResult {
  orderId: string
  purchaseId: string
  amount: number
  currency: string
  approvalUrl?: string
}

// ======================
// Service Class
// ======================

export class PayPalService {
  /**
   * Create a new PayPal order
   */
  static async createOrder(params: CreatePayPalOrderParams): Promise<PayPalOrderResult> {
    const { userId, email, purchaseType, tier, customChapters, currency: requestedCurrency } = params
    const startTime = Date.now()

    try {
      logger.info({ userId, purchaseType, requestedCurrency }, 'Creating PayPal order')

      // Determine currency (default to USD)
      const currency: SupportedCurrency = requestedCurrency && isSupportedCurrency(requestedCurrency)
        ? requestedCurrency
        : 'USD'

      // Fetch user to check existing purchases
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
      let description: string
      let purchaseData: PayPalPurchaseData

      // COMPLETE PACK PURCHASE
      if (purchaseType === 'complete' && tier === 'complete') {
        if (currentTier === 'complete') {
          throw new Error('You already own the complete pack')
        }

        amount = getCompletePackPriceInternational(currency)
        description = 'The Crown I Will Take - Complete Story Pack (All Chapters)'
        purchaseData = {
          tier: 'complete',
          expectedAmount: amount,
          currency,
        }
      }
      // CUSTOM CHAPTER PURCHASE
      else if (purchaseType === 'custom' && customChapters && customChapters.length > 0) {
        // Filter out already owned chapters
        const newChapters = customChapters.filter(id => !ownedChapters.includes(id))

        if (newChapters.length === 0) {
          throw new Error('You already own all selected chapters')
        }

        if (newChapters.length < paypalConfig.limits.minCustomChapters) {
          throw new Error(
            `Minimum ${paypalConfig.limits.minCustomChapters} new chapters required. ` +
            `You selected ${newChapters.length} new chapters.`
          )
        }

        amount = getCustomPriceInternational(newChapters.length, currency)
        description = `The Crown I Will Take - ${newChapters.length} Chapters`
        purchaseData = {
          chapters: newChapters,
          chapterCount: newChapters.length,
          expectedAmount: amount,
          currency,
          pricePerChapter: paypalConfig.pricing.customPerChapter,
        }
      }
      else {
        throw new Error('Invalid purchase request')
      }

      // Create purchase record first
      const purchaseId = nanoid(16)
      
      const { error: insertError } = await supabaseAdmin
        .from('purchases')
        .insert({
          id: purchaseId,
          user_id: userId,
          purchase_type: purchaseType,
          purchase_data: purchaseData as unknown as Json,
          amount: Math.round(amount * 100), // Store in cents
          currency,
          status: 'pending',
          payment_email: email,
          payment_provider: 'paypal',
        })

      if (insertError) {
        logger.error({ error: insertError }, 'Failed to create purchase record')
        throw new Error('Failed to initialize purchase')
      }

      // Create PayPal order
      const order = await createPayPalOrder({
        amount,
        currency,
        description,
        customId: purchaseId,
      })

      // Update purchase with PayPal order ID
      await supabaseAdmin
        .from('purchases')
        .update({ paypal_order_id: order.id })
        .eq('id', purchaseId)

      // Get approval URL
      const approvalUrl = order.links?.find(link => link.rel === 'approve')?.href

      logger.info({
        orderId: order.id,
        purchaseId,
        amount,
        currency,
        duration: Date.now() - startTime,
      }, 'PayPal order created successfully')

      return {
        orderId: order.id,
        purchaseId,
        amount,
        currency,
        approvalUrl,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ 
        error: errorMessage, 
        params, 
        duration: Date.now() - startTime 
      }, 'PayPal order creation failed')
      throw error
    }
  }

  /**
   * Capture PayPal payment after user approval
   */
  static async capturePayment(orderId: string, userId: string) {
    const startTime = Date.now()

    try {
      logger.info({ orderId, userId }, 'Capturing PayPal payment')

      // Get purchase record
      const { data: purchase, error: fetchError } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('paypal_order_id', orderId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !purchase) {
        logger.error({ error: fetchError, orderId, userId }, 'Purchase record not found')
        throw new Error('Purchase record not found')
      }

      // Check if already completed (idempotency)
      if (purchase.status === 'completed') {
        logger.info({ purchaseId: purchase.id }, 'Purchase already completed')
        return { 
          success: true, 
          alreadyCompleted: true, 
          purchase,
          message: 'Purchase was already completed',
        }
      }

      // Verify order status with PayPal first
      const orderDetails = await getPayPalOrder(orderId)
      
      let captureResult: PayPalCaptureResult | null = null

      if (orderDetails.status === 'COMPLETED') {
        // Already captured
        logger.info({ orderId }, 'PayPal order already captured')
      } else if (orderDetails.status === 'APPROVED') {
        // Capture the payment
        captureResult = await capturePayPalOrder(orderId)
        
        if (captureResult.status !== 'COMPLETED') {
          logger.error({ 
            orderId, 
            status: captureResult.status 
          }, 'PayPal capture not completed')
          throw new Error(`Payment capture failed: ${captureResult.status}`)
        }

        // Verify amount
        const capturedAmount = parseFloat(
          captureResult.purchase_units[0].payments.captures[0].amount.value
        )
        const expectedAmount = purchase.amount / 100 // Convert from cents
        
        if (Math.abs(capturedAmount - expectedAmount) > 0.01) {
          logger.error({
            expected: expectedAmount,
            captured: capturedAmount,
            orderId,
          }, 'CRITICAL: PayPal payment amount mismatch!')
          
          await supabaseAdmin
            .from('purchases')
            .update({
              status: 'failed',
            })
            .eq('id', purchase.id)

          throw new Error('Payment amount verification failed')
        }
      } else if (orderDetails.status === 'CREATED' || orderDetails.status === 'PAYER_ACTION_REQUIRED') {
        throw new Error('Payment not yet approved by user')
      } else {
        throw new Error(`Invalid order status: ${orderDetails.status}`)
      }

      // Get capture ID
      const captureId = captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id
      const payerEmail = captureResult?.payer?.email_address

      // Update purchase status
      const { error: updateError } = await supabaseAdmin
        .from('purchases')
        .update({
          status: 'completed',
          paypal_capture_id: captureId,
          payment_email: payerEmail || purchase.payment_email,
          verified_at: new Date().toISOString(),
        })
        .eq('id', purchase.id)
        .eq('status', 'pending') // Optimistic lock

      if (updateError) {
        logger.error({ error: updateError }, 'Failed to update purchase status')
      }

      // Grant access
      await this.grantUserAccess(userId, purchase)

      logger.info({
        orderId,
        purchaseId: purchase.id,
        userId,
        captureId,
        duration: Date.now() - startTime,
      }, 'PayPal payment captured and access granted')

      return { 
        success: true,
        alreadyCompleted: false,
        purchase: { ...purchase, status: 'completed' },
        message: 'Payment successful! Your content has been unlocked.',
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ 
        error: errorMessage, 
        orderId, 
        userId, 
        duration: Date.now() - startTime 
      }, 'PayPal capture failed')
      
      // Mark as failed (only if still pending)
      await supabaseAdmin
        .from('purchases')
        .update({
          status: 'failed',
        })
        .eq('paypal_order_id', orderId)
        .eq('status', 'pending')

      throw error
    }
  }

  /**
   * Grant user access based on purchase type
   */
  private static async grantUserAccess(userId: string, purchase: { 
    purchase_type: PurchaseType
    purchase_data: Json | null
  }) {
    const purchaseData = purchase.purchase_data as PayPalPurchaseData | null

    if (purchase.purchase_type === 'complete') {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ 
          tier: 'complete',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        logger.error({ error, userId }, 'Failed to upgrade user tier via PayPal')
        throw new Error('Failed to upgrade account. Please contact support.')
      }

      logger.info({ userId }, 'User upgraded to complete tier via PayPal')
    }
    else if (purchase.purchase_type === 'custom' && purchaseData?.chapters) {
      const chapters = purchaseData.chapters

      // Try RPC first for atomic update
      const { error: rpcError } = await supabaseAdmin.rpc('add_owned_chapters', {
        p_user_id: userId,
        p_chapters: chapters,
      })

      if (rpcError) {
        logger.warn({ error: rpcError }, 'RPC failed, using fallback method')
        
        // Fallback: manual update
        const { data: currentUser } = await supabaseAdmin
          .from('users')
          .select('owned_chapters')
          .eq('id', userId)
          .single()

        const currentOwned: number[] = currentUser?.owned_chapters || []
        const newOwned = [...new Set([...currentOwned, ...chapters])].sort((a, b) => a - b)

        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            owned_chapters: newOwned,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateError) {
          logger.error({ error: updateError }, 'Failed to add chapters')
          throw new Error('Failed to unlock chapters. Please contact support.')
        }
      }

      logger.info({ userId, chapterCount: chapters.length }, 'Chapters added via PayPal')
    }
  }

  /**
   * Get purchase status
   */
  static async getPurchaseStatus(orderId: string, userId: string) {
    const { data: purchase, error } = await supabaseAdmin
      .from('purchases')
      .select('id, status, purchase_type, amount, currency, created_at')
      .eq('paypal_order_id', orderId)
      .eq('user_id', userId)
      .single()

    if (error || !purchase) {
      return null
    }

    return purchase
  }
}