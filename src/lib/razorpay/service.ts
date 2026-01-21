// lib/razorpay/service.ts
import { supabaseAdmin } from '@/lib/supabase/server'
import { razorpay, verifyPaymentSignature } from './client'
import { getCompletePackPrice, getCustomPrice } from './config'
import { PRICING } from '@/data/chapters'
import { logger } from '@/lib/logger'
import { nanoid } from 'nanoid'
import { CreateOrderParams, VerifyPaymentParams } from './payment.types'

export class PaymentService {
  static async createOrder(params: CreateOrderParams) {
    const { userId, email, purchaseType, tier, customChapters } = params

    try {
      logger.info({ userId, purchaseType, customChapters }, 'createOrder called with params')

      // Get user data
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('tier, owned_chapters')
        .eq('id', userId)
        .single()

      if (userError) {
        logger.error({ error: userError, userId }, 'Failed to fetch user')
        throw new Error(`Failed to fetch user: ${userError.message}`)
      }

      if (!user) {
        logger.error({ userId }, 'User not found')
        throw new Error('User not found')
      }

      const currentTier = user.tier || 'free'
      const ownedChapters = user.owned_chapters || []

      logger.info({ currentTier, ownedChaptersCount: ownedChapters.length }, 'User data fetched')

      let amount: number
      let purchaseData: any

      // COMPLETE PACK PURCHASE
      if (purchaseType === 'complete' && tier === 'complete') {
        if (currentTier === 'complete') {
          logger.warn({ userId }, 'User already owns complete pack')
          throw new Error('You already own the complete pack')
        }

        amount = getCompletePackPrice()
        purchaseData = { tier: 'complete' }

        logger.info({ userId, purchaseType: 'complete', amount }, 'Creating complete pack order')
      }
      // CUSTOM CHAPTER PURCHASE
      else if (purchaseType === 'custom' && customChapters && customChapters.length > 0) {
        logger.info({ 
          requestedChapters: customChapters.length,
          ownedChapters: ownedChapters.length 
        }, 'Processing custom chapter purchase')

        // Filter out already owned chapters and invalid chapters
        const newChapters = customChapters.filter(id => 
          !ownedChapters.includes(id) && 
          id > PRICING.FREE_CHAPTERS && 
          id <= 386
        )
        
        logger.info({ 
          requestedCount: customChapters.length,
          newChaptersCount: newChapters.length,
          alreadyOwnedCount: customChapters.length - newChapters.length
        }, 'Filtered chapters')

        if (newChapters.length === 0) {
          logger.warn({ userId, customChapters }, 'All selected chapters already owned')
          throw new Error('You already own all selected chapters')
        }

        if (newChapters.length < PRICING.CUSTOM_SELECTION.minChapters) {
          logger.warn({ 
            userId, 
            newChaptersCount: newChapters.length,
            minRequired: PRICING.CUSTOM_SELECTION.minChapters 
          }, 'Not enough new chapters')
          throw new Error(`Minimum ${PRICING.CUSTOM_SELECTION.minChapters} new chapters required. You selected ${newChapters.length} new chapters.`)
        }

        amount = getCustomPrice(newChapters.length)
        purchaseData = {
          chapters: newChapters,
          chapterCount: newChapters.length,
          pricePerChapter: PRICING.CUSTOM_SELECTION.pricePerChapter
        }

        logger.info({ 
          userId, 
          purchaseType: 'custom', 
          chapterCount: newChapters.length, 
          amount,
          amountInRupees: amount / 100
        }, 'Creating custom chapter order')
      }
      else {
        logger.error({ purchaseType, tier, customChapters }, 'Invalid purchase request')
        throw new Error('Invalid purchase request')
      }

      logger.info({ amount, amountInRupees: amount / 100 }, 'Creating Razorpay order')

      // Create Razorpay order
      let order
      try {
        order = await razorpay.orders.create({
          amount,
          currency: 'INR',
          receipt: `rcpt_${nanoid(10)}`,
          notes: {
            userId,
            purchaseType,
            email,
          },
        })
        logger.info({ orderId: order.id, amount: order.amount }, 'Razorpay order created successfully')
      } catch (razorpayError: any) {
        logger.error({ 
          error: {
            message: razorpayError.message,
            statusCode: razorpayError.statusCode,
            error: razorpayError.error,
            description: razorpayError.description
          }
        }, 'Razorpay order creation failed')
        throw new Error(`Failed to create Razorpay order: ${razorpayError.message || 'Unknown error'}`)
      }

      // Store in database
      const purchaseRecord = {
        user_id: userId,
        purchase_type: purchaseType,
        purchase_data: purchaseData,
        amount: amount / 100, // Store in rupees
        currency: 'INR',
        razorpay_order_id: order.id,
        status: 'pending' as const,
        payment_email: email,
      }

      logger.info({ purchaseRecord }, 'Inserting purchase record')

      const { data: purchase, error } = await supabaseAdmin
        .from('purchases')
        .insert(purchaseRecord)
        .select()
        .single()

      if (error) {
        logger.error({ 
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          },
          orderId: order.id 
        }, 'Failed to store purchase in database')
        throw new Error(`Failed to create purchase record: ${error.message}`)
      }

      logger.info({ purchaseId: purchase.id, orderId: order.id }, 'Purchase record created successfully')

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        purchaseId: purchase.id,
      }
    } catch (error: any) {
      logger.error({ 
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          ...error
        },
        params 
      }, 'Failed to create order - Full error details')
      throw error
    }
  }

  static async verifyPayment(params: VerifyPaymentParams, userId: string) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params

      logger.info({ 
        orderId: razorpay_order_id, 
        paymentId: razorpay_payment_id,
        userId 
      }, 'Starting payment verification')

      // Verify signature
      const isValid = verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      )

      if (!isValid) {
        logger.warn({ orderId: razorpay_order_id }, 'Invalid payment signature')
        throw new Error('Invalid payment signature')
      }

      logger.info({ orderId: razorpay_order_id }, 'Payment signature verified')

      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpay_payment_id)

      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        logger.warn({ 
          paymentId: razorpay_payment_id, 
          status: payment.status 
        }, 'Payment not successful')
        throw new Error(`Payment not successful. Status: ${payment.status}`)
      }

      logger.info({ 
        paymentId: razorpay_payment_id, 
        status: payment.status,
        method: payment.method 
      }, 'Payment status verified')

      // Get purchase record
      const { data: purchase, error: fetchError } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', userId)
        .single()

      if (fetchError || !purchase) {
        logger.error({ error: fetchError, orderId: razorpay_order_id }, 'Purchase not found')
        throw new Error('Purchase record not found')
      }

      // Check if already processed
      if (purchase.status === 'completed') {
        logger.info({ purchaseId: purchase.id }, 'Purchase already completed')
        return purchase
      }

      // Update purchase status
      const { error: updateError } = await supabaseAdmin
        .from('purchases')
        .update({
          razorpay_payment_id,
          razorpay_signature,
          status: 'completed',
          payment_method: payment.method,
          verified_at: new Date().toISOString(),
        })
        .eq('id', purchase.id)

      if (updateError) {
        logger.error({ error: updateError, purchaseId: purchase.id }, 'Failed to update purchase')
        throw new Error('Failed to update purchase')
      }

      logger.info({ purchaseId: purchase.id }, 'Purchase updated to completed')

      // Update user access based on purchase type
      if (purchase.purchase_type === 'complete') {
        // Grant complete tier
        const { error: tierError } = await supabaseAdmin
          .from('users')
          .update({ tier: 'complete' })
          .eq('id', userId)

        if (tierError) {
          logger.error({ error: tierError, userId }, 'Failed to upgrade user tier')
          throw new Error('Failed to upgrade account')
        }

        logger.info({ userId }, '✅ User upgraded to complete tier')
      } 
      else if (purchase.purchase_type === 'custom') {
        // Add individual chapters to owned_chapters
        const chapters = purchase.purchase_data.chapters

        if (!chapters || !Array.isArray(chapters)) {
          logger.error({ purchaseData: purchase.purchase_data }, 'Invalid chapter data')
          throw new Error('Invalid chapter data')
        }

        // Try RPC function first
        const { error: rpcError } = await supabaseAdmin.rpc('add_owned_chapters', {
          p_user_id: userId,
          p_chapters: chapters
        })

        if (rpcError) {
          logger.warn({ error: rpcError }, 'RPC failed, using fallback method')
          
          // Fallback: manual update
          const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('owned_chapters')
            .eq('id', userId)
            .single()

          const currentOwned = currentUser?.owned_chapters || []
          const newOwned = Array.from(new Set([...currentOwned, ...chapters]))
            .sort((a, b) => a - b)

          const { error: updateUserError } = await supabaseAdmin
            .from('users')
            .update({ owned_chapters: newOwned })
            .eq('id', userId)

          if (updateUserError) {
            logger.error({ error: updateUserError, userId }, 'Failed to update owned chapters')
            throw new Error('Failed to unlock chapters')
          }

          logger.info({ userId, addedChapters: chapters.length }, '✅ Custom chapters added (fallback)')
        } else {
          logger.info({ userId, addedChapters: chapters.length }, '✅ Custom chapters added (RPC)')
        }
      }

      // Fetch updated purchase
      const { data: completedPurchase } = await supabaseAdmin
        .from('purchases')
        .select('*')
        .eq('id', purchase.id)
        .single()

      logger.info({ 
        orderId: razorpay_order_id, 
        paymentId: razorpay_payment_id, 
        userId,
        purchaseType: purchase.purchase_type 
      }, '✅ Payment verified and access granted successfully')

      return completedPurchase || purchase

    } catch (error: any) {
      logger.error({ 
        error: {
          message: error.message,
          stack: error.stack,
          ...error
        },
        params, 
        userId 
      }, '❌ Payment verification failed')
      
      // Mark as failed
      try {
        const { error: markFailedError } = await supabaseAdmin
          .from('purchases')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', params.razorpay_order_id)
          .eq('user_id', userId)

        if (markFailedError) {
          logger.error({ error: markFailedError }, 'Failed to mark purchase as failed')
        }
      } catch (err: any) {
        logger.error({ error: err }, 'Exception while marking purchase as failed')
      }

      throw error
    }
  }
}