// lib/paypal/client.ts

import { paypalConfig } from './config'
import { logger } from '@/lib/logger'

// ======================
// Token Management
// ======================

interface PayPalAccessToken {
  access_token: string
  token_type: string
  expires_in: number
  expires_at: number
}

let cachedToken: PayPalAccessToken | null = null

/**
 * Get PayPal access token with caching
 */
export async function getPayPalAccessToken(): Promise<string> {
  // Check if cached token is still valid (with 5 minute buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at - 300000) {
    return cachedToken.access_token
  }

  const { clientId, clientSecret, baseUrl } = paypalConfig

  if (!clientId || !clientSecret) {
    logger.error('PayPal credentials not configured')
    throw new Error('PayPal credentials not configured')
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, 'PayPal auth failed')
      throw new Error(`PayPal authentication failed: ${response.status}`)
    }

    const data = await response.json()

    cachedToken = {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
    }

    logger.info({ mode: paypalConfig.mode }, 'PayPal access token obtained')
    return cachedToken.access_token
    
  } catch (error) {
    logger.error({ error }, 'PayPal authentication error')
    throw error
  }
}

/**
 * Make authenticated PayPal API request
 */
export async function paypalRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH'
    body?: Record<string, unknown>
    idempotencyKey?: string
  } = {}
): Promise<T> {
  const { method = 'GET', body, idempotencyKey } = options
  const accessToken = await getPayPalAccessToken()

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  if (idempotencyKey) {
    headers['PayPal-Request-Id'] = idempotencyKey
  }

  const url = `${paypalConfig.baseUrl}${endpoint}`
  
  logger.debug({ method, endpoint }, 'PayPal API request')

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const responseText = await response.text()
  let responseData: Record<string, unknown> = {}
  
  try {
    responseData = JSON.parse(responseText)
  } catch {
    logger.error({ responseText }, 'Failed to parse PayPal response')
  }

  if (!response.ok) {
    logger.error({ 
      status: response.status, 
      endpoint, 
      error: responseData,
      responseText,
    }, 'PayPal API error')
    
    const errorMessage = (responseData.details as Array<{ description?: string }>)?.[0]?.description 
      || (responseData as { message?: string }).message 
      || `PayPal API error: ${response.status}`
    throw new Error(errorMessage)
  }

  return responseData as T
}

// ======================
// Types
// ======================

export interface PayPalOrderRequest {
  amount: number
  currency: string
  description: string
  customId: string
}

export interface PayPalOrder {
  id: string
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED'
  links: Array<{ 
    rel: string
    href: string
    method: string 
  }>
  purchase_units?: Array<{
    reference_id: string
    amount: { currency_code: string; value: string }
    custom_id?: string
  }>
}

export interface PayPalCaptureResult {
  id: string
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED' | 'FAILED'
  purchase_units: Array<{
    reference_id: string
    payments: {
      captures: Array<{
        id: string
        status: string
        amount: { currency_code: string; value: string }
        final_capture: boolean
        create_time: string
      }>
    }
  }>
  payer: {
    email_address: string
    payer_id: string
    name?: { given_name: string; surname: string }
    address?: { country_code: string }
  }
}

// ======================
// API Functions
// ======================

/**
 * Create PayPal order - SIMPLIFIED FOR DIGITAL GOODS
 */
export async function createPayPalOrder(options: PayPalOrderRequest): Promise<PayPalOrder> {
  const { amount, currency, description, customId } = options

  logger.debug({ amount, currency, customId }, 'Creating PayPal order')

  // Use the simpler application_context format for digital goods
  // This is more reliable and doesn't require shipping
  return paypalRequest<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    idempotencyKey: customId,
    body: {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: 'default',
        description: description.substring(0, 127), // PayPal limit
        custom_id: customId,
        soft_descriptor: 'TCIWT',
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      }],
      // Simple application_context - works better for digital goods
      application_context: {
        brand_name: 'The Crown I Will Take',
        locale: 'en-US',
        landing_page: 'LOGIN', // or 'BILLING' or 'NO_PREFERENCE'
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING', // KEY: No shipping for digital goods!
      },
    },
  })
}

/**
 * Capture PayPal order (after user approves)
 */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
  logger.debug({ orderId }, 'Capturing PayPal order')
  
  return paypalRequest<PayPalCaptureResult>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
  })
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}`)
}

/**
 * Verify PayPal webhook signature
 */
export async function verifyPayPalWebhook(
  webhookId: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  try {
    const result = await paypalRequest<{ verification_status: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        },
      }
    )
    return result.verification_status === 'SUCCESS'
  } catch (error) {
    logger.error({ error }, 'PayPal webhook verification failed')
    return false
  }
}